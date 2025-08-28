/* /api/phonepe/pay.ts — Edge */
export const config = { runtime: "edge" };

type Env = {
  PHONEPE_BASE_URL?: string;        // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
  PHONEPE_MERCHANT_ID?: string;     // e.g. M236V4PJIYABI (or your prod MID)
  PHONEPE_CLIENT_ID?: string;       // TEST-... from dashboard
  PHONEPE_CLIENT_VERSION?: string;  // usually "1"
  PHONEPE_CLIENT_SECRET?: string;   // long secret from dashboard
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

/** Always do OAuth using x-www-form-urlencoded to avoid 415 across variants */
async function getBearerToken(env: Env) {
  const BASE   = need(env, "PHONEPE_BASE_URL");
  const CID    = need(env, "PHONEPE_CLIENT_ID");
  const CVER   = need(env, "PHONEPE_CLIENT_VERSION");
  const CSEC   = need(env, "PHONEPE_CLIENT_SECRET");

  const url = `${BASE}/v1/oauth/token`;

  const form = new URLSearchParams();
  form.set("grant_type", "CLIENT_CREDENTIALS");

  const headers: Record<string,string> = {
    "content-type": "application/x-www-form-urlencoded",
    "accept": "application/json",
    // both casings to be safe with gateway variants:
    "X-CLIENT-ID": CID,
    "X-CLIENT-SECRET": CSEC,
    "X-CLIENT-VERSION": CVER,
    "x-client-id": CID,
    "x-client-secret": CSEC,
    "x-client-version": CVER,
  };

  const res = await fetch(url, { method: "POST", headers, body: form.toString() });
  const { raw, json } = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(`Auth failed [${res.status}]. ${json?.error || json?.message || raw}`);
  }

  const token =
    json?.accessToken ||
    json?.data?.accessToken ||
    json?.response?.accessToken;

  if (!token) throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  return token as string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: { "content-type": "application/json" },
    });
  }

  const env = process.env as Env;

  try {
    const BASE = need(env, "PHONEPE_BASE_URL");
    const MID  = need(env, "PHONEPE_MERCHANT_ID");

    const body = await req.json().catch(() => ({} as any));
    const rupees = Number(body?.amount ?? 0);
    const paise  = Math.round(rupees * 100);
    const customerPhone        = String(body?.customerPhone || "").trim();
    const merchantTransactionId= String(body?.merchantTransactionId || "").trim();
    const successUrl           = String(body?.successUrl || "").trim();
    const failedUrl            = String(body?.failedUrl || "").trim();

    if (!paise || paise <= 0) {
      return new Response(JSON.stringify({ ok:false, step:"validate", error:"Invalid amount" }), {
        status:400, headers:{ "content-type":"application/json" }
      });
    }
    if (!merchantTransactionId) {
      return new Response(JSON.stringify({ ok:false, step:"validate", error:"Missing merchantTransactionId" }), {
        status:400, headers:{ "content-type":"application/json" }
      });
    }

    // 1) OAuth
    const token = await getBearerToken(env);

    // 2) Create payment
    const payUrl = `${BASE}/checkout/v2/pay`;
    const payload = {
      merchantId: MID,
      merchantTransactionId,
      merchantUserId: customerPhone || "guest",
      amount: paise,
      redirectUrl: successUrl || failedUrl || "https://example.com/",
      redirectMode: "REDIRECT",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const res = await fetch(payUrl, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const { raw, json } = await readJsonSafe(res);

    const redirectUrl =
      json?.data?.instrumentResponse?.redirectInfo?.url ||
      json?.instrumentResponse?.redirectInfo?.url ||
      json?.redirectInfo?.url ||
      json?.url;

    if (!res.ok || !redirectUrl) {
      return new Response(JSON.stringify({
        ok: false,
        step: "createPayment",
        status: res.status,
        error: json?.error || json?.message || "Create payment failed",
        raw,
      }), { status: 500, headers: { "content-type": "application/json" }});
    }

    return new Response(JSON.stringify({ ok: true, url: redirectUrl }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, step:"exception", error: e?.message || String(e) }), {
      status:500, headers:{ "content-type":"application/json" }
    });
  }
}
