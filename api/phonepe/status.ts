/* /api/phonepe/status.ts — Edge */
export const config = { runtime: "edge" };

type Env = {
  PHONEPE_BASE_URL?: string;
  PHONEPE_MERCHANT_ID?: string;
  PHONEPE_CLIENT_ID?: string;
  PHONEPE_CLIENT_VERSION?: string;
  PHONEPE_CLIENT_SECRET?: string;
};

function need(env: Env, k: keyof Env) {
  const v = env[k];
  if (!v || !v.trim()) throw new Error(`Missing env: ${k}`);
  return v.trim();
}

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  try { return { raw, json: JSON.parse(raw) }; } catch { return { raw, json: null }; }
}

async function getBearerToken(env: Env) {
  const BASE = need(env, "PHONEPE_BASE_URL");
  const CID  = need(env, "PHONEPE_CLIENT_ID");
  const CVER = need(env, "PHONEPE_CLIENT_VERSION");
  const CSEC = need(env, "PHONEPE_CLIENT_SECRET");

  const url = `${BASE}/v1/oauth/token`;

  const form = new URLSearchParams();
  form.set("grant_type", "CLIENT_CREDENTIALS");

  const headers: Record<string,string> = {
    "content-type": "application/x-www-form-urlencoded",
    "accept": "application/json",
    "X-CLIENT-ID": CID, "x-client-id": CID,
    "X-CLIENT-SECRET": CSEC, "x-client-secret": CSEC,
    "X-CLIENT-VERSION": CVER, "x-client-version": CVER,
  };

  const res = await fetch(url, { method: "POST", headers, body: form.toString() });
  const { raw, json } = await readJsonSafe(res);

  if (!res.ok) throw new Error(`Auth failed [${res.status}]. ${json?.error || json?.message || raw}`);

  const token =
    json?.accessToken ||
    json?.data?.accessToken ||
    json?.response?.accessToken;

  if (!token) throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  return token as string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: { "content-type": "application/json" },
    });
  }

  const env = process.env as Env;

  try {
    const BASE = need(env, "PHONEPE_BASE_URL");
    const MID  = need(env, "PHONEPE_MERCHANT_ID");

    const url = new URL(req.url);
    const merchantOrderId =
      url.searchParams.get("merchantOrderId") ||
      url.searchParams.get("merchantTransactionId");

    if (!merchantOrderId) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing query param: merchantOrderId (or merchantTransactionId)",
      }), { status: 400, headers: { "content-type": "application/json" }});
    }

    const token = await getBearerToken(env);

    const statusUrl = `${BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`;
    const res = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${token}`,
        "x-merchant-id": MID,
        "accept": "application/json",
      },
    });

    const { raw, json } = await readJsonSafe(res);

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        status: res.status,
        error: json?.error || json?.message || "Status check failed",
        raw,
      }), { status: 500, headers: { "content-type": "application/json" }});
    }

    return new Response(JSON.stringify({
      ok: true,
      orderId: json?.data?.merchantOrderId ?? json?.merchantOrderId ?? merchantOrderId,
      transactionId: json?.data?.merchantTransactionId ?? json?.merchantTransactionId ?? null,
      code: json?.code ?? json?.status ?? null,
      message: json?.message ?? json?.responseMessage ?? null,
      raw: json ?? raw,
    }), { status: 200, headers: { "content-type": "application/json" }});
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || String(e) }), {
      status:500, headers:{ "content-type":"application/json" }
    });
  }
}
