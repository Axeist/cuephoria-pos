export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Edge-safe env getter
function need(name: string) {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  const v = fromDeno ?? fromProcess;
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

  const r = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch {}

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

    const payload = await req.json().catch(() => ({} as any));
    const { amount = 100 } = payload; // Default to ₹1 for testing

    console.log("🧪 Test payment request:", { amount });

    const orderId = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Use debug return handler for testing
    const debugReturnEndpoint = "https://admin.cuephoria.in/api/phonepe/debug-return";
    const successRedirect = `${debugReturnEndpoint}?merchantTransactionId=${encodeURIComponent(orderId)}&status=success`;
    const failedRedirect = `${debugReturnEndpoint}?merchantTransactionId=${encodeURIComponent(orderId)}&status=failed`;

    console.log("🔗 Test redirect URLs:", { successRedirect, failedRedirect });

    // Get OAuth token
    const { authz } = await oauthToken();

    // Create payment request
    const createBody = {
      merchantId: MERCHANT_ID,
      merchantOrderId: orderId,
      amount: Math.round(Number(amount) * 100), // rupees -> paise
      paymentFlow: {
        type: "PG_CHECKOUT",
        redirectUrl: successRedirect,
        failureRedirectUrl: failedRedirect,
        cancelUrl: failedRedirect,
      },
      metaInfo: {
        customerPhone: "9999999999",
        returnUrl: successRedirect,
        cancelUrl: failedRedirect,
      },
      expireAfter: 900, // 15 min
    };

    console.log("📤 Creating test PhonePe payment for order:", orderId);
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

    console.log("📨 PhonePe test response:", { status: r.status, success: r.ok, data });

    if (!r.ok) {
      console.error("❌ Test payment creation failed:", data);
      return j({ 
        ok: false, 
        error: "Test payment creation failed", 
        details: data,
        rawResponse: text
      }, 502);
    }

    const url = data?.redirectUrl || data?.data?.redirectUrl;
    if (!url) {
      console.error("❌ Missing redirect URL in test response");
      return j({ 
        ok: false, 
        error: "Missing redirect URL", 
        response: data 
      }, 502);
    }

    console.log("✅ Test payment created successfully");
    return j({ 
      ok: true, 
      url, 
      orderId,
      debugInfo: {
        successRedirect,
        failedRedirect,
        createBody
      }
    });

  } catch (err: any) {
    console.error("💥 Test payment error:", err);
    return j({ 
      ok: false, 
      error: "Test payment failed", 
      details: err.message 
    }, 500);
  }
}
