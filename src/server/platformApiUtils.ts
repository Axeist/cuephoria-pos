/**
 * platformApiUtils — session + helper functions for the Cuetronix platform
 * admin console (`/platform/*`).
 *
 * Kept deliberately separate from `adminApiUtils.ts` so that:
 *   - Platform admin sessions never share cookies or secrets with tenant
 *     admin sessions. A compromised tenant cannot escalate to platform.
 *   - Cookie name and JWT signing secret are distinct env vars.
 *   - Rate-limit buckets are independent.
 *
 * Only platform-facing API endpoints should import from this file.
 */

import { getEnv, j, parseCookies, cookieSerialize, needEnv } from "./adminApiUtils";

export const PLATFORM_SESSION_COOKIE = "cuetronix_platform_session";

/** Max session age (7 days) — platform admins re-auth weekly. */
export const PLATFORM_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type PlatformAdminSession = {
  /** platform_admins.id */
  id: string;
  email: string;
  displayName: string | null;
  /** When the session was issued (seconds since epoch). */
  iat: number;
  /** When the session expires (seconds since epoch). */
  exp: number;
};

function getPlatformSessionSecret(): string {
  return needEnv("PLATFORM_SESSION_SECRET");
}

const enc = new TextEncoder();

function b64u(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(secret: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return b64u(new Uint8Array(sig));
}

async function hmacVerify(secret: string, input: string, sigB64u: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    b64uDecode(sigB64u).buffer as ArrayBuffer,
    enc.encode(input),
  );
}

/** Issue a signed session token for a platform admin. */
export async function signPlatformSession(
  admin: { id: string; email: string; displayName?: string | null },
  maxAgeSeconds: number = PLATFORM_SESSION_MAX_AGE,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: PlatformAdminSession = {
    id: admin.id,
    email: admin.email,
    displayName: admin.displayName ?? null,
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const header = { alg: "HS256", typ: "JWT", aud: "cuetronix-platform" };
  const headerB64 = b64u(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64u(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await hmacSign(getPlatformSessionSecret(), signingInput);
  return `${signingInput}.${sig}`;
}

export async function verifyPlatformSession(token: string): Promise<PlatformAdminSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const ok = await hmacVerify(getPlatformSessionSecret(), `${headerB64}.${payloadB64}`, sigB64);
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(payloadB64))) as PlatformAdminSession;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.id || !payload?.email) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Short-hand: pull the current platform admin session from cookies. */
export async function getPlatformSession(req: Request): Promise<PlatformAdminSession | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[PLATFORM_SESSION_COOKIE];
  if (!token) return null;
  return verifyPlatformSession(token);
}

/**
 * Helper for platform endpoints: verify session or bail with 401.
 *   const session = await requirePlatformSession(req); if (session instanceof Response) return session;
 */
export async function requirePlatformSession(req: Request): Promise<PlatformAdminSession | Response> {
  const session = await getPlatformSession(req);
  if (!session) return j({ ok: false, error: "Unauthorized" }, 401);
  return session;
}

export function platformCookieHeader(value: string, opts: { maxAgeSeconds?: number } = {}): string {
  return cookieSerialize(PLATFORM_SESSION_COOKIE, value, {
    maxAgeSeconds: opts.maxAgeSeconds ?? PLATFORM_SESSION_MAX_AGE,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
}

export function clearPlatformCookieHeader(): string {
  return cookieSerialize(PLATFORM_SESSION_COOKIE, "", {
    maxAgeSeconds: 0,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
}

/** Platform bootstrap token — distinct from the session secret. */
export function getBootstrapToken(): string | undefined {
  return getEnv("PLATFORM_ADMIN_BOOTSTRAP_TOKEN");
}

/**
 * Simple in-memory sliding-window rate limiter, per Edge invocation. This is
 * intentionally best-effort: cold starts wipe state, and multiple instances
 * don't share. It exists to slow brute-force attempts at the login endpoint
 * within a single warm instance. For stronger guarantees we'll add an
 * `auth_attempts` table in Slice 4.
 */
const rateMap = new Map<string, { hits: number[]; blockUntil: number }>();

export function rateLimit(
  key: string,
  opts: { windowMs: number; max: number; blockMs?: number } = { windowMs: 60_000, max: 5, blockMs: 5 * 60_000 },
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const state = rateMap.get(key) ?? { hits: [], blockUntil: 0 };
  if (state.blockUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((state.blockUntil - now) / 1000) };
  }
  state.hits = state.hits.filter((t) => t > now - opts.windowMs);
  state.hits.push(now);
  if (state.hits.length > opts.max) {
    state.blockUntil = now + (opts.blockMs ?? 5 * 60_000);
    rateMap.set(key, state);
    return { allowed: false, retryAfterSec: Math.ceil((state.blockUntil - now) / 1000) };
  }
  rateMap.set(key, state);
  return { allowed: true, retryAfterSec: 0 };
}

/** Canonical IP key, falling back to a synthetic label when unavailable. */
export function clientIpFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
