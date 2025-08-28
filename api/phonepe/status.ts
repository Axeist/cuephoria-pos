// /api/phonepe/status.ts
export const runtime = 'edge';

type Env = {
  PHONEPE_AUTH_BASE: string;
  PHONEPE_BASE_URL: string;
  PHONEPE_MERCHANT_ID: string;
  PHONEPE_CLIENT_ID: string;
  PHONEPE_CLIENT_VERSION: string;
  PHONEPE_CLIENT_SECRET: string;
};

const env = (name: keyof Env) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
};

// reuse same cache shape as pay.ts (Edge instance local)
const tokenCache: { accessToken?: string; expiresAt?: number } = {};

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt && tokenCache.expiresAt - 120_000 > now) {
    return tokenCache.accessToken;
  }

  const authBase = env('PHONEPE_AUTH_BASE');

  const form = new URLSearchParams();
  form.set('client_id', env('PHONEPE_CLIENT_ID'));
  form.set('client_secret', env('PHONEPE_CLIENT_SECRET'));
  form.set('client_version', env('PHONEPE_CLIENT_VERSION'));

  const r = await fetch(`${authBase}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store'
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`oauth-failed [${r.status}]: ${text}`);

  let data: any = {};
  try { data = JSON.parse(text); } catch {}

  const accessToken: string | undefined =
    data.access_token || data.accessToken;

  if (!accessToken) throw new Error(`oauth-ok-missing-token: ${text}`);

  const expirySec: number | undefined =
    typeof data.expires_at === 'number'
      ? data.expires_at
      : typeof data.expires_in === 'number'
      ? Math.floor(Date.now() / 1000) + data.expires_in
      : undefined;

  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = expirySec ? expirySec * 1000 : Date.now() + 55 * 60 * 1000;

  return accessToken;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const { searchParams } = new URL(req.url);
  // Either merchantOrderId OR merchantTransactionId (alias)
  const merchantOrderId =
    searchParams.get('merchantOrderId') ||
    searchParams.get('merchantTransactionId');

  if (!merchantOrderId) {
    return json(400, { ok: false, error: 'Missing query param: merchantOrderId (or merchantTransactionId)' });
  }

  try {
    const accessToken = await getAccessToken();

    const base = env('PHONEPE_BASE_URL');
    const merchantId = env('PHONEPE_MERCHANT_ID');

    const url = `${base}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?merchantId=${encodeURIComponent(merchantId)}`;

    const r = await fetch(url, {
      method: 'GET',
      headers: { authorization: `O-Bearer ${accessToken}` },
      cache: 'no-store'
    });

    const text = await r.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!r.ok) {
      return json(r.status, { ok: false, error: 'status-failed', body: text });
    }

    // Per checklist: use root-level `state`
    const state: string | undefined = data?.state;

    return json(200, {
      ok: true,
      state,            // COMPLETED / FAILED / PENDING
      raw: data
    });
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
}
