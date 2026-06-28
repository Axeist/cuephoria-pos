/**
 * Short-lived signed tickets for Android OAuth handoff (Custom Tab → WebView).
 * Reuses ADMIN_SESSION_SECRET; 60s validity.
 */

import { needEnv } from "./adminApiUtils";

export type MobileTicketKind = "error" | "login_success" | "oauth_totp" | "signup";

export interface MobileTicketPayload {
  kind: MobileTicketKind;
  iat: number;
  jti: string;
  /** JSON-encoded kind-specific payload */
  data: string;
}

export interface MobileTicketErrorData {
  code: string;
  email?: string;
}

export interface MobileTicketLoginData {
  sessionToken: string;
  csrfToken: string;
  maxAge: number;
  redirect: string;
}

export interface MobileTicketTotpData {
  totpToken: string;
}

export interface MobileTicketSignupData {
  signupTicket: string;
}

const TTL_SECONDS = 60;

function b64uEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uDecode(s: string): Uint8Array {
  const pad = "===".slice((s.length + 3) % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function timingEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signMobileTicket(
  kind: MobileTicketKind,
  data: unknown,
): Promise<string> {
  const jtiBytes = new Uint8Array(12);
  crypto.getRandomValues(jtiBytes);
  let jti = "";
  for (let i = 0; i < jtiBytes.length; i++) jti += jtiBytes[i].toString(16).padStart(2, "0");

  const payload: MobileTicketPayload = {
    kind,
    iat: Math.floor(Date.now() / 1000),
    jti,
    data: JSON.stringify(data),
  };

  const secret = needEnv("ADMIN_SESSION_SECRET");
  const body = b64uEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64uEncode(await hmac(secret, body));
  return `${body}.${sig}`;
}

export async function verifyMobileTicket(raw: string): Promise<MobileTicketPayload | null> {
  try {
    const secret = needEnv("ADMIN_SESSION_SECRET");
    const [body, sig] = raw.split(".");
    if (!body || !sig) return null;
    const expected = b64uEncode(await hmac(secret, body));
    const a = new TextEncoder().encode(sig);
    const b = new TextEncoder().encode(expected);
    if (!timingEqual(a, b)) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(body))) as MobileTicketPayload;
    if (typeof payload.iat !== "number" || typeof payload.jti !== "string") return null;
    if (Date.now() / 1000 - payload.iat > TTL_SECONDS) return null;
    if (!payload.kind || !payload.data) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseMobileTicketData<T>(payload: MobileTicketPayload): T | null {
  try {
    return JSON.parse(payload.data) as T;
  } catch {
    return null;
  }
}
