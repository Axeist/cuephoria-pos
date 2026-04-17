/**
 * POST /api/admin/forgot-password — issue a password-reset email.
 *
 * Anti-enumeration: always returns `{ ok: true }` regardless of whether the
 * email is on file. The actual email is only sent if the account exists
 * (and its email is verified).
 *
 * Body: { email: string }
 */

import { j } from "../../adminApiUtils";
import { appBaseUrl, sendEmail } from "../../email";
import { issueEmailToken } from "../../emailTokens";
import { supabaseServiceClient } from "../../supabaseServer";

export const config = { runtime: "edge" };

const RESET_TTL_MINUTES = 30;

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Still respond OK to avoid leaking which addresses exist.
    return j({ ok: true }, 200);
  }

  const supabase = supabaseServiceClient("cuetronix-forgot-password");

  const { data: user } = await supabase
    .from("admin_users")
    .select("id, username, email, email_verified_at, display_name")
    .ilike("email", email)
    .maybeSingle();

  if (!user || !user.email) {
    // Anti-enumeration: pretend success.
    return j({ ok: true }, 200);
  }

  // Refuse silently if the email isn't verified — we can't trust the address
  // yet. We still reply 200 so attackers don't learn anything.
  if (!user.email_verified_at) {
    return j({ ok: true, verified: false }, 200);
  }

  const token = await issueEmailToken({
    supabase,
    adminUserId: user.id,
    email: user.email,
    purpose: "reset_password",
    ttlMinutes: RESET_TTL_MINUTES,
    requestedIp: req.headers.get("x-forwarded-for") || null,
    requestedUa: req.headers.get("user-agent") || null,
  });

  const base = appBaseUrl();
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token.token)}`;

  await sendEmail({
    kind: "password_reset",
    to: user.email,
    vars: {
      appBaseUrl: base,
      displayName: (user.display_name as string | null) || user.username,
      resetUrl,
      expiresInMinutes: RESET_TTL_MINUTES,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    },
    adminUserId: user.id,
    supabase,
  });

  return j({ ok: true }, 200);
}
