/* eslint-disable @typescript-eslint/no-var-requires */
const fetch = globalThis.fetch;

// tiny helpers
function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
function logStep(step, payload) {
  return { step, ...payload };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  // --- env
  const BASE = process.env.PHONEPE_BASE_URL;             // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
  const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;   // e.g. M236V4PJIYABI
  const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;       // e.g. TEST-M...
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

  // --- query
  const { merchantOrderId, merchantTransactionId } = req.query || ({} as any);
  const orderId = String(merchantOrderId || merchantTransactionId || '').trim();

  if (!orderId) {
    return json(res, 400, {
      ok: false,
      error: 'Missing query param: merchantOrderId (or merchantTransactionId)'
    });
  }

  // --- 1) OAuth
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

    const txt = await authResp.text();
    let j: any = {};
    try { j = JSON.parse(txt); } catch {}

    if (!authResp.ok) {
      return json(res, 502, logStep('oauth-failed', {
        ok: false,
        status: authResp.status,
        body: j || txt
      }));
    }

    accessToken = j?.access_token || j?.encrypted_access_token || '';
    if (!accessToken) {
      return json(res, 500, logStep('oauth-no-token', { ok: false, body: j || txt }));
    }
  } catch (e: any) {
    return json(res, 500, logStep('oauth-exception', { ok: false, error: String(e?.message || e) }));
  }

  // --- 2) Status call
  const statusUrl = `${BASE.replace(/\/+$/, '')}/checkout/v2/order/${encodeURIComponent(orderId)}/status?merchantId=${encodeURIComponent(MERCHANT_ID)}`;

  try {
    const r = await fetch(statusUrl, {
      method: 'GET',
      headers: { authorization: `O-Bearer ${accessToken}` }
    });

    const txt = await r.text();
    let j: any = {};
    try { j = JSON.parse(txt); } catch {}

    if (!r.ok) {
      return json(res, 502, logStep('status-failed', {
        ok: false,
        status: r.status,
        response: j || txt
      }));
    }

    // Return raw PhonePe JSON so frontend can decide success
    return json(res, 200, {
      ok: true,
      step: 'status-success',
      response: j || txt
    });
  } catch (e: any) {
    return json(res, 500, logStep('status-exception', { ok: false, error: String(e?.message || e) }));
  }
}

// CJS export for Vercel Node runtime
module.exports = handler;
