// api/phonepe/pay.ts
export const config = { runtime: "edge" };

/** ---------- Utils ---------- */
function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function oauthToken() {
  const AUTH_BASE = need("PHONEPE_AUTH_BASE"); // e.g. https://api-preprod.phonepe.com/apis/identity-manager
  const CLIENT_ID = need("PHONEPE_CLIENT_ID");
  const CLIENT_SECRET = need("PHONEPE_CLIENT_SECRET");
  const CLIENT_VERSION = need("PHONEPE_CLIENT_VERSION"); // "1"

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    client_version: CLIENT_VERSION,
  });

  const r = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch {}

  if (!r.ok) {
    throw new Error(
      `oauth ${r.status}: ${typeof data === "object" ? JSON.stringify(data) : text}`
    );
  }

  // PhonePe returns token_type "O-Bearer"
  const token = data?.access_token || data?.encrypted_access_token;
  const type = data?.token_type || "O-Bearer";
  if (!token) throw new Error(`oauth OK but no token in response: ${text}`);
  return { authz: `${type} ${token}` };
}

/** ---------- Handler ---------- */
export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const BASE = need("PHONEPE_BASE_URL"); // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
    const MERCHANT_ID = need("PHONEPE_MERCHANT_ID");

    const payload = await req.json().catch(() => ({} as any));
    const { amount, customerPhone, merchantTransactionId, merchantOrderId } = payload || {};

    if (!amount || Number(amount) <= 0) {
      return j({ ok: false, step: "validate", error: "Amount must be > 0" }, 400);
    }

    const orderId =
      merchantOrderId ||
      merchantTransactionId ||
      `CUE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Compute site origin from env (preferred) or request
    const siteOrigin =
      (process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
        : undefined) || new URL(req.url).origin;

    // Server-side relay return (handles final redirect to SPA)
    const successRedirect = `${siteOrigin}/api/phonepe/return?status=success&order=${encodeURIComponent(orderId)}`;
    const failedRedirect  = `${siteOrigin}/api/phonepe/return?status=failed&order=${encodeURIComponent(orderId)}`;

    // 1) OAuth
    const { authz } = await oauthToken();

    // 2) Create payment
    const createBody = {
      merchantId: MERCHANT_ID,
      merchantOrderId: orderId,
      amount: Math.round(Number(amount) * 100), // rupees -> paise
      paymentFlow: {
        type: "PG_CHECKOUT",
        redirectUrl: successRedirect,
        failureRedirectUrl: failedRedirect,
      },
      metaInfo: {
        customerPhone: customerPhone || "",
      },
      expireAfter: 900, // 15 min
    };

    const r = await fetch(`${BASE}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        authorization: authz,
        "content-type": "application/json",
      },
      body: JSON.stringify(createBody),
    });

    const text = await r.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!r.ok) {
      return j(
        { ok: false, step: "pay", status: r.status, body: data ?? text },
        502
      );
    }

    // Expect: { redirectUrl, orderId, ...}
    const url = data?.redirectUrl || data?.data?.redirectUrl;
    if (!url) {
      return j(
        { ok: false, step: "pay", status: r.status, body: data, error: "PhonePe pay response missing redirectUrl" },
        502
      );
    }

    return j({ ok: true, url, orderId });
  } catch (err: any) {
    return j({ ok: false, step: "exception", error: String(err?.message || err) }, 500);
  }
}
