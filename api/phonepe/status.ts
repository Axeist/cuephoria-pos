// /api/phonepe/status.ts
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
        headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,OPTIONS" },
      });
    }
    if (req.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const url = new URL(req.url);
    const merchantOrderId = url.searchParams.get("merchantOrderId");
    const merchantTransactionId =
      url.searchParams.get("merchantTransactionId") ||
      url.searchParams.get("merchantTxnId") ||
      merchantOrderId; // we used same value in pay.ts

    if (!merchantTransactionId && !merchantOrderId) {
      return json(
        { ok: false, error: "Missing query param: merchantOrderId (or merchantTransactionId)" },
        400
      );
    }

    const env: Env = {
      PHONEPE_BASE_URL: process.env.PHONEPE_BASE_URL,
      PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
      PHONEPE_CLIENT_ID: process.env.PHONEPE_CLIENT_ID,
      PHONEPE_CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION,
      PHONEPE_CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET,
    };

    const BASE = need(env, "PHONEPE_BASE_URL");
    const MID = need(env, "PHONEPE_MERCHANT_ID");
    const bearer = await getBearerToken(env);

    // Standard Checkout v2 status endpoint (Order status by OrderId)
    const idToQuery = merchantOrderId || merchantTransactionId!;
    const statusUrl = `${BASE}/checkout/v2/order/${encodeURIComponent(idToQuery)}/status`;

    const res = await fetch(statusUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${bearer}`,
      },
    });

    const raw = await res.text();
    let j: any = null;
    try { j = JSON.parse(raw); } catch {}

    if (!res.ok) {
      return json(
        { ok: false, error: j?.error || j?.message || raw || "Failed to fetch status", status: res.status },
        500
      );
    }

    // Try to normalize a status field
    const paymentStatus =
      j?.data?.state || j?.state || j?.status || j?.orderStatus || "UNKNOWN";

    return json({
      ok: true,
      status: paymentStatus,
      raw: j || raw,
      merchantId: MID,
      merchantOrderId: idToQuery,
    });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || String(err) }, 500);
  }
}
