// /api/phonepe/status.ts
export const runtime = 'edge';

type Env = {
  PHONEPE_BASE_URL: string;          // https://api-preprod.phonepe.com/apis/pg-sandbox
  PHONEPE_AUTH_BASE_URL?: string;    // optional; defaults below
  PHONEPE_MERCHANT_ID: string;
  PHONEPE_CLIENT_ID: string;
  PHONEPE_CLIENT_VERSION: string;
  PHONEPE_CLIENT_SECRET: string;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

function need(name: keyof Env, v?: string) {
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort('timeout'), ms);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  try {
    // ---- ENV
    const env: Env = {
      PHONEPE_BASE_URL: need('PHONEPE_BASE_URL', process.env.PHONEPE_BASE_URL),
      PHONEPE_AUTH_BASE_URL:
        process.env.PHONEPE_AUTH_BASE_URL?.trim() ||
        'https://api-preprod.phonepe.com/apis/identity-manager',
      PHONEPE_MERCHANT_ID: need('PHONEPE_MERCHANT_ID', process.env.PHONEPE_MERCHANT_ID),
      PHONEPE_CLIENT_ID: need('PHONEPE_CLIENT_ID', process.env.PHONEPE_CLIENT_ID),
      PHONEPE_CLIENT_VERSION: need('PHONEPE_CLIENT_VERSION', process.env.PHONEPE_CLIENT_VERSION),
      PHONEPE_CLIENT_SECRET: need('PHONEPE_CLIENT_SECRET', process.env.PHONEPE_CLIENT_SECRET),
    };

    // ---- Query
    const u = new URL(req.url);
    const merchantOrderId = u.searchParams.get('merchantOrderId') || u.searchParams.get('merchantTransactionId');
    if (!merchantOrderId) return json(400, { ok: false, error: 'Missing merchantOrderId (or merchantTransactionId)' });

    // ---- OAuth again (simple; you can cache if you want)
    const authRes = await fetchWithTimeout(
      `${env.PHONEPE_AUTH_BASE_URL}/v1/oauth/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: env.PHONEPE_CLIENT_ID,
          client_version: env.PHONEPE_CLIENT_VERSION,
          client_secret: env.PHONEPE_CLIENT_SECRET,
        }),
      },
      15000
    );

    const authText = await authRes.text();
    if (!authRes.ok) {
      return json(502, { ok: false, step: 'oauth', status: authRes.status, body: safeJson(authText) });
    }
    const authJson = safeJson(authText);
    const accessToken = authJson?.access_token || authJson?.token || authJson?.encrypted_access_token;
    if (!accessToken) {
      return json(502, { ok: false, step: 'oauth-no-token', status: authRes.status, body: authJson });
    }

    // ---- Status API
    const statRes = await fetchWithTimeout(
      `${env.PHONEPE_BASE_URL}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
      {
        method: 'GET',
        headers: { 'Authorization': `O-Bearer ${accessToken}` },
      },
      15000
    );

    const statText = await statRes.text();
    const statJson = safeJson(statText);

    if (!statRes.ok) {
      return json(502, { ok: false, step: 'status', status: statRes.status, body: statJson });
    }

    // IMPORTANT: rely on root `state`
    // COMPLETED | FAILED | PENDING
    const state = statJson?.state || statJson?.data?.state || 'UNKNOWN';

    return json(200, {
      ok: true,
      step: 'status-ok',
      state,
      raw: statJson,
    });
  } catch (err: any) {
    const message = String(err?.message || err);
    const aborted = /abort|timeout/i.test(message);
    return json(502, { ok: false, step: aborted ? 'timeout' : 'exception', error: message });
  }
}

function safeJson(s: any) {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s;
  } catch {
    return { raw: s };
  }
}
