// /api/phonepe/pay.ts
// Next.js App Router (Edge) – PhonePe: create payment (Standard Checkout)
//
// Expects POST JSON:
// {
//   amount: number,                // rupees (e.g., 299). We'll convert to paise.
//   customerPhone: string,         // optional, used for prefill
//   merchantTransactionId: string, // required (unique)
//   successUrl: string,            // e.g., https://admin.cuephoria.in/public/booking?pp=success
//   failedUrl: string              // e.g., https://admin.cuephoria.in/public/booking?pp=failed
// }

export const runtime = "edge";

type Env = {
  PHONEPE_BASE_URL?: string;
  PHONEPE_MERCHANT_ID?: string;
  PHONEPE_CLIENT_ID?: string;
  PHONEPE_CLIENT_VERSION?: string;
  PHONEPE_CLIENT_SECRET?: string;
};

function need(env: Env, k: keyof Env): string {
  const v = env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

async function getBearerToken(env: Env) {
  const BASE = need(env, "PHONEPE_BASE_URL");
  const CID  = need(env, "PHONEPE_CLIENT_ID");
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
  let json: any = null;
  try { json = JSON.parse(raw); } catch {}

  if (!res.ok) {
    throw new Error(`Auth failed [${res.status}]. ${json?.error || json?.message || raw}`);
  }

  // IMPORTANT: UAT returns `access_token` (snake_case)
  const token =
    json?.access_token ||      // <= primary
    json?.accessToken ||
    json?.data?.accessToken ||
    json?.response?.accessToken;

  if (!token) {
    throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  }
  return token as string;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  try {
    const method = req.method.toUpperCase();
    if (method !== "POST") {
      return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
    }

    const env: Env = {
      PHONEPE_BASE_URL: process.env.PHONEPE_BASE_URL,
      PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
      PHONEPE_CLIENT_ID: process.env.PHONEPE_CLIENT_ID,
      PHONEPE_CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION,
      PHONEPE_CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET,
    };

    // Validate env early
    const BASE = need(env, "PHONEPE_BASE_URL");
    const MID  = need(env, "PHONEPE_MERCHANT_ID");

    const body = await req.json().catch(() => ({}));
    const amountRupees = Number(body?.amount ?? 0);
    const customerPhone = String(body?.customerPhone ?? "");
    const merchantTransactionId = String(body?.merchantTransactionId ?? "");
    const successUrl = String(body?.successUrl ?? "");
    const failedUrl  = String(body?.failedUrl ?? "");

    if (!merchantTransactionId) {
      return Response.json({ ok: false, error: "Missing merchantTransactionId" }, { status: 400, headers: corsHeaders() });
    }
    if (!amountRupees || amountRupees <= 0) {
      return Response.json({ ok: false, error: "Invalid amount" }, { status: 400, headers: corsHeaders() });
    }
    if (!successUrl || !failedUrl) {
      return Response.json({ ok: false, error: "Missing successUrl/failedUrl" }, { status: 400, headers: corsHeaders() });
    }

    const amountPaise = Math.round(amountRupees * 100);

    // 1) Get OAuth Bearer
    const bearer = await getBearerToken(env);

    // 2) Create Payment (Standard Checkout / Hosted)
    const url = `${BASE}/checkout/v2/pay`;

    // Payload fields follow PhonePe Standard Checkout (UAT):
    const payload: any = {
      merchantId: MID,
      merchantTransactionId,
      amount: amountPaise,
      instrumentType: "PAY_PAGE",
      // Redirect back to your booking page (PhonePe will append their params).
      redirectUrl: successUrl,
      redirectMode: "GET",
      // Meta is optional but helpful for prefill
      meta: {
        consumerMobileNumber: customerPhone || undefined,
        merchantOrderId: merchantTransactionId, // keep same as txn for UAT simplicity
      },
    };

    const payRes = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    });

    const payRaw = await payRes.text();
    let payJson: any = null;
    try { payJson = JSON.parse(payRaw); } catch {}

    if (!payRes.ok) {
      return Response.json(
        { ok: false, error: "PhonePe pay failed", status: payRes.status, raw: payRaw, step: "pay" },
        { status: 502, headers: corsHeaders() }
      );
    }

    // Extract hosted page URL robustly
    const redirectUrl =
      payJson?.data?.instrumentResponse?.redirectInfo?.url ||
      payJson?.instrumentResponse?.redirectInfo?.url ||
      payJson?.redirectInfo?.url ||
      payJson?.data?.url ||
      payJson?.url;

    if (!redirectUrl) {
      return Response.json(
        { ok: false, error: "No redirect URL in PhonePe response", raw: payJson, step: "pay" },
        { status: 502, headers: corsHeaders() }
      );
    }

    return Response.json({ ok: true, url: redirectUrl, step: "pay" }, { headers: corsHeaders() });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: `Could not start PhonePe payment (exception). ${err?.message || err}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}
