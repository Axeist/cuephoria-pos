/**
 * POST /api/admin/verify-email — consume an email verification token.
 * Accepts the raw token in the JSON body so it can also be driven from a
 * dedicated /account/verify-email page.
 */

import { j } from "../../adminApiUtils";
import { consumeEmailToken } from "../../emailTokens";
import { supabaseServiceClient } from "../../supabaseServer";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return j({ ok: false, error: "Missing token." }, 400);

  const supabase = supabaseServiceClient("cuetronix-verify-email");
  const result = await consumeEmailToken(supabase, token, "verify_email");
  if (!result.ok || !result.adminUserId) {
    return j({ ok: false, error: result.error || "Verification failed." }, 400);
  }

  const { error } = await supabase
    .from("admin_users")
    .update({
      email: result.email,
      email_verified_at: new Date().toISOString(),
    })
    .eq("id", result.adminUserId);

  if (error) return j({ ok: false, error: error.message }, 500);

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: result.adminUserId,
    action: "admin_user.email_verified",
    meta: { email: result.email },
  });

  return j({ ok: true, email: result.email }, 200);
}
