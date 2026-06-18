import { j, getEnv, needEnv, parseCookies, cookieSerialize } from './adminApiUtils';
import type { CafeSessionUser, CafeUserRole } from '../types/cafe.types';

export { j, getEnv, needEnv, parseCookies, cookieSerialize };

export const CAFE_SESSION_COOKIE = 'cuephoria_cafe_session';

const enc = new TextEncoder();

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function hmacVerifySha256(secret: string, data: string, sig: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  return crypto.subtle.verify('HMAC', key, sig.buffer as ArrayBuffer, enc.encode(data));
}

function getCafeSessionSecret(): string {
  return getEnv('CAFE_SESSION_SECRET') || needEnv('ADMIN_SESSION_SECRET') + '_cafe';
}

interface CafeSessionPayload {
  type: 'cafe';
  sub: string;
  username: string;
  displayName: string;
  role: CafeUserRole;
  partnerId: string;
  locationId: string;
  iat: number;
  exp: number;
}

export async function signCafeSession(user: CafeSessionUser, maxAgeSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: CafeSessionPayload = {
    type: 'cafe',
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    partnerId: user.partnerId,
    locationId: user.locationId,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const headerB64 = base64UrlEncodeBytes(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncodeBytes(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await hmacSha256(getCafeSessionSecret(), signingInput);
  return `${signingInput}.${base64UrlEncodeBytes(sig)}`;
}

export async function verifyCafeSession(token: string): Promise<CafeSessionUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;
    const sig = base64UrlDecodeToBytes(sigB64);
    const ok = await hmacVerifySha256(getCafeSessionSecret(), signingInput, sig);
    if (!ok) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as CafeSessionPayload;

    if (payload.type !== 'cafe') return null;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.username) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;

    return {
      id: payload.sub,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role as CafeUserRole,
      partnerId: payload.partnerId,
      locationId: payload.locationId,
    };
  } catch {
    return null;
  }
}
