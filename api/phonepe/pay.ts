// api/phonepe/pay.ts
// Vercel Edge Function – PhonePe Standard Checkout (UAT)
// Accepts POST { amount (₹), customerPhone, merchantOrderId, successUrl }
// Returns { ok:true, url } or { ok:false, step, status, body|error }

export const runtime = 'edge';

/* ----------------------- helpers ----------------------- */
function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// Edge-safe fetch with timeout
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 20000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // @ts-ignore
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ----------------------- handler ----------------------- */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  // ---- env (UAT) ----
  const AUTH_BASE =
    process.env.PHONEPE_AUTH_BASE ??
    'https://api-preprod.phonepe.com/apis/identity-manager';
  const PG_BASE =
    process.env.PHONEPE_BASE_URL ??
    'https://api-preprod.phonepe.com/apis/pg-sandbox';

  const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || '';
  const CLIENT_ID = process.env.PHONEPE_CLIENT_ID || '';
  const CLIENT_VER = process.env.PHONEPE_CLIENT_VERSION || '';
  const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET || '';

  if (!MERCHANT_ID || !CLIENT_ID || !CLIENT_VER || !CLIENT_SECRET) {
    return json(500, {
      ok: false,
      step: 'env',
      error:
        'Missing PhonePe env vars. Set PHONEPE_MERCHANT_ID, PHONEPE_CLIENT_ID, PHONEPE_CLIENT_VERSION, PHONEPE_CLIENT_SECRET.',
    });
  }

  // ---- input ----
  let bodyIn: any = {};
  try {
    bodyIn = await req.json();
  } catch {
    return json(400, { ok: false, step: 'parse', error: 'Invalid JSON body' });
  }

  const rupees = Number(bodyIn?.amount);
  const customerPhone = String(bodyIn?.customerPhone || '').trim();
  const merchantOrderId = String(bodyIn?.merchantOrderId || '').trim();
  const successUrl = String(bodyIn?.successUrl || '').trim(); // your page that will poll status

  if (!rupees || rupees <= 0) {
    return json(400, { ok: false, step: 'validate', error: 'amount (₹) must be > 0' });
  }
  if (!merchantOrderId) {
    return json(400, { ok: false, step: 'validate', error: 'merchantOrderId is required' });
  }
  if (!successUrl) {
    return json(400, { ok: false, step: 'validate', error: 'successUrl is required' });
  }

  // paise conversion
  const amountPaise = Math.round(rupees * 100);

  try {
    /* ========== 1) OAuth token ========== */
    const form = new URLSearchParams();
    form.set('client_id', CLIENT_ID);
    form.set('client_secret', CLIENT_SECRET);
    form.set('client_version', CLIENT_VER);

    const oauthRes = await fetchWithTimeout(`${AUTH_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
      timeoutMs: 15000,
    });

    const oauthText = await oauthRes.text();
    let oauthJson: any = {};
    try {
      oauthJson = JSON.parse(oauthText);
    } catch {
      oauthJson = { raw: oauthText };
    }

    if (!oauthRes.ok) {
      return json(502, {
        ok: false,
        step: 'oauth-failed',
        status: oauthRes.status,
        body: oauthJson,
      });
    }

    // PhonePe returns token_type "O-Bearer" in UAT; prefer access_token else encrypted_access_token
    const token =
      oauthJson?.access_token || oauthJson?.encrypted_access_token || '';
    const tokenType = oauthJson?.token_type || 'O-Bearer';

    if (!token) {
      return json(502, {
        ok: false,
        step: 'oauth-failed',
        status: oauthRes.status,
        body: oauthJson,
        error: 'No access_token in OAuth response',
      });
    }

    /* ========== 2) Create Standard Checkout order ========== */
    // Minimal spec per PhonePe docs. Do not include merchantId here; the token represents the merchant.
    const payBody = {
      merchantOrderId,
      amount: amountPaise, // paise
      metaInfo: {
        udf1: customerPhone || undefined,
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: successUrl, // where user should be sent back to your app
      },
      deviceContext: { deviceOS: 'WEB' },
      expireAfter: 900, // seconds (15 min). Adjust if needed
    };

    const payRes = await fetchWithTimeout(`${PG_BASE}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `${tokenType} ${token}`, // usually "O-Bearer <token>"
      },
      body: JSON.stringify(payBody),
      cache: 'no-store',
      timeoutMs: 20000,
    });

    const payText = await payRes.text();
    let payJson: any = {};
    try {
      payJson = JSON.parse(payText);
    } catch {
      payJson = { raw: payText };
    }

    if (!payRes.ok) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: payRes.status,
        body: payJson,
      });
    }

    // Expect redirectUrl in success payload
    const redirectUrl = payJson?.redirectUrl;
    if (!redirectUrl) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: payRes.status,
        body: payJson,
        error: 'No redirectUrl in PhonePe response',
      });
    }

    return json(200, { ok: true, url: redirectUrl });
  } catch (e: any) {
    // Timeouts or network will end here
    return json(500, {
      ok: false,
      step: 'exception',
      error: String(e?.message || e),
    });
  }
}
