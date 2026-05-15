/**
 * POST /api/admin/verify-email — consume an email verification token.
 * Accepts the raw token in the JSON body so it can also be driven from a
 * dedicated /account/verify-email page.
 *
 * On success: marks the email verified, issues an admin session cookie (same
 * as login), and returns user summary so the client can continue to onboarding.
 */

import {
  ADMIN_SESSION_COOKIE,
  cookieSerialize,
  j,
  signAdminSession,
} from "../../adminApiUtils";
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

  const { data: sessionRow, error: sessionLookupErr } = await supabase
    .from("admin_users")
    .select("username, is_admin, is_super_admin, password_version, must_change_password")
    .eq("id", result.adminUserId)
    .maybeSingle();

  if (sessionLookupErr || !sessionRow) {
    return j({ ok: false, error: sessionLookupErr?.message || "Could not load account after verification." }, 500);
  }

  const maxAge = 8 * 60 * 60;
  const sessionToken = await signAdminSession(
    {
      id: result.adminUserId,
      username: sessionRow.username,
      isAdmin: !!sessionRow.is_admin,
      isSuperAdmin: !!sessionRow.is_super_admin,
      passwordVersion:
        typeof sessionRow.password_version === "number" ? sessionRow.password_version : 1,
    },
    maxAge,
  );

  const setCookie = cookieSerialize(ADMIN_SESSION_COOKIE, sessionToken, {
    maxAgeSeconds: maxAge,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: result.adminUserId,
    action: "admin_user.email_verified",
    meta: { email: result.email, sessionIssued: true },
  });

  return j(
    {
      ok: true,
      email: result.email,
      user: {
        id: result.adminUserId,
        username: sessionRow.username,
        isAdmin: !!sessionRow.is_admin,
        isSuperAdmin: !!sessionRow.is_super_admin,
        mustChangePassword: !!sessionRow.must_change_password,
      },
    },
    200,
    { "set-cookie": setCookie },
  );
}
