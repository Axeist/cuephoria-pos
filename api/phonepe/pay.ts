// /api/phonepe/pay.ts
export const config = { runtime: 'edge' };

type PayBody = {
  amount: number;                      // in rupees; we'll convert to paise
  customerPhone: string;               // customer mobile
  merchantTransactionId: string;       // your unique txn id
  successUrl: string;                  // absolute URL to return on success
  failedUrl: string;                   // absolute URL to return on failure
  expireAfter?: number;                // seconds (300..3600). default 1200
};

const isProd = (process.env.PHONEPE_ENV || 'uat').toLowerCase() === 'prod';
const AUTH_BASE = process.env.PHONEPE_AUTH_BASE!;   // e.g. https://api.phonepe.com/apis/identity-manager
const PG_BASE   = process.env.PHONEPE_BASE_URL!;    // e.g. https://api.phonepe.com/apis/pg

const CLIENT_ID      = process.env.PHONEPE_CLIENT_ID!;
const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION!;
const CLIENT_SECRET  = process.env.PHONEPE_CLIENT_SECRET!;
const MERCHANT_ID    = process.env.PHONEPE_MERCHANT_ID!;

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
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  let body: PayBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const {
    amount,
    customerPhone,
    merchantTransactionId,
    successUrl,
    failedUrl,
    expireAfter = 1200,
  } = body;

  if (
    !amount ||
    !customerPhone ||
    !merchantTransactionId ||
    !successUrl ||
    !failedUrl
  ) {
    return json(400, {
      ok: false,
      error:
        'Missing required fields (amount, customerPhone, merchantTransactionId, successUrl, failedUrl)',
    });
  }

  try {
    // 1) OAuth – get access token
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

    // 2) Create order (Standard Checkout)
    // amount must be IN PAISE
    const paise = Math.round(Number(amount) * 100);

    const payPayload = {
      merchantId: MERCHANT_ID,
      merchantOrderId: merchantTransactionId, // your unique id
      amount: paise,
      metaInfo: {
        udf: { customerPhone },
      },
      expireAfter, // seconds
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: successUrl, // PhonePe returns user here
        // (optional) additional URLs can be passed via meta if needed
      },
    };

    const payRes = await fetch(`${PG_BASE}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `${tokenType} ${accessToken}`,
      },
      body: JSON.stringify(payPayload),
    });

    const payText = await payRes.text();
    if (!payRes.ok) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: payRes.status,
        body: tryParse(payText),
      });
    }

    const pay = tryParse(payText);
    // PhonePe returns redirectUrl. Use it as-is.
    const redirectUrl = pay?.redirectUrl || pay?.data?.redirectUrl;
    if (!redirectUrl) {
      return json(502, {
        ok: false,
        step: 'pay',
        error: 'No redirectUrl in response',
        raw: pay,
      });
    }

    return json(200, {
      ok: true,
      url: redirectUrl,
      orderId: pay?.orderId || pay?.data?.orderId,
    });
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
