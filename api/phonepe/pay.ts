// /api/phonepe/pay.ts
export const runtime = 'edge';

type PayBody = {
  amount: number; // in rupees
  customerPhone: string;
  merchantTransactionId: string; // your unique order id
  successUrl?: string; // where PhonePe should redirect after payment
  failedUrl?: string;  // (optional) your failure page
};

/** ---------- Tiny in-memory OAuth cache (per edge instance) ---------- */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getEnv() {
  const BASE = process.env.PHONEPE_BASE_URL;          // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
  const MID  = process.env.PHONEPE_MERCHANT_ID;       // e.g. M236V4PJIYABI
  const CID  = process.env.PHONEPE_CLIENT_ID;         // e.g. TEST-..._12345
  const CVER = process.env.PHONEPE_CLIENT_VERSION;    // e.g. "1"
  const CSEC = process.env.PHONEPE_CLIENT_SECRET;     // secret string

  // Choose OAuth base:
  //  - If PHONEPE_AUTH_BASE is provided, use it.
  //  - Else: use the preprod identity-manager for api-preprod, otherwise prod.
  const AUTH_BASE =
    process.env.PHONEPE_AUTH_BASE ||
    (BASE?.includes('api-preprod')
      ? 'https://api-preprod.phonepe.com/apis/identity-manager'
      : 'https://api.phonepe.com/apis/identity-manager');

  if (!BASE || !MID || !CID || !CVER || !CSEC) {
    return {
      ok: false as const,
      error: 'Missing environment variables',
      missing: {
        PHONEPE_BASE_URL: !BASE,
        PHONEPE_MERCHANT_ID: !MID,
        PHONEPE_CLIENT_ID: !CID,
        PHONEPE_CLIENT_VERSION: !CVER,
        PHONEPE_CLIENT_SECRET: !CSEC,
      },
    };
  }
  return { ok: true as const, BASE, MID, CID, CVER, CSEC, AUTH_BASE };
}

async function fetchOAuthToken(AUTH_BASE: string, CID: string, CVER: string, CSEC: string) {
  // Reuse if not expiring in next 30s
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - now > 30) {
    return cachedToken.accessToken;
  }

  const url = `${AUTH_BASE}/v1/oauth/token`;
  const form = new URLSearchParams();
  form.set('client_id', CID);
  form.set('client_version', String(CVER));
  form.set('client_secret', CSEC);

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const text = await r.text();
  let j: any = null;
  try { j = JSON.parse(text); } catch { /* keep raw */ }

  if (!r.ok) {
    throw new Error(
      `oauth-failed [HTTP ${r.status}]. ${text}`
    );
  }

  // PhonePe returns access_token + expires_at (epoch seconds)
  const token = j?.access_token || j?.accessToken;
  const expiresAt = j?.expires_at || j?.expiresAt;

  if (!token) {
    throw new Error(`oauth-bad-response: no access_token in ${text}`);
  }

  // If expiresAt not present, default to 50 minutes from now
  const exp = typeof expiresAt === 'number' ? Number(expiresAt) : (now + 3000);

  cachedToken = { accessToken: token, expiresAt: exp };
  return token;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const env = await getEnv();
  if (!env.ok) {
    return json(500, { step: 'env', ok: false, ...env });
  }
  const { BASE, MID, CID, CVER, CSEC, AUTH_BASE } = env;

  let body: PayBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const rupees = Number(body.amount || 0);
  if (!rupees || rupees <= 0) {
    return json(400, { ok: false, error: 'Amount must be > 0 (in rupees)' });
  }
  if (!body.customerPhone) {
    return json(400, { ok: false, error: 'customerPhone is required' });
  }
  if (!body.merchantTransactionId) {
    return json(400, { ok: false, error: 'merchantTransactionId is required' });
  }

  // Per checklist → use merchantOrderId (rename from merchantTransactionId)
  const merchantOrderId = body.merchantTransactionId;
  const amountPaise = Math.round(rupees * 100);

  try {
    // 1) OAuth
    const accessToken = await fetchOAuthToken(AUTH_BASE, CID, String(CVER), CSEC);

    // 2) Create payment
    const payUrl = `${BASE}/checkout/v2/pay`;
    const payload = {
      merchantId: MID,
      merchantOrderId,
      amount: amountPaise,
      expireAfter: 900, // 15 minutes
      paymentFlow: {
        type: 'PG_CHECKOUT',
        redirectUrl: body.successUrl || '',
      },
      mobileNumber: body.customerPhone,
      // metaInfo: {} // add UDFs if you need
    };

    const r = await fetch(payUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Per OAuth: token_type in sandbox often "O-Bearer"
        Authorization: `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let j: any = null;
    try { j = JSON.parse(text); } catch { /* keep raw */ }

    if (!r.ok) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: r.status,
        error: 'PhonePe pay failed',
        body: text,
      });
    }

    // Expect redirectUrl + orderId
    const redirectUrl = j?.redirectUrl;
    const orderId = j?.orderId;
    if (!redirectUrl) {
      return json(502, {
        ok: false,
        step: 'pay',
        status: r.status,
        error: 'No redirectUrl returned by PhonePe',
        body: j || text,
      });
    }

    return json(200, {
      ok: true,
      step: 'pay',
      url: redirectUrl,
      orderId: orderId || null,
      merchantOrderId,
    });
  } catch (e: any) {
    return json(500, {
      ok: false,
      step: 'exception',
      error: String(e?.message || e),
    });
  }
}
