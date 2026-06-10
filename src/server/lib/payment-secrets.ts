/**
 * Encrypt/decrypt payment gateway secrets at rest (AES-256-GCM via Web Crypto).
 * Works on Edge and Node 18+ runtimes.
 */

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  const fromDeno = (globalThis as { Deno?: { env?: { get?: (n: string) => string | undefined } } })
    .Deno?.env?.get?.(name);
  return fromDeno;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let cachedKey: CryptoKey | null = null;

export function isPaymentSecretsEncryptionConfigured(): boolean {
  const raw = getEnv("PAYMENT_SECRETS_ENCRYPTION_KEY");
  return !!raw && raw.trim().length >= 16;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = getEnv("PAYMENT_SECRETS_ENCRYPTION_KEY");
  if (!raw || raw.trim().length < 16) {
    throw new Error(
      "PAYMENT_SECRETS_ENCRYPTION_KEY is not configured. Contact support to enable payment credential storage.",
    );
  }
  const keyMaterial = new Uint8Array(base64ToBytes(raw.trim()));
  cachedKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

/** Returns base64(iv + ciphertext). */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToBase64(combined);
}

export async function decryptSecret(enc: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = base64ToBytes(enc);
  if (combined.length < 13) throw new Error("Invalid encrypted secret payload");
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
