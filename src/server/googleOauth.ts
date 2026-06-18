/**
 * googleOauth.ts — shared helpers for the Google sign-in flow:
 *
 *   - signOauthState / verifyOauthState: compact signed JSON for the CSRF
 *     state param + cookie. Reuses ADMIN_SESSION_SECRET so we don't need
 *     another key.
 *   - exchangeCode: POSTs the auth code to Google and returns the token
 *     bundle (we only rely on id_token).
 *   - verifyIdToken: fetches Google's public keys and validates the JWT
 *     signature + claims. Returns the useful user fields.
 *
 * Everything runs on Edge (plain fetch + Web Crypto).
 */

import { getEnv, needEnv } from "./adminApiUtils";

// ─────────────────────────────────────────────────────────────────────────────
// State cookie + param
// ─────────────────────────────────────────────────────────────────────────────

export interface OauthStatePayload {
  nonce: string;
  intent: "login" | "signup";
  next: string;
  iat: number;
}

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

export async function signOauthState(p: OauthStatePayload): Promise<string> {
  const secret = needEnv("ADMIN_SESSION_SECRET");
  const body = b64uEncode(new TextEncoder().encode(JSON.stringify(p)));
  const sig = b64uEncode(await hmac(secret, body));
  return `${body}.${sig}`;
}

export async function verifyOauthState(raw: string): Promise<OauthStatePayload | null> {
  try {
    const secret = needEnv("ADMIN_SESSION_SECRET");
    const [body, sig] = raw.split(".");
    if (!body || !sig) return null;
    const expected = b64uEncode(await hmac(secret, body));
    // Constant-time compare.
    const a = new TextEncoder().encode(sig);
    const b = new TextEncoder().encode(expected);
    if (!timingEqual(a, b)) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(body))) as OauthStatePayload;
    // 10 minute validity window.
    if (typeof payload.iat !== "number") return null;
    if (Date.now() / 1000 - payload.iat > 10 * 60) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token exchange + ID token verification
// ─────────────────────────────────────────────────────────────────────────────

export interface ExchangeResult {
  id_token: string;
  access_token: string;
}

export async function exchangeCode(code: string): Promise<ExchangeResult> {
  const clientId = needEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = needEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const redirectUri = needEnv("GOOGLE_OAUTH_REDIRECT_URI");

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as ExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.id_token) {
    throw new Error(json.error_description || json.error || "Token exchange failed.");
  }
  return json;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
}

/**
 * Minimal id_token verifier. We use Google's JWKs endpoint. Edge-compat —
 * crypto.subtle only.
 */
export async function verifyIdToken(idToken: string): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token.");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(new TextDecoder().decode(b64uDecode(headerB64))) as {
    alg: string;
    kid: string;
  };
  const payload = JSON.parse(new TextDecoder().decode(b64uDecode(payloadB64))) as {
    iss: string;
    aud: string;
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    exp: number;
    iat: number;
  };

  // Validate iss + aud + exp before doing any crypto work.
  if (!["https://accounts.google.com", "accounts.google.com"].includes(payload.iss)) {
    throw new Error("Invalid issuer.");
  }
  const expectedAud = getEnv("GOOGLE_OAUTH_CLIENT_ID");
  if (!expectedAud || payload.aud !== expectedAud) {
    throw new Error("Invalid audience.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now - 60) throw new Error("id_token expired.");

  // Fetch Google's JWK set and pick the matching key.
  const jwks = (await (await fetch("https://www.googleapis.com/oauth2/v3/certs")).json()) as {
    keys: Array<{ kid: string; n: string; e: string; kty: string; alg: string; use: string }>;
  };
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Unknown signing key.");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = b64uDecode(sigB64);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    sig.buffer.slice(sig.byteOffset, sig.byteOffset + sig.byteLength) as ArrayBuffer,
    signingInput,
  );
  if (!ok) throw new Error("id_token signature invalid.");

  if (!payload.email) throw new Error("Google profile has no email.");
  const emailVerified = Boolean(payload.email_verified);
  if (!emailVerified && payload.email_verified !== undefined) {
    throw new Error("Google email is not verified — try a different account.");
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
    givenName: payload.given_name,
    familyName: payload.family_name,
    picture: payload.picture,
  };
}
