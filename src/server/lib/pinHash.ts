/** PBKDF2 PIN hashing for staff portal pins (Edge-compatible). */

const enc = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const DEFAULT_ITERATIONS = 100_000;

export async function hashPortalPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: DEFAULT_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `pbkdf2$${DEFAULT_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(new Uint8Array(bits))}`;
}

export async function verifyPortalPin(stored: string | null | undefined, entered: string): Promise<boolean> {
  const norm = String(entered ?? "").trim();
  if (!/^\d{4,8}$/.test(norm) || !stored) return false;

  if (!stored.startsWith("pbkdf2$")) {
    return stored.trim() === norm;
  }

  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1) return false;

  const salt = base64UrlDecode(parts[2]);
  const expected = base64UrlDecode(parts[3]);
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(norm), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function isHashedPortalPin(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith("pbkdf2$");
}
