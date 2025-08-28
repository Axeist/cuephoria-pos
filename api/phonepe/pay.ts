// /api/phonepe/pay.ts
export const runtime = "edge";

type PayReq = {
  amount: number;                    // rupees
  customerPhone?: string;
  merchantTransactionId?: string;    // optional: you can pass one in
  successUrl: string;
  failedUrl: string;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function fetchOAuth() {
  const authBase = env("PHONEPE_AUTH_BASE_URL");
  const clientId = env("PHONEPE_CLIENT_ID");
  const clientSecret = env("PHONEPE_CLIENT_SECRET");
  const clientVersion = env("PHONEPE_CLIENT_VERSION");

  const url = `${authBase}/v1/oauth/token`;
  const body = JSON.stringify({
    clientId,
    clientSecret,
    clientVersion: Number(clientVersion),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

  const txt = await res.text();
  let json: any;
  try { json = JSON.parse(txt); } catch { json = { raw: txt }; }

  if (!res.ok) {
    return { ok: false, status: res.status, body: json };
  }

  // PhonePe returns token_type: "O-Bearer" and access_token (or encrypted_access_token)
  const token = json.access_token || json.encrypted_access_token;
  const type  = json.token_type || "O-Bearer";
  if (!token) {
    return { ok: false, status: 500, body: json, note: "No access_token" };
  }
  return { ok: true, token, type };
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: PayReq;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { amount, customerPhone, merchantTransactionId, successUrl, failedUrl } = payload;
  if (!amount || !successUrl || !failedUrl) {
    return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // 1) OAuth
  const oauth = await fetchOAuth();
  if (!oauth.ok) {
    return new Response(JSON.stringify({ ok: false, step: "oauth", ...oauth }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const pgBase = env("PHONEPE_PG_BASE_URL");
  const mid    = env("PHONEPE_MERCHANT_ID");

  // Use your own order/transaction id, or accept one from client
  const merchantOrderId = merchantTransactionId || `CUE-${Date.now()}`;

  // Build the Standard Checkout request
  // Docs: /checkout/v2/pay
  const payUrl = `${pgBase}/checkout/v2/pay`;
  const amountPaise = Math.round(amount * 100);

  const body = {
    merchantId: mid,
    merchantOrderId,
    amount: amountPaise,
    expireAfter: 1200, // 20 minutes (customize)
    metaInfo: {},

    paymentFlow: {
      type: "PG_CHECKOUT",
      redirectUrl: successUrl,  // PhonePe will redirect back here
      // If you want a separate failure URL, keep successUrl and identify by status later,
      // or include your own 'state' param in successUrl to distinguish.
    },

    // Optional: contact
    deviceContext: {
      phoneNumber: customerPhone || undefined,
    },
  };

  const res = await fetch(payUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `${oauth.type} ${oauth.token}`,
    },
    body: JSON.stringify(body),
  });

  const txt = await res.text();
  let json: any;
  try { json = JSON.parse(txt); } catch { json = { raw: txt }; }

  if (!res.ok) {
    return new Response(JSON.stringify({ ok: false, step: "pay", status: res.status, body: json }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  // Expect redirectUrl from PhonePe
  const redirectUrl: string | undefined = json.redirectUrl || json.data?.redirectUrl;
  if (!redirectUrl) {
    return new Response(JSON.stringify({ ok: false, step: "pay", status: 500, body: json, error: "Missing redirectUrl" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, url: redirectUrl, merchantOrderId }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
