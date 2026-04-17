/**
 * TOTP enrolment + management for tenant admin_users.
 *
 * GET  /api/admin/totp               — returns { enabled, confirmed, hasBackupCodes, enrolledAt }
 * POST /api/admin/totp (start)       — begins enrolment: generates a fresh secret, stores
 *                                      it unconfirmed, and returns the secret + otpauth://
 *                                      URI so the client can render a QR.
 * POST /api/admin/totp (verify-enroll) — body: { code }. On success, confirms the secret,
 *                                        emits 10 single-use backup codes, returns them once.
 * POST /api/admin/totp (regenerate-backup) — creates a new set of backup codes,
 *                                            invalidating the old ones.
 * POST /api/admin/totp (disable)     — body: { code } — hard-disables TOTP for this user.
 *
 * All routes require an authenticated tenant admin session. The user can only
 * operate on THEIR OWN TOTP — there is no admin-impersonation path here (by
 * design; impersonation is a platform-admin concern).
 */

import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { hashPassword } from "../../src/server/passwordUtils";
import {
  generateTotpSecret,
  verifyTotpCode,
  buildProvisioningUri,
  generateBackupCodes,
} from "../../src/server/totp";

export const config = { runtime: "edge" };

const ISSUER = "Cuetronix";

async function readSession(req: Request) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) return null;
  return verifyAdminSession(token);
}

export default async function handler(req: Request) {
  const session = await readSession(req);
  if (!session) return j({ ok: false, error: "Not authenticated." }, 401);

  try {
    const supabase = supabaseServiceClient("cuetronix-admin-totp");

    if (req.method === "GET") return getStatus(supabase, session.id);
    if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

    const ct = req.headers.get("content-type")?.split(";")[0].trim();
    if (ct !== "application/json") return j({ ok: false, error: "Expected JSON body." }, 415);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return j({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const action = String(body.action ?? "").toLowerCase();
    switch (action) {
      case "start":
        return startEnrolment(supabase, session);
      case "verify-enroll":
        return verifyEnrolment(supabase, session.id, String(body.code ?? ""));
      case "regenerate-backup":
        return regenerateBackup(supabase, session.id, String(body.code ?? ""));
      case "disable":
        return disable(supabase, session.id, String(body.code ?? ""));
      default:
        return j({ ok: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 500);
    console.error("admin/totp failed", err);
    return j({ ok: false, error: err instanceof Error ? err.message : "Unexpected error." }, 500);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStatus(supabase: any, userId: string) {
  const { data: enrolment } = await supabase
    .from("admin_user_totp")
    .select("confirmed_at, created_at")
    .eq("admin_user_id", userId)
    .maybeSingle();

  const { count: backupCount } = await supabase
    .from("admin_user_totp_backup_codes")
    .select("id", { count: "exact", head: true })
    .eq("admin_user_id", userId)
    .is("consumed_at", null);

  return j(
    {
      ok: true,
      enabled: !!enrolment?.confirmed_at,
      pending: !!enrolment && !enrolment.confirmed_at,
      backupCodesRemaining: backupCount ?? 0,
      enrolledAt: enrolment?.confirmed_at ?? null,
    },
    200,
  );
}

async function startEnrolment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  session: { id: string; username: string },
) {
  const secret = generateTotpSecret();

  const { error: upErr } = await supabase.from("admin_user_totp").upsert(
    {
      admin_user_id: session.id,
      secret,
      confirmed_at: null,
      last_counter: null,
    },
    { onConflict: "admin_user_id" },
  );
  if (upErr) return j({ ok: false, error: upErr.message }, 500);

  const otpauth = buildProvisioningUri({
    secret,
    issuer: ISSUER,
    label: session.username,
  });

  return j(
    {
      ok: true,
      secret,
      otpauthUri: otpauth,
      issuer: ISSUER,
      label: session.username,
    },
    200,
  );
}

async function verifyEnrolment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  code: string,
) {
  const { data: row, error: rowErr } = await supabase
    .from("admin_user_totp")
    .select("id, secret, last_counter, confirmed_at")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (rowErr) return j({ ok: false, error: rowErr.message }, 500);
  if (!row) return j({ ok: false, error: "Start enrolment first." }, 400);

  const counter = await verifyTotpCode(row.secret, code, { lastCounter: row.last_counter });
  if (counter === null) {
    return j({ ok: false, error: "Code didn't match. Check the time on your device and try again." }, 400);
  }

  const confirmAt = row.confirmed_at ?? new Date().toISOString();
  const { error: updErr } = await supabase
    .from("admin_user_totp")
    .update({ confirmed_at: confirmAt, last_counter: counter, last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  if (updErr) return j({ ok: false, error: updErr.message }, 500);

  // On FIRST confirmation, issue backup codes. On re-verification, skip so we
  // don't accidentally invalidate existing codes the user already saved.
  let backupCodes: string[] | null = null;
  if (!row.confirmed_at) {
    backupCodes = await issueBackupCodes(supabase, userId);
  }

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: userId,
    actor_label: "self",
    action: "admin.totp.enabled",
    target_type: "admin_user",
    target_id: userId,
    meta: { first_time: !row.confirmed_at },
  });

  return j({ ok: true, enabled: true, backupCodes }, 200);
}

async function regenerateBackup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  code: string,
) {
  const { data: row } = await supabase
    .from("admin_user_totp")
    .select("secret, confirmed_at, last_counter")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (!row?.confirmed_at) return j({ ok: false, error: "TOTP is not enabled." }, 400);

  const counter = await verifyTotpCode(row.secret, code, { lastCounter: row.last_counter });
  if (counter === null) return j({ ok: false, error: "Invalid 2FA code." }, 400);

  await supabase
    .from("admin_user_totp")
    .update({ last_counter: counter, last_used_at: new Date().toISOString() })
    .eq("admin_user_id", userId);

  // Invalidate existing unused codes and issue a fresh set.
  await supabase
    .from("admin_user_totp_backup_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("admin_user_id", userId)
    .is("consumed_at", null);

  const backupCodes = await issueBackupCodes(supabase, userId);

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: userId,
    actor_label: "self",
    action: "admin.totp.backup_regenerated",
    target_type: "admin_user",
    target_id: userId,
    meta: { count: backupCodes.length },
  });

  return j({ ok: true, backupCodes }, 200);
}

async function disable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  code: string,
) {
  const { data: row } = await supabase
    .from("admin_user_totp")
    .select("secret, confirmed_at, last_counter")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (!row?.confirmed_at) return j({ ok: true, alreadyDisabled: true }, 200);

  const counter = await verifyTotpCode(row.secret, code, { lastCounter: row.last_counter });
  if (counter === null) return j({ ok: false, error: "Invalid 2FA code." }, 400);

  await supabase.from("admin_user_totp").delete().eq("admin_user_id", userId);
  await supabase.from("admin_user_totp_backup_codes").delete().eq("admin_user_id", userId);

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: userId,
    actor_label: "self",
    action: "admin.totp.disabled",
    target_type: "admin_user",
    target_id: userId,
    meta: {},
  });

  return j({ ok: true, disabled: true }, 200);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function issueBackupCodes(supabase: any, userId: string): Promise<string[]> {
  const codes = generateBackupCodes(10);
  const rows = await Promise.all(
    codes.map(async (c) => ({
      admin_user_id: userId,
      code_hash: await hashPassword(c),
    })),
  );
  const { error } = await supabase.from("admin_user_totp_backup_codes").insert(rows);
  if (error) throw error;
  return codes;
}
