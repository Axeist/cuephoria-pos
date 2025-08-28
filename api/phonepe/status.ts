// /api/phonepe/status.ts
// Next.js App Router (Edge) – PhonePe: order/transaction status lookup
//
// Accepts GET query params:
//   ?merchantOrderId=...   OR   ?merchantTransactionId=...
//
// Returns the raw status JSON from PhonePe.

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
    "access-control-allow-methods": "GET,OPTIONS",
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

export async function GET(req: Request) {
  try {
    const env: Env = {
      PHONEPE_BASE_URL: process.env.PHONEPE_BASE_URL,
      PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
      PHONEPE_CLIENT_ID: process.env.PHONEPE_CLIENT_ID,
      PHONEPE_CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION,
      PHONEPE_CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET,
    };

    const BASE = need(env, "PHONEPE_BASE_URL");
    const MID  = need(env, "PHONEPE_MERCHANT_ID");

    const { searchParams } = new URL(req.url);
    const merchantOrderId = searchParams.get("merchantOrderId") || "";
    const merchantTransactionId = searchParams.get("merchantTransactionId") || "";

    if (!merchantOrderId && !merchantTransactionId) {
      return Response.json(
        { ok: false, error: "Missing query param: merchantOrderId (or merchantTransactionId)" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const bearer = await getBearerToken(env);

    // Prefer the documented Order Status endpoint
    let url = "";
    if (merchantOrderId) {
      url = `${BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`;
    } else {
      // Fallback: some UATs allow txn status by txn-id under /checkout/v2/merchant-transaction/{id}
      url = `${BASE}/checkout/v2/merchant-transaction/${encodeURIComponent(merchantTransactionId)}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${bearer}`,
        "x-merchant-id": MID,
      },
    });

    const raw = await res.text();
    let json: any = null;
    try { json = JSON.parse(raw); } catch {}

    if (!res.ok) {
      return Response.json(
        { ok: false, error: "PhonePe status failed", status: res.status, raw },
        { status: 502, headers: corsHeaders() }
      );
    }

    return Response.json({ ok: true, status: json }, { headers: corsHeaders() });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: `Could not fetch PhonePe status (exception). ${err?.message || err}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}
