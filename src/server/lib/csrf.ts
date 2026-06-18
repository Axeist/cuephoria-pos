/**
 * Admin CSRF — synchronizer token (HttpOnly cookie + X-CSRF-Token header).
 * Disabled when CSRF_DISABLED=1 (local dev only).
 */

import { cookieSerialize, getEnv, parseCookies } from "../adminApiUtils";

export const CSRF_COOKIE = "cuetronix_csrf";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_BYTES = 32;

function csrfDisabled(): boolean {
  const v = getEnv("CSRF_DISABLED");
  return v === "1" || v === "true";
}

function timingEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function generateCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

export function csrfCookieHeader(token: string, maxAgeSeconds = 8 * 60 * 60): string {
  return cookieSerialize(CSRF_COOKIE, token, {
    maxAgeSeconds,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });
}

export function clearCsrfCookieHeader(): string {
  return cookieSerialize(CSRF_COOKIE, "", {
    maxAgeSeconds: 0,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}

/** Safe methods and unauthenticated auth flows skip CSRF. */
export function adminCsrfExempt(req: Request, segment: string): boolean {
  if (csrfDisabled()) return true;
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const publicSegments = new Set([
    "login",
    "logout",
    "forgot-password",
    "reset-password",
    "send-verification",
    "verify-email",
  ]);
  return publicSegments.has(segment);
}

export function verifyAdminCsrf(req: Request, segment: string): { ok: true } | { ok: false; error: string } {
  if (adminCsrfExempt(req, segment)) return { ok: true };

  const cookies = parseCookies(req.headers.get("cookie"));
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.headers.get(CSRF_HEADER) ?? req.headers.get("X-CSRF-Token");

  if (!cookieToken || !headerToken) {
    return { ok: false, error: "Missing CSRF token. Refresh the page and try again." };
  }
  if (!timingEqual(cookieToken, headerToken)) {
    return { ok: false, error: "Invalid CSRF token." };
  }
  return { ok: true };
}
