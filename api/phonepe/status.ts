export const config = { runtime: 'edge' };

const AUTH_BASE = process.env.PHONEPE_AUTH_BASE!;
const PG_BASE   = process.env.PHONEPE_BASE_URL!;

const CLIENT_ID      = process.env.PHONEPE_CLIENT_ID!;
const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION!;
const CLIENT_SECRET  = process.env.PHONEPE_CLIENT_SECRET!;

function json(status: number, obj: any) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }
  if (req.method !== 'GET') return json(405, { ok: false, error: 'Method not allowed' });

  const url = new URL(req.url);
  const id = url.searchParams.get('merchantOrderId') || url.searchParams.get('merchantTransactionId');
  if (!id) return json(400, { ok: false, error: 'Missing merchantOrderId (or merchantTransactionId)' });

  try {
    // ---- OAuth (lowercase grant_type: client_credentials) ----
    const oauthBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      client_version: String(CLIENT_VERSION),
    });

    const authRes = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: oauthBody,
    });

    const authText = await authRes.text();
    if (!authRes.ok) return json(502, { ok: false, step: 'oauth', status: authRes.status, body: tryParse(authText) });

    const auth = tryParse(authText);
    const token = auth?.access_token || auth?.encrypted_access_token || auth?.token;
    const tokenType = auth?.token_type || 'O-Bearer';
    if (!token) return json(502, { ok: false, step: 'oauth', error: 'No access_token in response', raw: auth });

    // ---- Query order status ----
    const sRes = await fetch(`${PG_BASE}/checkout/v2/order/${encodeURIComponent(id)}/status`, {
      method: 'GET',
      headers: { authorization: `${tokenType} ${token}` },
    });

    const sText = await sRes.text();
    if (!sRes.ok) return json(502, { ok: false, step: 'status', http: sRes.status, body: tryParse(sText) });

    const payload = tryParse(sText);
    const state = payload?.state || payload?.data?.state; // COMPLETED / FAILED / PENDING
    return json(200, { ok: true, state, raw: payload });
  } catch (e: any) {
    return json(500, { ok: false, step: 'exception', error: String(e?.message || e) });
  }
}

function tryParse(x: string) { try { return JSON.parse(x); } catch { return x; } }
