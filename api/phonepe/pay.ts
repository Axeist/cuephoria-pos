export const config = { runtime: 'edge' };

type PayBody = {
  amount: number;                 // rupees; server converts to paise
  customerPhone: string;
  merchantTransactionId: string;
  successUrl: string;
  failedUrl: string;
  expireAfter?: number;           // default 1200 (20m)
};

const AUTH_BASE = process.env.PHONEPE_AUTH_BASE!;
const PG_BASE   = process.env.PHONEPE_BASE_URL!;

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
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  let body: PayBody;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Invalid JSON body' }); }

  const { amount, customerPhone, merchantTransactionId, successUrl, failedUrl, expireAfter = 1200 } = body;
  if (!amount || !customerPhone || !merchantTransactionId || !successUrl || !failedUrl) {
    return json(400, { ok: false, error: 'Missing required fields' });
  }

  try {
    // ---- OAuth (lowercase grant_type: client_credentials) ----
    const oauthBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      client_version: String(CLIENT_VERSION),
    });

    const authRes = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: oauthBody,
    });

    const authText = await authRes.text();
    if (!authRes.ok) return json(502, { ok: false, step: 'oauth', status: authRes.status, body: tryParse(authText) });

    const auth = tryParse(authText);
    const token = auth?.access_token || auth?.encrypted_access_token || auth?.token;
    const tokenType = auth?.token_type || 'O-Bearer';
    if (!token) return json(502, { ok: false, step: 'oauth', error: 'No access_token in response', raw: auth });

    // ---- Create Order ----
    const paise = Math.round(Number(amount) * 100);
    const payload = {
      merchantId: MERCHANT_ID,
      merchantOrderId: merchantTransactionId,
      amount: paise,
      expireAfter,
      metaInfo: { udf: { customerPhone } },
      paymentFlow: { type: 'PG_CHECKOUT', redirectUrl: successUrl },
    };

    const payRes = await fetch(`${PG_BASE}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `${tokenType} ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const payText = await payRes.text();
    if (!payRes.ok) return json(502, { ok: false, step: 'pay', status: payRes.status, body: tryParse(payText) });

    const pay = tryParse(payText);
    const redirectUrl = pay?.redirectUrl || pay?.data?.redirectUrl;
    if (!redirectUrl) return json(502, { ok: false, step: 'pay', error: 'No redirectUrl in response', raw: pay });

    return json(200, { ok: true, url: redirectUrl, orderId: pay?.orderId || pay?.data?.orderId });
  } catch (e: any) {
    return json(500, { ok: false, step: 'exception', error: String(e?.message || e) });
  }
}

function tryParse(x: string) { try { return JSON.parse(x); } catch { return x; } }
