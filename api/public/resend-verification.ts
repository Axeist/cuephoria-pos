/**
 * POST /api/public/resend-verification
 *
 * Public resend endpoint used by the signup confirmation screen.
 *
 * Security notes:
 * - Always returns a generic 200 response to avoid email enumeration.
 * - Best-effort in-memory rate limits by IP and email+IP tuple.
 * - Sends only when an unverified account exists for the submitted email.
 */

import { j } from "../../src/server/adminApiUtils";
import { appBaseUrl, sendEmail } from "../../src/server/email";
import { issueEmailToken } from "../../src/server/emailTokens";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";

export const config = { runtime: "edge" };

const VERIFY_TTL_MINUTES = 60 * 24;
const GENERIC_RESPONSE = {
  ok: true,
  message:
    "If an unverified account exists for this email, a verification link has been sent.",
};

const attempts = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isAllowed(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => t > now - windowMs);
  list.push(now);
  attempts.set(key, list);
  return list.length <= max;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    return j(GENERIC_RESPONSE, 200);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const ip = clientIp(req);
  if (!isAllowed(`resend:ip:${ip}`, 6, 10 * 60_000)) return j(GENERIC_RESPONSE, 200);
  if (email && !isAllowed(`resend:ip-email:${ip}:${email}`, 3, 10 * 60_000)) {
    return j(GENERIC_RESPONSE, 200);
  }
  if (!isValidEmail(email)) return j(GENERIC_RESPONSE, 200);

  try {
    const supabase = supabaseServiceClient("cuetronix-public-resend-verification");
    const { data: user, error } = await supabase
      .from("admin_users")
      .select("id, username, display_name, email, email_verified_at")
      .ilike("email", email)
      .maybeSingle();
    if (error) {
      console.warn("public/resend-verification lookup failed:", error.message);
      return j(GENERIC_RESPONSE, 200);
    }
    if (!user || user.email_verified_at || !user.email) return j(GENERIC_RESPONSE, 200);

    const token = await issueEmailToken({
      supabase,
      adminUserId: user.id,
      email: user.email,
      purpose: "verify_email",
      ttlMinutes: VERIFY_TTL_MINUTES,
      requestedIp: ip,
      requestedUa: req.headers.get("user-agent") || null,
    });

    const base = appBaseUrl();
    const verifyUrl = `${base}/account/verify-email?token=${encodeURIComponent(token.token)}`;
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("admin_user_id", user.id)
      .limit(1)
      .maybeSingle();

    await sendEmail({
      kind: "verify_email",
      to: user.email,
      vars: {
        appBaseUrl: base,
        displayName: user.display_name || user.username,
        verifyUrl,
        expiresInMinutes: VERIFY_TTL_MINUTES,
      },
      organizationId: membership?.organization_id || null,
      adminUserId: user.id,
      supabase,
    });
  } catch (err: unknown) {
    if (!(err instanceof SupabaseConfigError)) {
      console.warn("public/resend-verification failed:", (err as Error)?.message || String(err));
    }
  }

  return j(GENERIC_RESPONSE, 200);
}
