/**
 * GET /api/admin/email-health
 *
 * Lightweight runtime check for transactional email configuration.
 * Requires an authenticated admin session.
 */

import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";

export const config = { runtime: "edge" };

function mask(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const cookies = parseCookies(req.headers.get("cookie"));
  const session = await verifyAdminSession(cookies[ADMIN_SESSION_COOKIE] || "");
  if (!session) return j({ ok: false, error: "Unauthorized" }, 401);

  const resendApiKey = getEnv("RESEND_API_KEY");
  const resendFrom = getEnv("RESEND_FROM");
  const appBaseUrl = getEnv("APP_BASE_URL") || getEnv("VITE_APP_BASE_URL");

  return j(
    {
      ok: true,
      configured: !!(resendApiKey && resendFrom && appBaseUrl),
      resend: {
        apiKeyPresent: !!resendApiKey,
        apiKeyPreview: mask(resendApiKey),
        fromPresent: !!resendFrom,
        from: resendFrom || null,
        appBaseUrlPresent: !!appBaseUrl,
        appBaseUrl: appBaseUrl || null,
      },
    },
    200,
  );
}

