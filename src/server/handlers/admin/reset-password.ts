/**
 * POST /api/admin/reset-password — consume a password-reset token and set
 * a new password.
 *
 * Body: { token: string, newPassword: string }
 *
 * On success the user's password_version is bumped, which invalidates any
 * active session cookies (forcing a fresh login everywhere).
 */

import { j } from "../../adminApiUtils";
import { hashPassword } from "../../passwordUtils";
import { consumeEmailToken } from "../../emailTokens";
import { supabaseServiceClient } from "../../supabaseServer";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token) return j({ ok: false, error: "Missing token." }, 400);
  if (newPassword.length < 10) {
    return j({ ok: false, error: "Password must be at least 10 characters." }, 400);
  }
  if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return j(
      {
        ok: false,
        error: "Password must include uppercase, lowercase, and a digit.",
      },
      400,
    );
  }

  const supabase = supabaseServiceClient("cuetronix-reset-password");
  const result = await consumeEmailToken(supabase, token, "reset_password");
  if (!result.ok || !result.adminUserId) {
    return j({ ok: false, error: result.error || "Reset failed." }, 400);
  }

  const hash = await hashPassword(newPassword);

  // Bump password_version so any outstanding sessions are invalidated.
  const { data: userRow } = await supabase
    .from("admin_users")
    .select("password_version")
    .eq("id", result.adminUserId)
    .maybeSingle();
  const nextVersion = typeof userRow?.password_version === "number" ? userRow.password_version + 1 : 2;

  const { error } = await supabase
    .from("admin_users")
    .update({
      password_hash: hash,
      password: null,
      password_updated_at: new Date().toISOString(),
      must_change_password: false,
      password_version: nextVersion,
    })
    .eq("id", result.adminUserId);

  if (error) return j({ ok: false, error: error.message }, 500);

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: result.adminUserId,
    action: "admin_user.password_reset_completed",
    meta: { email: result.email },
  });

  return j({ ok: true }, 200);
}
