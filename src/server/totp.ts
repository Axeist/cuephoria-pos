/**
 * RFC 6238 TOTP implementation using Web Crypto so it runs on the edge.
 *
 * Compatible with Google Authenticator / 1Password / Authy:
 *   - SHA-1 HMAC
 *   - 6-digit code
 *   - 30-second period
 *
 * We also emit the `otpauth://` provisioning URI for QR rendering.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.trim().toUpperCase().replace(/[^A-Z2-7]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 5) / 8));
  let bits = 0;
  let value = 0;
  let idx = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = ALPHABET.indexOf(clean[i]);
    if (c === -1) continue;
    value = (value << 5) | c;
    bits += 5;
    if (bits >= 8) {
      out[idx++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return out.slice(0, idx);
}

/** Generate a fresh base32 secret for a new enrolment (160 bits / 20 bytes). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Compute the TOTP token for a given time step (defaults to the current time). */
export async function generateTotpCode(
  secretBase32: string,
  opts: { timestampMs?: number; step?: number; digits?: number } = {},
): Promise<{ code: string; counter: number }> {
  const step = opts.step ?? 30;
  const digits = opts.digits ?? 6;
  const ts = opts.timestampMs ?? Date.now();
  const counter = Math.floor(ts / 1000 / step);

  const keyBytes = base32Decode(secretBase32);
  // Cast to BufferSource via .buffer slice to appease strict lib.dom typings
  // that differentiate ArrayBuffer vs SharedArrayBuffer on Uint8Array.
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);

  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBuf));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  const mod = 10 ** digits;
  const code = String(binary % mod).padStart(digits, "0");
  return { code, counter };
}

/**
 * Verify a TOTP token, allowing ±1 step of clock skew. Returns the matching
 * counter (so the caller can persist it and reject replay) or null.
 *
 * `lastCounter` — if provided, rejects any code whose counter is ≤ lastCounter
 * to prevent within-window replay.
 */
export async function verifyTotpCode(
  secretBase32: string,
  submitted: string,
  opts: { lastCounter?: number | null; timestampMs?: number; step?: number; digits?: number; window?: number } = {},
): Promise<number | null> {
  const window = opts.window ?? 1;
  const digits = opts.digits ?? 6;
  const clean = submitted.trim().replace(/\s+/g, "");
  if (!/^\d+$/.test(clean) || clean.length !== digits) return null;

  for (let delta = -window; delta <= window; delta++) {
    const ts = (opts.timestampMs ?? Date.now()) + delta * (opts.step ?? 30) * 1000;
    const { code, counter } = await generateTotpCode(secretBase32, { ...opts, timestampMs: ts });
    if (code === clean) {
      if (typeof opts.lastCounter === "number" && counter <= opts.lastCounter) {
        return null; // replay
      }
      return counter;
    }
  }
  return null;
}

/** Build the `otpauth://totp/...` URI consumed by authenticator apps' QR scanners. */
export function buildProvisioningUri(opts: {
  secret: string;
  label: string;
  issuer: string;
  digits?: number;
  period?: number;
}): string {
  const issuer = encodeURIComponent(opts.issuer);
  const label = encodeURIComponent(`${opts.issuer}:${opts.label}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: "SHA1",
    digits: String(opts.digits ?? 6),
    period: String(opts.period ?? 30),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Generate 10 single-use backup codes (10-char base32 blocks). */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(6);
    // 6 bytes → 10 base32 chars (with last char truncated). Enough entropy for backup use.
    codes.push(base32Encode(bytes).slice(0, 10));
  }
  return codes;
}
