export const config = { runtime: 'edge' };

type PayRequest = {
  amount: number;                     // INR, whole rupees
  customerPhone?: string;
  merchantTransactionId: string;      // your generated order id
  successUrl: string;                 // where PhonePe should redirect on success
  failedUrl: string;                  // where PhonePe should redirect on failure
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
};

export default async function handler(req: Request) {
  try {
    if (req.method !== 'POST') {
      return json({ ok: false, error: 'Method Not Allowed' }, 405);
    }

    const body: PayRequest = await req.json().catch(() => ({} as any));

    if (!body || !body.merchantTransactionId || !body.successUrl || !body.failedUrl) {
      return json({
        ok: false,
        error: 'Invalid payload. Need { amount, merchantTransactionId, successUrl, failedUrl }',
      }, 400);
    }
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return json({ ok: false, error: 'amount must be a positive number (INR)' }, 400);
    }

    // —— ENV (update these in Vercel dashboard) ——
    const BASE = need('PHONEPE_BASE_URL');                        // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
    const MERCHANT_ID = need('PHONEPE_MERCHANT_ID');              // Your PhonePe merchant (MID)
    const CLIENT_ID = need('PHONEPE_CLIENT_ID');                  // From PhonePe test console
    const CLIENT_VERSION = need('PHONEPE_CLIENT_VERSION');        // e.g. "1"
    const CLIENT_SECRET = need('PHONEPE_CLIENT_SECRET');          // From PhonePe test console

    // 1) Get OAuth token (as per v2 docs)
    const tokenUrl = `${BASE}/v1/oauth/token`;
    const tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-client-id': CLIENT_ID,
        'x-client-version': CLIENT_VERSION,
        'x-client-secret': CLIENT_SECRET,
      },
      body: JSON.stringify({ grantType: 'client_credentials' }),
    });

    const tokenText = await tokenResp.text();
    if (!tokenResp.ok) {
      return json(
        {
          ok: false,
          step: 'oauth',
          status: tokenResp.status,
          statusText: tokenResp.statusText,
          headers: Object.fromEntries(tokenResp.headers.entries()),
          body: tokenText,
        },
        502
      );
    }

    let accessToken = '';
    try {
      const parsed = JSON.parse(tokenText);
      accessToken = parsed?.accessToken || parsed?.access_token || '';
    } catch {
      // keep raw tokenText in diagnostics
    }
    if (!accessToken) {
      return json(
        { ok: false, step: 'oauth-parse', body: tokenText || 'No token in response' },
        502
      );
    }

    // 2) Create payment (v2 /checkout/v2/pay)
    const payUrl = `${BASE}/checkout/v2/pay`;
    const payPayload = {
      merchantOrderId: body.merchantTransactionId, // naming per v2 docs
      merchantId: MERCHANT_ID,
      amount: Math.round(body.amount * 100),       // paise (v2 generally uses paise)
      // optional customer data
      customerMobile: body.customerPhone || undefined,
      // return/redirect URLs
      redirectUrl: body.successUrl,
      redirectMode: 'POST',                        // or 'GET' depending on your config
      failureRedirectUrl: body.failedUrl,
    };

    const payResp = await fetch(payUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payPayload),
    });

    const payText = await payResp.text();
    if (!payResp.ok) {
      return json(
        {
          ok: false,
          step: 'create-payment',
          status: payResp.status,
          statusText: payResp.statusText,
          headers: Object.fromEntries(payResp.headers.entries()),
          body: payText,
          request: payPayload, // helpful to see what we sent
        },
        502
      );
    }

    // Try to extract the redirect URL field (name differs per integration)
    let redirectUrl = '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(payText);
      redirectUrl = parsed?.redirectUrl || parsed?.instrumentResponse?.redirectInfo?.url || '';
    } catch {
      // leave redirectUrl empty; expose raw body
    }

    if (!redirectUrl) {
      return json(
        {
          ok: false,
          step: 'parse-payment-response',
          body: payText,
          hint: 'Could not find redirect URL in response',
        },
        502
      );
    }

    return json({
      ok: true,
      orderId: body.merchantTransactionId,
      url: redirectUrl,
      raw: parsed ?? payText, // keep minimal raw for debugging now
    });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || String(err) }, 500);
  }
}
