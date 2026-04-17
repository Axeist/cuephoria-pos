export function j(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

// Edge-safe env getter (matches existing style in api/razorpay/*)
export function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess =
    typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  return fromDeno ?? fromProcess;
}

export function needEnv(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

const enc = new TextEncoder();

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

async function hmacVerifySha256(secret: string, data: string, sig: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return await crypto.subtle.verify("HMAC", key, sig.buffer as ArrayBuffer, enc.encode(data));
}

export type AdminSessionUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /**
   * password_version captured at login. Undefined on sessions issued before
   * Slice 5 — those are treated as legacy and skip the revocation check.
   */
  passwordVersion?: number;
};

type SessionPayload = {
  sub: string;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** password_version claim; optional for backward compatibility. */
  pv?: number;
  iat: number;
  exp: number;
};

export const ADMIN_SESSION_COOKIE = "cuephoria_admin_session";

export function getAdminSessionSecret(): string {
  // Server-only secret for signing cookies
  return needEnv("ADMIN_SESSION_SECRET");
}

export async function signAdminSession(user: AdminSessionUser, maxAgeSeconds: number) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    isSuperAdmin: !!user.isSuperAdmin,
    iat: now,
    exp: now + maxAgeSeconds,
    ...(typeof user.passwordVersion === "number" ? { pv: user.passwordVersion } : {}),
  };

  const headerB64 = base64UrlEncodeBytes(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncodeBytes(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await hmacSha256(getAdminSessionSecret(), signingInput);
  const sigB64 = base64UrlEncodeBytes(sig);
  return `${signingInput}.${sigB64}`;
}

export async function verifyAdminSession(token: string): Promise<AdminSessionUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const sig = base64UrlDecodeToBytes(sigB64);
    const ok = await hmacVerifySha256(getAdminSessionSecret(), signingInput, sig);
    if (!ok) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload?.sub || !payload?.username) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;

    return {
      id: payload.sub,
      username: payload.username,
      isAdmin: !!payload.isAdmin,
      isSuperAdmin: !!payload.isSuperAdmin,
      passwordVersion: typeof payload.pv === "number" ? payload.pv : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Returns `true` when the session's password_version claim has drifted from
 * the user's current password_version in the DB — i.e. the password has been
 * rotated since this cookie was issued, so every other session should die.
 *
 * Fail-open posture for resilience:
 *   - If the session carries no `pv` claim (legacy / pre-Slice-5), we return
 *     false — legacy cookies naturally expire within 8h and we don't want a
 *     rollout gap to lock everyone out.
 *   - If the DB query fails or the column is missing (migration not yet
 *     applied), we log and return false.
 *
 * The `supabase` arg is intentionally typed as `unknown` at the signature
 * boundary (and narrowed inside) so this helper stays decoupled from the
 * generated Supabase schema types. Every server caller can pass their own
 * typed `SupabaseClient` without fighting generics across module borders.
 */
export async function isSessionRevoked(
  session: AdminSessionUser,
  supabase: unknown,
): Promise<boolean> {
  if (typeof session.passwordVersion !== "number") return false;
  try {
    // Structural narrowing: we only need `.from().select().eq().maybeSingle()`.
    const client = supabase as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{
              data: { password_version?: number | null } | null;
              error: unknown;
            }>;
          };
        };
      };
    };

    const { data, error } = await client
      .from("admin_users")
      .select("password_version")
      .eq("id", session.id)
      .maybeSingle();
    if (error || !data) {
      // Fail open — never lock a live user out because of infra hiccups.
      return false;
    }
    const current = typeof data.password_version === "number" ? data.password_version : 1;
    return current !== session.passwordVersion;
  } catch {
    return false;
  }
}

export function cookieSerialize(
  name: string,
  value: string,
  opts: {
    maxAgeSeconds?: number;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
  } = {}
) {
  const parts: string[] = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  if (typeof opts.maxAgeSeconds === "number") parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  // Secure is important in production; safe to always set on https.
  if (opts.secure !== false) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

