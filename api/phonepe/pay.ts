/* /api/phonepe/pay.ts — Vercel Edge Function */
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
    return { raw, json: null as any };
  }
}

async function getBearerToken(env: Env) {
  const BASE = need(env, "PHONEPE_BASE_URL");
  const CLIENT_ID = need(env, "PHONEPE_CLIENT_ID");
  const CLIENT_SECRET = need(env, "PHONEPE_CLIENT_SECRET");
  const CLIENT_VERSION = need(env, "PHONEPE_CLIENT_VERSION");

  const url = `${BASE}/v1/oauth/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-CLIENT-ID": CLIENT_ID,
      "X-CLIENT-SECRET": CLIENT_SECRET,
      "X-CLIENT-VERSION": CLIENT_VERSION,
    },
    body: JSON.stringify({ grantType: "CLIENT_CREDENTIALS" }),
  });

  const { raw, json } = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      `Auth failed [${res.status}]. ${json?.error || json?.message || raw}`
    );
  }

  // Try a few common shapes (PhonePe docs/examples vary)
  const token =
    json?.accessToken ||
    json?.data?.accessToken ||
    json?.response?.accessToken;
  if (!token) {
    throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  }
  return token as string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { "content-type": "application/json" } }
    );
  }

  const env = process.env as Env;

  try {
    const MERCHANT_ID = need(env, "PHONEPE_MERCHANT_ID");
    const BASE = need(env, "PHONEPE_BASE_URL");

    // Body: { amount (rupees), customerPhone, merchantTransactionId, successUrl, failedUrl }
    const body = await req.json().catch(() => ({} as any));
    const rupees = Number(body?.amount ?? 0);
    const paise = Math.round(rupees * 100);
    const customerPhone = String(body?.customerPhone || "").trim();
    const merchantTransactionId = String(body?.merchantTransactionId || "").trim();
    const successUrl = String(body?.successUrl || "").trim();
    const failedUrl = String(body?.failedUrl || "").trim();

    if (!paise || paise <= 0)
      return new Response(
        JSON.stringify({ ok: false, step: "validate", error: "Invalid amount" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    if (!merchantTransactionId)
      return new Response(
        JSON.stringify({
          ok: false,
          step: "validate",
          error: "Missing merchantTransactionId",
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );

    // 1) Get OAuth token
    const token = await getBearerToken(env);

    // 2) Create a Standard Checkout payment (Pay Page)
    const payUrl = `${BASE}/checkout/v2/pay`;
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: customerPhone || "guest",
      amount: paise, // paise
      redirectUrl: successUrl || failedUrl || "https://example.com/",
      redirectMode: "REDIRECT",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const res = await fetch(payUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const { raw, json } = await readJsonSafe(res);

    // A successful response should contain a URL to redirect the user
    const redirectUrl =
      json?.data?.instrumentResponse?.redirectInfo?.url ||
      json?.instrumentResponse?.redirectInfo?.url ||
      json?.redirectInfo?.url ||
      json?.url;

    if (!res.ok || !redirectUrl) {
      const errMsg =
        json?.error ||
        json?.message ||
        json?.responseMessage ||
        "Create payment failed";
      return new Response(
        JSON.stringify({
          ok: false,
          step: "createPayment",
          status: res.status,
          error: errMsg,
          raw,
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, url: redirectUrl }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        step: "exception",
        error: e?.message || String(e),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
