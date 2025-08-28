// api/phonepe/pay.ts
export const config = { runtime: 'edge' };

type PayBody = {
  amount: number; // in rupees (we convert to paise)
  customerPhone?: string;
  merchantTransactionId: string;  // your unique order/txn id
  successUrl: string;             // where you want PhonePe to send users
  failedUrl?: string;             // optional
  expireAfter?: number;           // seconds (300..3600) - optional
};

type OAuthResult = { access_token: string; expires_at?: number; token_type?: string; };

const ENV = {
  ENV: (process.env.PHONEPE_ENV || 'SANDBOX').toUpperCase(),
  AUTH_BASE: process.env.PHONEPE_AUTH_BASE,
  PG_BASE: process.env.PHONEPE_PG_BASE,
  MID: process.env.PHONEPE_MERCHANT_ID,
  CID: process.env.PHONEPE_CLIENT_ID,
  CSEC: process.env.PHONEPE_CLIENT_SECRET,
  CV: process.env.PHONEPE_CLIENT_VERSION,
};

// ----- Simple in-memory token cache (per edge instance) -----
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.exp - 15_000 > now) return cachedToken.token;

  // OAuth: POST x-www-form-urlencoded with grant_type=client_credentials
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', ENV.CID || '');
  form.set('client_secret', ENV.CSEC || '');
  form.set('client_version', ENV.CV || '1');

  const res = await fetch(`${ENV.AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    // edge has a short default timeout; if needed, rely on Vercel's default
  });

  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) {
    throw new Error(
      `oauth-failed [HTTP ${res.status}] ${text || 'no-body'}`
    );
  }

  const token = json.access_token || json.encrypted_access_token || '';
  if (!token) {
    throw new Error(`oauth-no-token ${text || 'no-body'}`);
  }

  // Use expires_at if present; else fallback to 50 min from now
  const exp = typeof json.expires_at === 'number'
    ? json.expires_at * 1000
    : now + 50 * 60 * 1000;

  cachedToken = { token, exp };
  return token;
}

function requireEnv() {
  const missing: string[] = [];
  for (const [k, v] of Object.entries(ENV)) {
    if (!v && k !== 'ENV') missing.push(`PHONEPE_${k}`);
  }
  if (missing.length) {
    return { ok: false, json: { ok: false, step: 'env', error: `Missing env: ${missing.join(', ')}` } };
  }
  return { ok: true as const };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'content-type': 'application/json' }
    });
  }
  const envCheck = requireEnv();
  if (!envCheck.ok) return new Response(JSON.stringify(envCheck.json), { status: 500, headers: { 'content-type': 'application/json' } });

  let body: PayBody;
  try { body = await req.json() as PayBody; }
  catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const { amount, merchantTransactionId, successUrl, failedUrl, customerPhone, expireAfter } = body;
  if (!amount || amount <= 0 || !merchantTransactionId || !successUrl) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing required fields: amount, merchantTransactionId, successUrl' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  // Convert rupees -> paise
  const amountPaise = Math.round(amount * 100);

  try {
    const token = await getAccessToken();

    // Build Standard Checkout request (min required fields)
    const payPayload: any = {
      merchantId: ENV.MID,
      merchantOrderId: merchantTransactionId,
      amount: amountPaise,
      currency: 'INR',
      // optional expiry bounds: 300..3600
      expireAfter: Math.min(Math.max(expireAfter ?? 1200, 300), 3600),
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: successUrl, // Where PhonePe returns users post payment
      },
      deviceContext: { deviceOS: 'WEB' },
    };

    if (failedUrl) payPayload.failureRedirectUrl = failedUrl;
    if (customerPhone) payPayload.customerNotification = { phoneNumber: customerPhone };

    const res = await fetch(`${ENV.PG_BASE}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'authorization': `O-Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payPayload),
    });

    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        step: 'pay',
        status: res.status,
        body: text || null
      }), { status: 502, headers: { 'content-type': 'application/json' } });
    }

    // PhonePe typically returns redirectUrl and orderId
    const redirectUrl = json.redirectUrl || json.data?.redirectUrl;
    const orderId = json.orderId || json.data?.orderId;

    if (!redirectUrl) {
      return new Response(JSON.stringify({
        ok: false,
        step: 'pay',
        status: res.status,
        body: json,
        error: 'PhonePe pay OK but no redirectUrl'
      }), { status: 502, headers: { 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      ok: true,
      url: redirectUrl,
      orderId,
      env: ENV.ENV
    }), { status: 200, headers: { 'content-type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({
      ok: false,
      step: ('' + e.message).startsWith('oauth') ? 'oauth' : 'exception',
      error: e?.message || e
    }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}
