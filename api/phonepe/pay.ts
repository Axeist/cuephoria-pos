export const config = { runtime: 'edge' };

const JSON_HEADERS = { 'content-type': 'application/json' };

// small helper to timeout fetch
async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), ms);
  try {
    // @ts-ignore
    return await p(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

function readEnv() {
  const env = process.env;

  const PG_BASE =
    env.PHONEPE_PG_BASE ||
    env.PHONEPE_BASE_URL ||
    env.PHONEPE_PG_BASE_URL;

  const AUTH_BASE =
    env.PHONEPE_AUTH_BASE ||
    env.PHONEPE_AUTH_BASE_URL;

  const v = (k?: string | null) => (k ?? '').trim() || null;

  return {
    PG_BASE: v(PG_BASE),
    AUTH_BASE: v(AUTH_BASE),
    MERCHANT_ID: v(env.PHONEPE_MERCHANT_ID),
    CLIENT_ID: v(env.PHONEPE_CLIENT_ID),
    CLIENT_VER: v(env.PHONEPE_CLIENT_VERSION),
    CLIENT_SECRET: v(env.PHONEPE_CLIENT_SECRET),
    SITE_URL: v(env.NEXT_PUBLIC_SITE_URL),
  };
}

async function getAccessToken(AUTH_BASE: string, CLIENT_ID: string, CLIENT_VER: string, CLIENT_SECRET: string) {
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', CLIENT_ID);
  form.set('client_version', CLIENT_VER);
  form.set('client_secret', CLIENT_SECRET);

  const res = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false as const, status: res.status, body };
  }

  const token =
    body?.access_token ??
    body?.encrypted_access_token ??
    null;

  if (!token) {
    return { ok: false as const, status: res.status, body: { message: 'Auth OK but no token in response', raw: body } };
  }

  const type = (body?.token_type || 'O-Bearer') as string;

  return { ok: true as const, token: `${type} ${token}` };
}

export default async function handler(req: Request) {
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS });

  const env = readEnv();
  const missing = Object.entries(env)
    .filter(([k, v]) => !v && k !== 'SITE_URL') // site url validated later
    .map(([k]) => k);

  if (missing.length) {
    return new Response(JSON.stringify({ ok: false, step: 'env', error: 'Missing env', missing }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS });
  }

  const {
    amount, // rupees
    customerPhone,
    merchantOrderId,   // optional; if not provided we’ll generate one
    successUrl,
    failedUrl,
  } = payload || {};

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ ok: false, error: 'Amount must be > 0' }), { status: 400, headers: JSON_HEADERS });
  }

  const rupees = Number(amount);
  const paise = Math.round(rupees * 100);

  const orderId = merchantOrderId || `CUE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const origin = env.SITE_URL || (typeof location !== 'undefined' ? location.origin : '');
  const fallbackOrigin = origin || '';

  const okSuccess = successUrl || `${fallbackOrigin}`;
  const okFailed  = failedUrl  || `${fallbackOrigin}`;

  // 1) OAuth
  const auth = await getAccessToken(env.AUTH_BASE!, env.CLIENT_ID!, env.CLIENT_VER!, env.CLIENT_SECRET!);
  if (!auth.ok) {
    return new Response(JSON.stringify({ ok: false, step: 'oauth', status: auth.status, body: auth.body }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }

  // 2) Create Standard Checkout order
  const payBody = {
    merchantId: env.MERCHANT_ID,
    merchantOrderId: orderId,
    amount: paise,
    metaInfo: {
      customerPhone: customerPhone || null,
    },
    expireAfter: 900, // 15 min
    paymentFlow: {
      type: 'PG_CHECKOUT',
      redirectUrl: okSuccess,   // PhonePe sends user back here after payment (or use /api/phonepe/status on your side)
      failureRedirectUrl: okFailed,
    },
  };

  const doPay = (signal: AbortSignal) =>
    fetch(`${env.PG_BASE}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': auth.token, // e.g. "O-Bearer <token>"
      },
      body: JSON.stringify(payBody),
      cache: 'no-store',
      signal,
    });

  try {
    const res = await withTimeout(doPay, 15000);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, step: 'pay', status: res.status, body }), {
        status: 502,
        headers: JSON_HEADERS,
      });
    }

    const redirectUrl = body?.redirectUrl || body?.data?.redirectUrl || null;
    if (!redirectUrl) {
      return new Response(JSON.stringify({ ok: false, step: 'pay', status: res.status, body: { message: 'No redirectUrl in response', raw: body } }), {
        status: 502,
        headers: JSON_HEADERS,
      });
    }

    // success
    return new Response(JSON.stringify({
      ok: true,
      orderId,
      url: redirectUrl,
    }), { headers: JSON_HEADERS });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, step: 'pay-exception', message: String(e?.message || e) }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}
