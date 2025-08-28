export const runtime = 'edge';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function requireEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k as keyof typeof process.env]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}

async function fetchJSON(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = init;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...rest, signal: ac.signal });
    const text = await resp.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { resp, body, text };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  try {
    requireEnv([
      'PHONEPE_BASE_URL',
      'PHONEPE_AUTH_BASE',
      'PHONEPE_MERCHANT_ID',
      'PHONEPE_CLIENT_ID',
      'PHONEPE_CLIENT_VERSION',
      'PHONEPE_CLIENT_SECRET',
    ]);

    const { amount, customerPhone, merchantTransactionId, successUrl, failedUrl } = await req.json();

    if (!amount || !merchantTransactionId || !successUrl || !failedUrl) {
      return json({ ok: false, step: 'validate', error: 'Missing required fields' }, 400);
    }

    // 1) OAuth
    const authUrl = `${process.env.PHONEPE_AUTH_BASE}/v1/oauth/token`;
    const payload = {
      client_id: process.env.PHONEPE_CLIENT_ID,
      client_version: Number(process.env.PHONEPE_CLIENT_VERSION || '1'),
      client_secret: process.env.PHONEPE_CLIENT_SECRET,
    };

    const { resp: aResp, body: aBody } = await fetchJSON(authUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      timeoutMs: 8000,
    });

    if (!aResp.ok || !aBody?.access_token) {
      return json({ ok: false, step: 'oauth', status: aResp.status, body: aBody }, 502);
    }

    const token = aBody.access_token as string;

    // 2) Create order (Standard Checkout)
    const orderUrl = `${process.env.PHONEPE_BASE_URL}/checkout/v2/pay`;

    const body = {
      merchantOrderId: merchantTransactionId,
      amount: Math.round(Number(amount) * 100), // rupees -> paise
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: successUrl, // PhonePe will return user here
      },
      metaInfo: {
        ...(customerPhone ? { customerPhone } : {}),
      },
      expireAfter: 900, // 15 minutes (per docs: 300–3600)
    };

    const { resp: pResp, body: pBody } = await fetchJSON(orderUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `O-Bearer ${token}`,
      },
      body: JSON.stringify(body),
      timeoutMs: 8000,
    });

    if (!pResp.ok || !pBody?.redirectUrl) {
      return json({ ok: false, step: 'pay', status: pResp.status, body: pBody }, 502);
    }

    // Return the URL to redirect the browser
    return json({ ok: true, url: pBody.redirectUrl });

  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

// Guard other methods
export const GET = () => json({ ok: false, error: 'Method not allowed' }, 405);
