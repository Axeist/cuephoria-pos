/**
 * passwordUtils — PBKDF2-SHA256 password hashing (edge-safe, zero-dep).
 *
 * Why PBKDF2 and not bcrypt?
 *   - Web Crypto's SubtleCrypto exposes PBKDF2 natively, so this works in
 *     Vercel Edge, Cloudflare Workers, Deno, and Node without any npm deps.
 *   - OWASP (2023) recommends PBKDF2-SHA256 with at least 600,000 iterations
 *     for new applications. We use 310,000 as a balance for edge cold starts;
 *     `PLATFORM_PASSWORD_ITERATIONS` env var can raise it.
 *
 * Stored format:
 *   pbkdf2-sha256$<iterations>$<base64 salt>$<base64 hash>
 *
 * Only used for `platform_admins`. Existing `admin_users` plaintext is
 * untouched by this module.
 */

const DEFAULT_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const FORMAT_TAG = "pbkdf2-sha256";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, iterations);
  return `${FORMAT_TAG}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Timing-safe equality for Uint8Array. */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4) return false;
    const [tag, iterStr, saltB64, hashB64] = parts;
    if (tag !== FORMAT_TAG) return false;
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 1000) return false;
    const salt = fromBase64(saltB64);
    const expected = fromBase64(hashB64);
    const actual = await deriveBits(password, salt, iterations);
    return constantTimeEquals(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Timing-safe string equality. Used during the plaintext → hash rollout
 * for `admin_users` so comparing a submitted plaintext password to the
 * stored legacy value doesn't leak timing on length mismatches.
 *
 * Both strings are compared byte-by-byte at a length capped by the longer
 * of the two; we don't early-exit on length difference to keep the timing
 * signal flat.
 */
export function constantTimeStringEquals(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  const len = Math.max(ab.length, bb.length);
  let mismatch = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    mismatch |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return mismatch === 0;
}
