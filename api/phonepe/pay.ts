// /api/phonepe/pay.ts
export const config = { runtime: 'edge' };

type Json = Record<string, unknown>;

function readEnv() {
  const env = {
    AUTH_BASE: process.env.PHONEPE_AUTH_BASE || '',
    PG_BASE: process.env.PHONEPE_BASE_URL || '',
    MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID || '',
    CLIENT_ID: process.env.PHONEPE_CLIENT_ID || '',
    CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION || '',
    CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET || '',
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
  };
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  return { env, missing };
}

const ok = (body: Json, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req: Request) {
  if (req.method !== 'POST') return ok({ ok: false, error: 'Method not allowed' }, 405);

  const { env, missing } = readEnv();
  if (missing.length) return ok({ ok: false, step: 'env', error: `Missing env: ${missing.join(', ')}` }, 500);

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    // ignore
  }

  const rupees = Number(payload?.amount ?? 0);
  const paise = Math.round(rupees * 100);
  const customerPhone = (payload?.customerPhone || '').toString().trim();

  // Either accept merchantOrderId from client OR generate here
  const merchantOrderId: string =
    (payload?.merchantOrderId && String(payload.merchantOrderId)) ||
    `CUE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // --- Build absolute https success/failed redirects and append pp/order ---
  function buildRedirect(baseUrl: string | null | undefined, pp: 'success' | 'failed') {
    const raw = (baseUrl || env.SITE_URL || '').trim();
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      if (!env.SITE_URL) return null;
      u = new URL(env.SITE_URL);
    }
    if (u.protocol !== 'https:') u.protocol = 'https:';
    u.searchParams.set('pp', pp);
    u.searchParams.set('order', merchantOrderId);
    return u.toString();
  }

  const successRedirect = buildRedirect(payload?.successUrl, 'success');
  const failedRedirect = buildRedirect(payload?.failedUrl, 'failed');
  if (!successRedirect || !failedRedirect) {
    return ok(
      {
        ok: false,
        step: 'redirect-url',
        error:
          'Missing/invalid redirect URL(s). Provide absolute https URLs or set NEXT_PUBLIC_SITE_URL.',
      },
      400,
    );
  }

  // --- Guard rails ---
  if (!(paise > 0)) return ok({ ok: false, error: 'Amount must be > 0' }, 400);
  if (!customerPhone) return ok({ ok: false, error: 'customerPhone required' }, 400);

  // === 1) OAuth ===
  const oauthRes = await fetch(`${env.AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      client_version: env.CLIENT_VERSION,
    }),
  });

  const oauthText = await oauthRes.text();
  let oauth: any = {};
  try {
    oauth = JSON.parse(oauthText);
  } catch {
    /* noop */
  }
  if (!oauthRes.ok || !(oauth?.access_token || oauth?.accessToken)) {
    return ok(
      {
        ok: false,
        step: 'oauth',
        status: oauthRes.status,
        body: oauthText,
      },
      502,
    );
  }

  const token = oauth.access_token || oauth.accessToken;
  const tokenType = oauth.token_type || oauth.tokenType || 'O-Bearer'; // UAT usually returns O-Bearer

  // === 2) Create Pay Order ===
  const payBody = {
    merchantId: env.MERCHANT_ID,
    merchantOrderId,
    amount: paise, // paise
    expireAfter: 900, // seconds
    metaInfo: {
      customerPhone,
    },
    paymentFlow: {
      type: 'PG_CHECKOUT',
      redirectUrl: successRedirect,
      failureRedirectUrl: failedRedirect,
    },
  };

  const payRes = await fetch(`${env.PG_BASE}/checkout/v2/pay`, {
    method: 'POST',
    headers: {
      authorization: `${tokenType} ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payBody),
  });

  const payText = await payRes.text();
  let pay: any = {};
  try {
    pay = JSON.parse(payText);
  } catch {
    /* noop */
  }

  if (!payRes.ok || !pay?.redirectUrl) {
    return ok(
      { ok: false, step: 'pay', status: payRes.status, body: payText, orderId: merchantOrderId },
      502,
    );
  }

  // Success → return PhonePe checkout url
  return ok({
    ok: true,
    orderId: merchantOrderId,
    url: pay.redirectUrl,
  });
}
