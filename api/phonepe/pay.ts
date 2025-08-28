// /api/phonepe/pay.ts
export const runtime = 'edge';

type Env = {
  PHONEPE_BASE_URL: string;          // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
  PHONEPE_AUTH_BASE_URL?: string;    // optional override, defaults to identity-manager below
  PHONEPE_MERCHANT_ID: string;       // e.g. M236V4PJIYABI
  PHONEPE_CLIENT_ID: string;         // e.g. TEST-M236V4PJIYABI_25082
  PHONEPE_CLIENT_VERSION: string;    // e.g. "1"
  PHONEPE_CLIENT_SECRET: string;     // secret string
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(req: Request) {
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

    // ---- BODY
    const body = await req.json().catch(() => ({}));
    const {
      amount,                        // rupees, integer
      customerPhone,                 // string
      merchantTransactionId,         // optional label for you (we’ll pass as merchantOrderId)
      successUrl,                    // absolute URL
      failedUrl,                     // absolute URL (we’ll echo it back in status step)
    } = body || {};

    if (!amount || amount <= 0) return json(400, { ok: false, step: 'validate', error: 'Amount must be > 0' });
    if (!customerPhone) return json(400, { ok: false, step: 'validate', error: 'customerPhone required' });

    const rupees = Math.round(Number(amount));
    const paise = rupees * 100;
    const merchantOrderId = String(merchantTransactionId || `CUE-${Date.now()}`);

    // ---- 1) OAUTH
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
      return json(502, {
        ok: false,
        step: 'oauth',
        status: authRes.status,
        body: safeJson(authText),
      });
    }
    const authJson = safeJson(authText);
    const accessToken = authJson?.access_token || authJson?.token || authJson?.encrypted_access_token;
    if (!accessToken) {
      return json(502, { ok: false, step: 'oauth-no-token', status: authRes.status, body: authJson });
    }

    // ---- 2) PAY
    const payPayload = {
      merchantId: env.PHONEPE_MERCHANT_ID,
      merchantOrderId,
      amount: paise,
      expireAfter: 900, // 15 min
      metaInfo: {
        udf: { customerMobile: String(customerPhone) },
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: successUrl || `${new URL(req.url).origin}/public/booking?pp=success`,
      },
      deviceContext: { deviceOS: 'WEB' },
    };

    const payRes = await fetchWithTimeout(
      `${env.PHONEPE_BASE_URL}/checkout/v2/pay`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`,
        },
        body: JSON.stringify(payPayload),
      },
      20000
    );

    const payText = await payRes.text();
    if (!payRes.ok) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: payRes.status,
        body: safeJson(payText),
      });
    }
    const payJson = safeJson(payText);
    const redirectUrl = payJson?.redirectUrl || payJson?.data?.redirectUrl;

    if (!redirectUrl) {
      return json(502, {
        ok: false,
        step: 'pay-no-redirect',
        status: payRes.status,
        body: payJson,
      });
    }

    // Success — send URL back to frontend to redirect
    return json(200, {
      ok: true,
      step: 'pay-ok',
      url: redirectUrl,
      merchantOrderId,
    });
  } catch (err: any) {
    const message = String(err?.message || err);
    const aborted = /abort|timeout/i.test(message);
    return json(502, {
      ok: false,
      step: aborted ? 'timeout' : 'exception',
      error: message,
    });
  }
}

function safeJson(s: any) {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s;
  } catch {
    return { raw: s };
  }
}
