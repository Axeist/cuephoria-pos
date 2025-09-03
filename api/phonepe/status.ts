export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
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
  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const BASE = need("PHONEPE_BASE_URL");
    const url = new URL(req.url);
    
    const merchantOrderId = url.searchParams.get("merchantOrderId") ||
      url.searchParams.get("merchantTransactionId") ||
      url.searchParams.get("order");

    console.log("🔍 Status check requested for order:", merchantOrderId);

    if (!merchantOrderId) {
      return j(
        { ok: false, error: "Missing merchantOrderId (or merchantTransactionId/order)" },
        400
      );
    }

    const { authz } = await oauthToken();

    const r = await fetch(
      `${BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
      { headers: { authorization: authz } }
    );

    const text = await r.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    console.log("📊 Status response:", { status: r.status, orderId: merchantOrderId });

    if (!r.ok) {
      console.error("❌ Status check failed:", data);
      return j({ ok: false, status: r.status, body: data ?? text }, 502);
    }

    const state = data?.state || data?.data?.state || data?.payload?.state || "UNKNOWN";
    const code = data?.code || data?.data?.code || data?.payload?.code || null;
    const paymentInstrument = data?.paymentInstrument || data?.data?.paymentInstrument || data?.payload?.paymentInstrument || null;

    console.log(`✅ Status retrieved: ${state} for order: ${merchantOrderId}`);

    return j({ ok: true, state, code, paymentInstrument, raw: data });

  } catch (err: any) {
    console.error("❌ Status check error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}
