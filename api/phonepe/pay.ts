// /api/phonepe/pay.ts
export const runtime = 'edge';

// ===== ENV =====
const PG_BASE = process.env.PHONEPE_BASE_URL;               // e.g. https://api.phonepe.com/apis/pg  OR  https://api-preprod.phonepe.com/apis/pg-sandbox
const AUTH_BASE = process.env.PHONEPE_AUTH_BASE || 'https://api.phonepe.com/apis/identity-manager';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_VER = process.env.PHONEPE_CLIENT_VERSION;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;

// ===== token cache (Edge-safe globals) =====
type Tok = { access_token: string; expires_at: number };
let TOK: Tok | null = null;

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_VER || !CLIENT_SECRET) {
    throw new Error('Missing OAuth env: PHONEPE_CLIENT_ID / PHONEPE_CLIENT_VERSION / PHONEPE_CLIENT_SECRET');
  }
  if (TOK && TOK.expires_at - 60 > nowSec()) return TOK.access_token; // reuse if > 60s left

  const r = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_version: CLIENT_VER,
      client_secret: CLIENT_SECRET,
    }),
  });

  const body = await r.json().catch(() => ({} as any));
  if (!r.ok) {
    throw new Error(`oauth-failed [${r.status}]: ${JSON.stringify(body)}`);
  }

  const token = body.access_token || body.encrypted_access_token || body.token || body.accessToken;
  const exp = body.expires_at || body.session_expires_at || (nowSec() + (body.expires_in || 3600));

  if (!token) throw new Error(`oauth-ok-but-no-token: ${JSON.stringify(body)}`);

  TOK = { access_token: token, expires_at: Number(exp) || nowSec() + 3600 };
  return TOK.access_token;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  try {
    if (!PG_BASE || !MERCHANT_ID) {
      return json({ ok: false, error: 'Missing env: PHONEPE_BASE_URL or PHONEPE_MERCHANT_ID' }, 500);
    }

    const body = await req.json().catch(() => ({} as any));
    // expected from frontend:
    // { amount: number (rupees), customerPhone?: string, merchantOrderId?: string, successUrl: string, failedUrl: string }
    const amountRupees = Number(body?.amount || 0);
    const amountPaise = Math.round(amountRupees * 100);
    const merchantOrderId =
      body?.merchantOrderId ||
      body?.merchantTransactionId ||
      `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const successUrl = String(body?.successUrl || '');
    const failedUrl = String(body?.failedUrl || '');

    if (!amountPaise || amountPaise <= 0) return json({ ok: false, error: 'Invalid amount' }, 400);
    if (!successUrl || !failedUrl) return json({ ok: false, error: 'Missing successUrl/failedUrl' }, 400);

    const access = await getAccessToken();

    // Standard Checkout v2 – create pay request
    const payload = {
      merchantId: MERCHANT_ID,
      merchantOrderId,
      amount: amountPaise, // in paise
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: successUrl, // user will return here after payment
      },
      metaInfo: {
        // add anything you need; keep minimal in prod
        source: 'web',
        failedUrl, // keep for your own redirection handling
      },
    };

    const resp = await fetch(`${PG_BASE}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // IMPORTANT: token_type in response is "O-Bearer"
        Authorization: `O-Bearer ${access}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({} as any));

    if (!resp.ok) {
      return json({ ok: false, step: 'pay', status: resp.status, body: data }, 502);
    }

    // Expect: { orderId, redirectUrl, ... }
    const redirectUrl = data?.redirectUrl || data?.data?.redirectUrl;
    if (!redirectUrl) {
      return json({ ok: false, step: 'pay-no-redirect', body: data }, 502);
    }

    return json({ ok: true, url: redirectUrl, merchantOrderId });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
