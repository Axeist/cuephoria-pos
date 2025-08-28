// api/phonepe/status.ts
export const config = { runtime: 'edge' };

const ENV = {
  ENV: (process.env.PHONEPE_ENV || 'SANDBOX').toUpperCase(),
  AUTH_BASE: process.env.PHONEPE_AUTH_BASE,
  PG_BASE: process.env.PHONEPE_PG_BASE,
  MID: process.env.PHONEPE_MERCHANT_ID,
  CID: process.env.PHONEPE_CLIENT_ID,
  CSEC: process.env.PHONEPE_CLIENT_SECRET,
  CV: process.env.PHONEPE_CLIENT_VERSION,
};

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.exp - 15_000 > now) return cachedToken.token;

  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', ENV.CID || '');
  form.set('client_secret', ENV.CSEC || '');
  form.set('client_version', ENV.CV || '1');

  const res = await fetch(`${ENV.AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) throw new Error(`oauth-failed [HTTP ${res.status}] ${text || 'no-body'}`);

  const token = json.access_token || json.encrypted_access_token || '';
  if (!token) throw new Error(`oauth-no-token ${text || 'no-body'}`);

  const exp = typeof json.expires_at === 'number'
    ? json.expires_at * 1000
    : now + 50 * 60 * 1000;

  cachedToken = { token, exp };
  return token;
}

function bad(status: number, obj: any) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return bad(405, { ok: false, error: 'Method not allowed' });

  const url = new URL(req.url);
  const merchantOrderId = url.searchParams.get('merchantOrderId') || url.searchParams.get('merchantTransactionId');
  if (!merchantOrderId) return bad(400, { ok: false, error: 'Missing merchantOrderId (or merchantTransactionId)' });

  try {
    const token = await getAccessToken();

    const res = await fetch(`${ENV.PG_BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`, {
      method: 'GET',
      headers: {
        'authorization': `O-Bearer ${token}`,
        'content-type': 'application/json',
      },
    });

    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      return bad(502, { ok: false, step: 'status', status: res.status, body: text || null });
    }

    // PhonePe recommends using the root-level "state"
    const state = (json.state || json.data?.state || 'PENDING') as 'COMPLETED' | 'FAILED' | 'PENDING' | string;

    return new Response(JSON.stringify({
      ok: true,
      state,
      raw: json
    }), { status: 200, headers: { 'content-type': 'application/json' } });

  } catch (e: any) {
    return bad(502, { ok: false, step: ('' + e?.message).startsWith('oauth') ? 'oauth' : 'exception', error: e?.message || e });
  }
}
