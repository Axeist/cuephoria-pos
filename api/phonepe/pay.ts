/* eslint-disable @typescript-eslint/no-var-requires */
const fetch = globalThis.fetch;

// Helper to JSON response
function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

// Build a tiny logger
function logStep(step, payload) {
  return { step, ...payload };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  // --- Read envs
  const BASE = process.env.PHONEPE_BASE_URL;             // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
  const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;   // e.g. M236V4PJIYABI
  const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;       // e.g. TEST-M236V4PJIYABI_25082
  const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION; // e.g. 1
  const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;

  if (!BASE || !MERCHANT_ID || !CLIENT_ID || !CLIENT_VERSION || !CLIENT_SECRET) {
    return json(res, 500, logStep('env-missing', {
      ok: false,
      error: 'Missing required PhonePe envs',
      missing: {
        BASE: !!BASE, MERCHANT_ID: !!MERCHANT_ID,
        CLIENT_ID: !!CLIENT_ID, CLIENT_VERSION: !!CLIENT_VERSION, CLIENT_SECRET: !!CLIENT_SECRET
      }
    }));
  }

  // --- Read body
  let body;
  try {
    body = req.body || {};
  } catch {
    // sometimes Node parses for us; but if not, handle raw
    try {
      body = JSON.parse(req.rawBody?.toString() || '{}');
    } catch {
      body = {};
    }
  }

  const {
    amount,                 // in rupees from UI
    customerPhone,          // string
    merchantTransactionId,  // unique
    successUrl,             // redirect url on success
    failedUrl               // redirect url on fail
  } = body;

  if (!amount || !merchantTransactionId || !customerPhone || !successUrl || !failedUrl) {
    return json(res, 400, logStep('validate', {
      ok: false,
      error: 'Missing required fields',
      need: ['amount (₹)', 'customerPhone', 'merchantTransactionId', 'successUrl', 'failedUrl']
    }));
  }

  // Convert to paise (integer)
  const amountPaise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    return json(res, 400, logStep('validate', { ok: false, error: 'Invalid amount' }));
  }

  // --- 1) OAuth Token
  const authUrl = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
  let accessToken = '';
  try {
    const authResp = await fetch(authUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_version: String(CLIENT_VERSION),
        grant_type: 'client_credentials'
      }).toString()
    });

    const text = await authResp.text();
    let authJson: any = {};
    try { authJson = JSON.parse(text); } catch { /* leave as {} */ }

    if (!authResp.ok) {
      return json(res, 502, logStep('oauth-failed', {
        ok: false,
        status: authResp.status,
        body: text || authJson
      }));
    }

    // PhonePe returns access_token in either access_token or encrypted_access_token (docs use access_token)
    accessToken = authJson?.access_token || authJson?.encrypted_access_token || '';
    if (!accessToken) {
      return json(res, 500, logStep('oauth-no-token', {
        ok: false,
        body: authJson
      }));
    }
  } catch (e: any) {
    return json(res, 500, logStep('oauth-exception', { ok: false, error: String(e?.message || e) }));
  }

  // --- 2) Create Payment
  const payUrl = `${BASE.replace(/\/+$/, '')}/checkout/v2/pay`;

  const payload = {
    merchantTransactionId,
    merchantId: MERCHANT_ID,
    instrumentType: 'MOBILE',
    instrumentReference: String(customerPhone),
    amount: amountPaise,
    redirectUrl: successUrl,
    redirectMode: 'REDIRECT',
    callbackUrl: failedUrl,
    paymentScope: 'PAY_PAGE' // hosted page
  };

  try {
    const payResp = await fetch(payUrl, {
      method: 'POST',
      headers: {
        'authorization': `O-Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const respText = await payResp.text();
    let respJson: any = {};
    try { respJson = JSON.parse(respText); } catch { /* keep text */ }

    if (!payResp.ok) {
      return json(res, 502, logStep('pay-failed', {
        ok: false,
        status: payResp.status,
        request: payload,
        response: respJson || respText
      }));
    }

    // Expect url in response (PhonePe hosted payment page)
    const payUrlFromPP = respJson?.data?.instrumentResponse?.redirectInfo?.url
                      || respJson?.url
                      || respJson?.data?.url;

    if (!payUrlFromPP) {
      return json(res, 500, logStep('pay-missing-url', {
        ok: false,
        response: respJson || respText
      }));
    }

    return json(res, 200, {
      ok: true,
      url: payUrlFromPP,
      step: 'pay-success'
    });
  } catch (e: any) {
    return json(res, 500, logStep('pay-exception', { ok: false, error: String(e?.message || e) }));
  }
}

// CJS export for Vercel Node runtime
module.exports = handler;
