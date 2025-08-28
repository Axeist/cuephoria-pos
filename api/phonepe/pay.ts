// /api/phonepe/pay.ts
// Runtime: Edge
export const config = { runtime: "edge" };

type Env = {
  PHONEPE_BASE_URL?: string;
  PHONEPE_MERCHANT_ID?: string;
  PHONEPE_CLIENT_ID?: string;
  PHONEPE_CLIENT_VERSION?: string;
  PHONEPE_CLIENT_SECRET?: string;
};

function need(env: Env, k: keyof Env): string {
  const v = env[k];
  if (!v || !`${v}`.trim()) throw new Error(`Missing env: ${k}`);
  return `${v}`.trim();
}

function json(body: any, init?: number | ResponseInit) {
  const initObj: ResponseInit =
    typeof init === "number" ? { status: init } : init || {};
  return new Response(JSON.stringify(body), {
    ...initObj,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(initObj.headers || {}),
    },
  });
}

async function readJSON<T = any>(req: Request): Promise<T> {
  try {
    const txt = await req.text();
    return txt ? JSON.parse(txt) : ({} as T);
  } catch {
    return {} as T;
  }
}

// ===== OAuth: send as x-www-form-urlencoded (per PhonePe spec) =====
async function getBearerToken(env: Env) {
  const BASE = need(env, "PHONEPE_BASE_URL");
  const CID = need(env, "PHONEPE_CLIENT_ID");
  const CVER = need(env, "PHONEPE_CLIENT_VERSION");
  const CSEC = need(env, "PHONEPE_CLIENT_SECRET");

  const url = `${BASE}/v1/oauth/token`;

  const form = new URLSearchParams();
  form.set("grant_type", "CLIENT_CREDENTIALS");
  form.set("client_id", CID);
  form.set("client_secret", CSEC);
  form.set("client_version", CVER);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: form.toString(),
  });

  const raw = await res.text();
  let jsonResp: any = null;
  try { jsonResp = JSON.parse(raw); } catch {}

  if (!res.ok) {
    throw new Error(
      `Auth failed [${res.status}]. ${jsonResp?.error || jsonResp?.message || raw}`
    );
  }

  const token =
    jsonResp?.accessToken ||
    jsonResp?.data?.accessToken ||
    jsonResp?.response?.accessToken;

  if (!token) {
    throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  }
  return token as string;
}

export default async function handler(req: Request) {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST,OPTIONS", "access-control-allow-headers": "content-type" },
      });
    }
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const env: Env = {
      PHONEPE_BASE_URL: process.env.PHONEPE_BASE_URL,
      PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
      PHONEPE_CLIENT_ID: process.env.PHONEPE_CLIENT_ID,
      PHONEPE_CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION,
      PHONEPE_CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET,
    };

    // Body from frontend
    const body = await readJSON<{
      amount: number; // rupees
      customerPhone: string;
      merchantTransactionId: string;
      successUrl: string;
      failedUrl: string;
    }>(req);

    const { amount, customerPhone, merchantTransactionId, successUrl, failedUrl } = body || ({} as any);
    if (!amount || amount <= 0) return json({ ok: false, step: "validate", error: "amount (INR) must be > 0" }, 400);
    if (!customerPhone) return json({ ok: false, step: "validate", error: "customerPhone is required" }, 400);
    if (!merchantTransactionId) return json({ ok: false, step: "validate", error: "merchantTransactionId is required" }, 400);
    if (!successUrl || !failedUrl) return json({ ok: false, step: "validate", error: "successUrl and failedUrl are required" }, 400);

    // Convert rupees to paise
    const amountPaise = Math.round(amount * 100);

    const BASE = need(env, "PHONEPE_BASE_URL");
    const MID = need(env, "PHONEPE_MERCHANT_ID");

    // 1) OAuth
    const bearer = await getBearerToken(env);

    // 2) Create Payment (Standard Checkout v2)
    const payUrl = `${BASE}/checkout/v2/pay`;
    const payload = {
      merchantId: MID,
      merchantOrderId: merchantTransactionId,         // using txnId as order id
      merchantTransactionId,                          // also send txn id
      merchantUserId: customerPhone,                  // tie to user
      amount: amountPaise,                            // paise
      currency: "INR",
      callbackUrl: successUrl,                        // PhonePe will redirect after payment
      deviceContext: { deviceOS: "WEB" },
      paymentInstrument: { type: "PAY_PAGE" },
      redirectUrl: successUrl,                        // some docs use redirectUrl
      redirectMode: "POST",                           // or GET; UAT usually allows POST/GET
      failureUrl: failedUrl,
    };

    const res = await fetch(payUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let j: any = null;
    try { j = JSON.parse(raw); } catch {}

    if (!res.ok) {
      return json(
        {
          ok: false,
          step: "createPayment",
          status: res.status,
          error: j?.error || j?.message || raw || "Failed to create payment",
        },
        500
      );
    }

    // Standard Checkout usually returns a hosted page URL
    const hostedUrl =
      j?.data?.instrumentResponse?.redirectInfo?.url ||
      j?.instrumentResponse?.redirectInfo?.url ||
      j?.data?.redirectUrl ||
      j?.redirectUrl ||
      j?.url;

    if (!hostedUrl) {
      return json(
        {
          ok: false,
          step: "createPayment",
          error: "No hosted payment URL returned by PhonePe",
          raw: j || raw,
        },
        500
      );
    }

    return json({ ok: true, url: hostedUrl });
  } catch (err: any) {
    return json(
      { ok: false, step: "exception", error: err?.message || String(err) },
      500
    );
  }
}
