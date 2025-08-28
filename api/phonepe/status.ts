// /api/phonepe/status.ts
export const config = { runtime: 'edge' };

const AUTH_BASE = process.env.PHONEPE_AUTH_BASE!; // e.g. https://api.phonepe.com/apis/identity-manager
const PG_BASE   = process.env.PHONEPE_BASE_URL!;  // e.g. https://api.phonepe.com/apis/pg

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
  // CORS preflight
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

  if (req.method !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const { searchParams } = new URL(req.url);
  const merchantOrderId = searchParams.get('merchantOrderId');
  const merchantTransactionId = searchParams.get('merchantTransactionId');

  const id = merchantOrderId || merchantTransactionId;
  if (!id) {
    return json(400, {
      ok: false,
      error: 'Missing merchantOrderId (or merchantTransactionId)',
    });
  }

  try {
    // OAuth again (simple path; you can cache token)
    const authRes = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_version: String(CLIENT_VERSION),
      }),
    });

    const authText = await authRes.text();
    if (!authRes.ok) {
      return json(502, {
        ok: false,
        step: 'oauth',
        status: authRes.status,
        body: tryParse(authText),
      });
    }
    const auth = tryParse(authText);
    const accessToken =
      auth?.access_token || auth?.encrypted_access_token || auth?.token;
    const tokenType = auth?.token_type || 'O-Bearer';
    if (!accessToken) {
      return json(502, {
        ok: false,
        step: 'oauth',
        error: 'No access_token in response',
        raw: auth,
      });
    }

    // Order Status
    const statusRes = await fetch(`${PG_BASE}/checkout/v2/order/${encodeURIComponent(id)}/status`, {
      method: 'GET',
      headers: {
        authorization: `${tokenType} ${accessToken}`,
      },
    });

    const statusText = await statusRes.text();
    if (!statusRes.ok) {
      return json(502, {
        ok: false,
        step: 'status',
        http: statusRes.status,
        body: tryParse(statusText),
      });
    }

    const payload = tryParse(statusText);
    // PhonePe recommends using root-level "state" for status
    // COMPLETED / FAILED / PENDING
    const state = payload?.state || payload?.data?.state;

    return json(200, { ok: true, state, raw: payload });
  } catch (e: any) {
    return json(500, { ok: false, step: 'exception', error: String(e?.message || e) });
  }
}

function tryParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
