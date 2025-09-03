export const config = { runtime: "edge" };

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
  const AUTH_BASE = need("PHONEPE_AUTH_BASE");
  const CLIENT_ID = need("PHONEPE_CLIENT_ID");
  const CLIENT_SECRET = need("PHONEPE_CLIENT_SECRET");
  const CLIENT_VERSION = need("PHONEPE_CLIENT_VERSION");
  
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    client_version: CLIENT_VERSION,
  });

  console.log("Requesting OAuth token from:", `${AUTH_BASE}/v1/oauth/token`);

  const r = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch {}

  console.log("OAuth response:", { status: r.status, data });

  if (!r.ok) {
    throw new Error(`oauth ${r.status}: ${typeof data === "object" ? JSON.stringify(data) : text}`);
  }

  const token = data?.access_token || data?.encrypted_access_token;
  const type = data?.token_type || "O-Bearer";
  if (!token) throw new Error(`oauth OK but no token in response: ${text}`);
  
  return { authz: `${type} ${token}` };
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const BASE = need("PHONEPE_BASE_URL");
    const MERCHANT_ID = need("PHONEPE_MERCHANT_ID");
    const SITE_URL = need("NEXT_PUBLIC_SITE_URL");
    
    const payload = await req.json().catch(() => ({} as any));
    const { amount, customerPhone, merchantTransactionId } = payload || {};

    console.log("Payment request received:", { amount, customerPhone, merchantTransactionId });

    if (!amount || Number(amount) <= 0) {
      return j({ ok: false, step: "validate", error: "Amount must be > 0" }, 400);
    }

    const orderId = merchantTransactionId || `CUE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const successRedirect = `${SITE_URL}/api/phonepe/return?status=success&order=${encodeURIComponent(orderId)}`;
    const failedRedirect = `${SITE_URL}/api/phonepe/return?status=failed&order=${encodeURIComponent(orderId)}`;

    console.log("Redirect URLs:", { successRedirect, failedRedirect });

    // 1) OAuth
    const { authz } = await oauthToken();
    console.log("OAuth successful, got authorization");

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

    console.log("Creating payment with body:", JSON.stringify(createBody, null, 2));

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

    console.log("PhonePe pay response:", { status: r.status, data });

    if (!r.ok) {
      return j(
        { ok: false, step: "pay", status: r.status, body: data ?? text, error: "Payment creation failed" },
        502
      );
    }

    const url = data?.redirectUrl || data?.data?.redirectUrl;
    if (!url) {
      return j(
        { ok: false, step: "pay", status: r.status, body: data, error: "PhonePe pay response missing redirectUrl" },
        502
      );
    }

    console.log("Payment created successfully, redirect URL:", url);
    return j({ ok: true, url, orderId });

  } catch (err: any) {
    console.error("Payment creation error:", err);
    return j({ ok: false, step: "exception", error: String(err?.message || err) }, 500);
  }
}
