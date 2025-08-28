// /api/phonepe/pay.ts
export const runtime = "edge";

type Json = Record<string, unknown>;

function need(name: string, value?: string | null) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function inrToPaise(amountRupees: number) {
  return Math.round(amountRupees * 100);
}

function genOrderId() {
  // unique merchant order id
  return `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// simple in-memory token cache (per-edge-region)
let cachedToken: { token: string; exp: number } | null = null;

async function getOAuthToken(): Promise<string> {
  const AUTH_BASE = need("PHONEPE_AUTH_BASE", process.env.PHONEPE_AUTH_BASE);
  const CLIENT_ID = need("PHONEPE_CLIENT_ID", process.env.PHONEPE_CLIENT_ID);
  const CLIENT_SECRET = need("PHONEPE_CLIENT_SECRET", process.env.PHONEPE_CLIENT_SECRET);
  const CLIENT_VERSION = need("PHONEPE_CLIENT_VERSION", process.env.PHONEPE_CLIENT_VERSION);

  // reuse valid token
  if (cachedToken && Date.now() < cachedToken.exp - 30_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  // PhonePe’s OAuth expects these names exactly:
  body.set("client_id", CLIENT_ID);
  body.set("client_secret", CLIENT_SECRET);
  body.set("client_version", CLIENT_VERSION);

  const res = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* leave as string */ }

  if (!res.ok) {
    return Promise.reject(
      new Response(
        JSON.stringify({ ok: false, step: "oauth", status: res.status, body: data ?? text }),
        { status: 502, headers: { "content-type": "application/json" } }
      )
    );
  }

  const access = data?.access_token || data?.encrypted_access_token;
  const ttlSec: number = data?.expires_in ?? 3600;
  if (!access) {
    return Promise.reject(
      new Response(
        JSON.stringify({ ok: false, step: "oauth", status: 500, body: data }),
        { status: 502, headers: { "content-type": "application/json" } }
      )
    );
  }

  cachedToken = { token: access, exp: Date.now() + ttlSec * 1000 };
  return access;
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const {
      amount,            // rupees, number (e.g. 300)
      customerPhone,     // optional string
      merchantOrderId,   // optional: if you want to supply one; else we generate
    } = (await req.json().catch(() => ({}))) as {
      amount?: number;
      customerPhone?: string;
      merchantOrderId?: string;
    };

    const PG_BASE = need("PHONEPE_BASE_URL", process.env.PHONEPE_BASE_URL);
    const MERCHANT_ID = need("PHONEPE_MERCHANT_ID", process.env.PHONEPE_MERCHANT_ID);
    const SITE_URL = need("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid amount" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // build order id and success/failure return URL
    const orderId = merchantOrderId || genOrderId();
    const siteOrigin = new URL(SITE_URL).origin;
    const returnUrl = `${siteOrigin}/api/phonepe/return?order=${encodeURIComponent(orderId)}`;

    // 1) token
    const token = await getOAuthToken();

    // 2) create payment
    const payload: Json = {
      merchantOrderId: orderId,
      amount: inrToPaise(amount),
      expireAfter: 900, // 15 min
      paymentFlow: {
        type: "PG_CHECKOUT",
        redirectUrl: returnUrl, // PhonePe will send user here after result page
      },
      metaInfo: {
        ...(customerPhone ? { customerPhone } : {}),
      },
    };

    const createRes = await fetch(`${PG_BASE}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const createText = await createRes.text();
    let createData: any = null;
    try { createData = JSON.parse(createText); } catch { /* ignore */ }

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, step: "pay", status: createRes.status, body: createData ?? createText }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const redirectUrl = createData?.redirectUrl;
    if (!redirectUrl) {
      return new Response(
        JSON.stringify({ ok: false, step: "pay", status: 500, body: createData }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    // return the URL to the frontend; UI should `window.location.href = url`
    return new Response(JSON.stringify({ ok: true, url: redirectUrl, orderId }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
