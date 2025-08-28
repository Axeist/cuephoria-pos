/* /api/phonepe/status.ts — Vercel Edge Function */
export const config = { runtime: "edge" };

type Env = {
  PHONEPE_BASE_URL?: string;
  PHONEPE_MERCHANT_ID?: string;
  PHONEPE_CLIENT_ID?: string;
  PHONEPE_CLIENT_VERSION?: string;
  PHONEPE_CLIENT_SECRET?: string;
};

function need(env: Env, key: keyof Env) {
  const v = env[key];
  if (!v || !v.trim()) throw new Error(`Missing env: ${key}`);
  return v.trim();
}

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  try {
    return { raw, json: JSON.parse(raw) as any };
  } catch {
    return { raw, json: null };
  }
}

async function getBearerToken(env: Env) {
  const BASE = need(env, "PHONEPE_BASE_URL");
  const CLIENT_ID = need(env, "PHONEPE_CLIENT_ID");
  const CLIENT_SECRET = need(env, "PHONEPE_CLIENT_SECRET");
  const CLIENT_VERSION = need(env, "PHONEPE_CLIENT_VERSION");

  const url = `${BASE}/v1/oauth/token`;

  let res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-CLIENT-ID": CLIENT_ID,
      "X-CLIENT-SECRET": CLIENT_SECRET,
      "X-CLIENT-VERSION": CLIENT_VERSION,
    },
    body: JSON.stringify({ grantType: "CLIENT_CREDENTIALS" }),
  });

  if (res.status === 415) {
    const form = new URLSearchParams();
    form.set("grant_type", "CLIENT_CREDENTIALS");
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "X-CLIENT-ID": CLIENT_ID,
        "X-CLIENT-SECRET": CLIENT_SECRET,
        "X-CLIENT-VERSION": CLIENT_VERSION,
      },
      body: form.toString(),
    });
  }

  const { raw, json } = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Auth failed [${res.status}]. ${json?.error || json?.message || raw}`);
  }

  const token =
    json?.accessToken ||
    json?.data?.accessToken ||
    json?.response?.accessToken;

  if (!token) {
    throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  }
  return token;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const env = process.env as Env;

  try {
    const BASE = need(env, "PHONEPE_BASE_URL");
    const MERCHANT_ID = need(env, "PHONEPE_MERCHANT_ID");

    const urlObj = new URL(req.url);
    const merchantOrderId =
      urlObj.searchParams.get("merchantOrderId") ||
      urlObj.searchParams.get("merchantTransactionId");

    if (!merchantOrderId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing query param: merchantOrderId (or merchantTransactionId)",
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const token = await getBearerToken(env);

    const statusUrl = `${BASE}/checkout/v2/order/${encodeURIComponent(
      merchantOrderId
    )}/status`;

    const res = await fetch(statusUrl, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "x-merchant-id": MERCHANT_ID,
      },
    });

    const { raw, json } = await readJsonSafe(res);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: res.status,
          error: json?.error || json?.message || "Status check failed",
          raw,
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        orderId: json?.data?.merchantOrderId ?? json?.merchantOrderId ?? merchantOrderId,
        transactionId:
          json?.data?.merchantTransactionId ?? json?.merchantTransactionId ?? null,
        code: json?.code ?? json?.status ?? null,
        message: json?.message ?? json?.responseMessage ?? null,
        raw: json ?? raw,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
