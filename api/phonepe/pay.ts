// /api/phonepe/pay.ts
export const runtime = "edge";

type Json = Record<string, unknown>;

function need(name: string, value?: string | null) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}
function inrToPaise(r: number) { return Math.round(r * 100); }
function genOrderId() {
  return `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// region-local token cache
let cachedToken: { token: string; exp: number } | null = null;

// simple fetch with timeout
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort("timeout"), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getOAuthToken() {
  const AUTH_BASE = need("PHONEPE_AUTH_BASE", process.env.PHONEPE_AUTH_BASE);
  const CLIENT_ID = need("PHONEPE_CLIENT_ID", process.env.PHONEPE_CLIENT_ID);
  const CLIENT_SECRET = need("PHONEPE_CLIENT_SECRET", process.env.PHONEPE_CLIENT_SECRET);
  const CLIENT_VERSION = need("PHONEPE_CLIENT_VERSION", process.env.PHONEPE_CLIENT_VERSION);

  if (cachedToken && Date.now() < cachedToken.exp - 30_000) return cachedToken.token;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", CLIENT_ID);
  body.set("client_secret", CLIENT_SECRET);
  body.set("client_version", CLIENT_VERSION);

  const res = await fetchWithTimeout(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  }, 12_000).catch((e) => {
    throw new Response(JSON.stringify({ ok: false, step: "oauth-timeout", error: String(e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  });

  const text = await res.text();
  let data: any = null; try { data = JSON.parse(text); } catch {}

  if (!res.ok) {
    throw new Response(JSON.stringify({ ok: false, step: "oauth", status: res.status, body: data ?? text }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }

  const token = data?.access_token || data?.encrypted_access_token;
  const ttl = data?.expires_in ?? 3600;
  if (!token) {
    throw new Response(JSON.stringify({ ok: false, step: "oauth", status: 500, body: data }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
  cachedToken = { token, exp: Date.now() + ttl * 1000 };
  return token;
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405, headers: { "content-type": "application/json" },
      });
    }

    // Parse body
    const { amount, customerPhone, merchantOrderId } = await req.json().catch(() => ({})) as {
      amount?: number; customerPhone?: string; merchantOrderId?: string;
    };

    const PG_BASE = need("PHONEPE_BASE_URL", process.env.PHONEPE_BASE_URL);
    const MERCHANT_ID = need("PHONEPE_MERCHANT_ID", process.env.PHONEPE_MERCHANT_ID);
    const SITE_URL = need("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid amount" }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    const orderId = merchantOrderId || genOrderId();
    const origin = new URL(SITE_URL).origin;
    const returnUrl = `${origin}/api/phonepe/return?order=${encodeURIComponent(orderId)}`;

    // 1) OAuth
    const token = await getOAuthToken();

    // 2) Create Payment
    const payload: Json = {
      merchantOrderId: orderId,
      amount: inrToPaise(amount),
      expireAfter: 900,
      paymentFlow: { type: "PG_CHECKOUT", redirectUrl: returnUrl },
      metaInfo: { ...(customerPhone ? { customerPhone } : {}) },
    };

    const payRes = await fetchWithTimeout(`${PG_BASE}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }, 12_000).catch((e) => {
      throw new Response(JSON.stringify({ ok: false, step: "pay-timeout", error: String(e) }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    });

    const payText = await payRes.text();
    let payData: any = null; try { payData = JSON.parse(payText); } catch {}

    if (!payRes.ok) {
      return new Response(JSON.stringify({ ok: false, step: "pay", status: payRes.status, body: payData ?? payText }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    }

    const redirectUrl = payData?.redirectUrl;
    if (!redirectUrl) {
      return new Response(JSON.stringify({ ok: false, step: "pay", status: 500, body: payData }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, url: redirectUrl, orderId }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ ok: false, step: "exception", error: err?.message || String(err) }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
