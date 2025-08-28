// /api/phonepe/pay.ts
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

// very small in-memory cache (safe for one edge instance)
const tokenCache: { accessToken?: string; expiresAt?: number } = {};

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt && tokenCache.expiresAt - 120_000 > now) {
    return tokenCache.accessToken;
  }

  const authBase = env('PHONEPE_AUTH_BASE');

  // PhonePe expects form-encoded body
  const form = new URLSearchParams();
  form.set('client_id', env('PHONEPE_CLIENT_ID'));
  form.set('client_secret', env('PHONEPE_CLIENT_SECRET'));
  form.set('client_version', env('PHONEPE_CLIENT_VERSION'));

  const r = await fetch(`${authBase}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    // Edge: keepalive for good measure
    cache: 'no-store'
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`oauth-failed [${r.status}]: ${text}`);
  }

  // Response fields are snake_case per PhonePe docs
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* leave as {} and error below if needed */ }

  const accessToken: string | undefined =
    data.access_token || data.accessToken; // be tolerant

  if (!accessToken) {
    throw new Error(`oauth-ok-missing-token: ${text}`);
  }

  // prefer expires_at (epoch seconds); fallback to now + expires_in
  const expirySec: number | undefined =
    typeof data.expires_at === 'number'
      ? data.expires_at
      : typeof data.expires_in === 'number'
      ? Math.floor(Date.now() / 1000) + data.expires_in
      : undefined;

  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = expirySec ? expirySec * 1000 : Date.now() + 55 * 60 * 1000; // ~55m

  return accessToken;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  // Validate env early
  try {
    ['PHONEPE_AUTH_BASE', 'PHONEPE_BASE_URL', 'PHONEPE_MERCHANT_ID',
     'PHONEPE_CLIENT_ID', 'PHONEPE_CLIENT_VERSION', 'PHONEPE_CLIENT_SECRET'
    ].forEach(k => env(k as keyof Env));
  } catch (e: any) {
    return json(500, { ok: false, step: 'env', error: String(e?.message || e) });
  }

  let payload: {
    amount: number;                  // rupees (frontend); we’ll convert to paise
    customerPhone?: string;
    merchantTransactionId?: string;  // optional alias
    merchantOrderId?: string;        // preferred
    successUrl?: string;             // where PhonePe should return
  };

  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, step: 'parse', error: 'Invalid JSON' });
  }

  const rupees = Number(payload.amount || 0);
  if (!rupees || rupees <= 0) {
    return json(400, { ok: false, step: 'input', error: 'amount must be > 0 (INR)' });
  }

  const amountPaise = Math.round(rupees * 100);
  const merchantOrderId =
    payload.merchantOrderId || payload.merchantTransactionId || `CUE-${Date.now()}`;

  const redirectUrl =
    payload.successUrl ||
    `${process.env.NEXT_PUBLIC_SITE_URL || ''}` ||
    `${new URL(req.url).origin}/public/booking`;

  try {
    const accessToken = await getAccessToken();

    const base = env('PHONEPE_BASE_URL');
    const merchantId = env('PHONEPE_MERCHANT_ID');

    // Build Standard Checkout request
    const body = {
      merchantId,
      merchantOrderId,
      amount: amountPaise,
      expireAfter: 900, // 15 min
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl
      },
      // Keep meta minimal; include only if needed
      metaInfo: payload.customerPhone ? { customerPhone: payload.customerPhone } : undefined
    };

    const resp = await fetch(`${base}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `O-Bearer ${accessToken}`
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const text = await resp.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* best effort */ }

    if (!resp.ok) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: resp.status,
        error: 'PhonePe pay failed',
        body: text
      });
    }

    const redirect = data?.redirectUrl;
    const orderId = data?.orderId;

    if (!redirect) {
      return json(502, {
        ok: false,
        step: 'pay',
        error: 'Missing redirectUrl from PhonePe',
        body: data
      });
    }

    return json(200, {
      ok: true,
      url: redirect,
      orderId,
      merchantOrderId
    });
  } catch (e: any) {
    return json(500, {
      ok: false,
      step: 'exception',
      error: String(e?.message || e)
    });
  }
}
