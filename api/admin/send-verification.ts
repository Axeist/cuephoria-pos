/**
 * POST /api/admin/send-verification — email the signed-in user a verification
 * link. Idempotent: previous unconsumed tokens for the same user are
 * invalidated before the new one is minted.
 *
 * Body (optional):
 *   { email?: string }   // only honoured if the user has no email set yet
 */

import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";
import { appBaseUrl, sendEmail } from "../../src/server/email";
import { issueEmailToken } from "../../src/server/emailTokens";
import { supabaseServiceClient } from "../../src/server/supabaseServer";

export const config = { runtime: "edge" };

const VERIFY_TTL_MINUTES = 60 * 24; // 24 hours

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const cookies = parseCookies(req.headers.get("cookie"));
  const session = await verifyAdminSession(cookies[ADMIN_SESSION_COOKIE] || "");
  if (!session) return j({ ok: false, error: "Unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const bodyEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const supabase = supabaseServiceClient("cuetronix-send-verification");

  const { data: user, error } = await supabase
    .from("admin_users")
    .select("id, username, email, email_verified_at, display_name")
    .eq("id", session.id)
    .maybeSingle();
  if (error || !user) return j({ ok: false, error: error?.message || "User not found" }, 500);

  let targetEmail = (user.email as string | null) || "";

  // Allow setting the email if it's not already on file. Prevents hijack by
  // forcing the client to go through the verification link.
  if (!targetEmail && bodyEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bodyEmail)) {
      return j({ ok: false, error: "That doesn't look like a valid email." }, 400);
    }
    // Check no one else is using the email.
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .ilike("email", bodyEmail)
      .maybeSingle();
    if (existing && existing.id !== user.id) {
      return j(
        { ok: false, error: "That email is already in use by another account." },
        409,
      );
    }
    // Write email but keep verified_at null until the link is clicked.
    const { error: updErr } = await supabase
      .from("admin_users")
      .update({ email: bodyEmail })
      .eq("id", user.id);
    if (updErr) return j({ ok: false, error: updErr.message }, 500);
    targetEmail = bodyEmail;
  }

  if (!targetEmail) {
    return j({ ok: false, error: "No email on file. Provide one in the body." }, 400);
  }

  if (user.email_verified_at) {
    return j({ ok: true, alreadyVerified: true, email: targetEmail }, 200);
  }

  const token = await issueEmailToken({
    supabase,
    adminUserId: user.id,
    email: targetEmail,
    purpose: "verify_email",
    ttlMinutes: VERIFY_TTL_MINUTES,
    requestedIp: req.headers.get("x-forwarded-for") || null,
    requestedUa: req.headers.get("user-agent") || null,
  });

  const base = appBaseUrl();
  const verifyUrl = `${base}/account/verify-email?token=${encodeURIComponent(token.token)}`;

  const emailResult = await sendEmail({
    kind: "verify_email",
    to: targetEmail,
    vars: {
      appBaseUrl: base,
      displayName: (user.display_name as string | null) || user.username,
      verifyUrl,
      expiresInMinutes: VERIFY_TTL_MINUTES,
    },
    adminUserId: user.id,
    supabase,
  });

  if (!emailResult.ok && !emailResult.skipped) {
    return j({ ok: false, error: emailResult.error || "Could not send email." }, 502);
  }

  return j(
    {
      ok: true,
      email: targetEmail,
      emailSent: emailResult.ok,
      emailSkipped: !!emailResult.skipped,
    },
    200,
  );
}
