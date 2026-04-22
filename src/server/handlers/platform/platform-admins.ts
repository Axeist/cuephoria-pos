/**
 * /api/platform/platform-admins
 *
 * GET   — list platform admins.
 * POST  — create a new platform admin.
 * PATCH — mutate platform admin state (activate/deactivate, reset password).
 */

import { j } from "../../adminApiUtils";
import { hashPassword } from "../../passwordUtils";
import { requirePlatformSession } from "../../platformApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MutationBody =
  | { action?: "set-active"; adminId?: string; isActive?: boolean }
  | { action?: "reset-password"; adminId?: string; newPassword?: string };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "GET") return listAdmins(req);
  if (req.method === "POST") return createAdmin(req);
  if (req.method === "PATCH") return mutateAdmin(req);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function listAdmins(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-admins-list");
    const { data, error } = await supabase
      .from("platform_admins")
      .select("id, email, display_name, is_active, created_at, last_login_at")
      .order("created_at", { ascending: false });
    if (error) return j({ ok: false, error: error.message }, 500);
    return j({ ok: true, admins: data ?? [] }, 200);
  } catch (err: unknown) {
    return errorResponse(err, "list");
  }
}

async function createAdmin(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const displayName = (body.displayName || "").trim() || null;

  if (!email.includes("@") || email.length > 320) {
    return j({ ok: false, error: "Valid email is required." }, 400);
  }
  if (password.length < 12) {
    return j({ ok: false, error: "Password must be at least 12 characters." }, 400);
  }
  if (displayName && displayName.length > 120) {
    return j({ ok: false, error: "Display name can be at most 120 characters." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-admins-create");

    const { data: existing, error: existingErr } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingErr) return j({ ok: false, error: existingErr.message }, 500);
    if (existing) return j({ ok: false, error: "A platform admin with this email already exists." }, 409);

    const passwordHash = await hashPassword(password);
    const { data: row, error: insErr } = await supabase
      .from("platform_admins")
      .insert({
        email,
        password_hash: passwordHash,
        display_name: displayName,
        is_active: true,
      })
      .select("id, email, display_name, is_active, created_at, last_login_at")
      .single();
    if (insErr) return j({ ok: false, error: insErr.message }, 500);

    await writeAudit(supabase, session, "platform_admin.created", row.id, {
      email: row.email,
      displayName: row.display_name,
      via: "platform_admins_api",
    });

    return j({ ok: true, admin: row }, 201);
  } catch (err: unknown) {
    return errorResponse(err, "create");
  }
}

async function mutateAdmin(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: MutationBody;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const action = body.action;
  if (!action) return j({ ok: false, error: "action is required." }, 400);

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-admins-mutate");

    if (action === "set-active") {
      const adminId = (body.adminId || "").trim();
      const isActive = body.isActive;
      if (!UUID_RE.test(adminId)) return j({ ok: false, error: "Invalid adminId." }, 400);
      if (typeof isActive !== "boolean") return j({ ok: false, error: "isActive must be boolean." }, 400);
      if (adminId === session.id && !isActive) {
        return j({ ok: false, error: "You cannot deactivate your own account." }, 409);
      }

      const { data: existing, error: existingErr } = await supabase
        .from("platform_admins")
        .select("id, email, is_active")
        .eq("id", adminId)
        .maybeSingle();
      if (existingErr) return j({ ok: false, error: existingErr.message }, 500);
      if (!existing) return j({ ok: false, error: "Platform admin not found." }, 404);

      if (!isActive && existing.is_active) {
        const { count: activeCount, error: countErr } = await supabase
          .from("platform_admins")
          .select("id", { head: true, count: "exact" })
          .eq("is_active", true);
        if (countErr) return j({ ok: false, error: countErr.message }, 500);
        if ((activeCount ?? 0) <= 1) {
          return j({ ok: false, error: "At least one active platform admin is required." }, 409);
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from("platform_admins")
        .update({ is_active: isActive })
        .eq("id", adminId)
        .select("id, email, display_name, is_active, created_at, last_login_at")
        .single();
      if (updateErr) return j({ ok: false, error: updateErr.message }, 500);

      await writeAudit(supabase, session, isActive ? "platform_admin.activated" : "platform_admin.deactivated", adminId, {
        email: updated.email,
      });
      return j({ ok: true, admin: updated }, 200);
    }

    if (action === "reset-password") {
      const adminId = (body.adminId || "").trim();
      const newPassword = body.newPassword || "";
      if (!UUID_RE.test(adminId)) return j({ ok: false, error: "Invalid adminId." }, 400);
      if (newPassword.length < 12) {
        return j({ ok: false, error: "Password must be at least 12 characters." }, 400);
      }

      const { data: existing, error: existingErr } = await supabase
        .from("platform_admins")
        .select("id, email")
        .eq("id", adminId)
        .maybeSingle();
      if (existingErr) return j({ ok: false, error: existingErr.message }, 500);
      if (!existing) return j({ ok: false, error: "Platform admin not found." }, 404);

      const passwordHash = await hashPassword(newPassword);
      const { error: updateErr } = await supabase
        .from("platform_admins")
        .update({ password_hash: passwordHash })
        .eq("id", adminId);
      if (updateErr) return j({ ok: false, error: updateErr.message }, 500);

      await writeAudit(supabase, session, "platform_admin.password_reset", adminId, {
        email: existing.email,
      });
      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: `Unsupported action "${action}".` }, 400);
  } catch (err: unknown) {
    return errorResponse(err, "mutate");
  }
}

async function writeAudit(
  supabase: ReturnType<typeof supabaseServiceClient>,
  session: { id: string; email: string },
  action: string,
  targetId: string,
  meta: Record<string, unknown>,
) {
  try {
    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      action,
      target_type: "platform_admin",
      target_id: targetId,
      meta,
    });
  } catch (err) {
    console.warn(`platform/platform-admins audit failed for ${action}:`, err);
  }
}

function errorResponse(err: unknown, scope: string): Response {
  console.error(`platform/platform-admins:${scope} error:`, err);
  if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
  return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
}
