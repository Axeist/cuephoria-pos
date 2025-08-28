// /api/phonepe/status.ts
export const runtime = "edge";

function need(name: string, value?: string | null) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}
let cachedToken: { token: string; exp: number } | null = null;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort("timeout"), ms);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(id); }
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
  }, 12_000);

  const text = await res.text(); let data: any = null; try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    return Promise.reject(
      new Response(JSON.stringify({ ok: false, step: "oauth", status: res.status, body: data ?? text }), {
        status: 502, headers: { "content-type": "application/json" },
      })
    );
  }
  const token = data?.access_token || data?.encrypted_access_token;
  const ttl = data?.expires_in ?? 3600;
  if (!token) {
    return Promise.reject(
      new Response(JSON.stringify({ ok: false, step: "oauth", status: 500, body: data }), {
        status: 502, headers: { "content-type": "application/json" },
      })
    );
  }
  cachedToken = { token, exp: Date.now() + ttl * 1000 };
  return token;
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405, headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const orderId = url.searchParams.get("merchantOrderId") ||
                    url.searchParams.get("order") ||
                    url.searchParams.get("merchantTransactionId");
    if (!orderId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing merchantOrderId (or merchantTransactionId)" }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    const PG_BASE = need("PHONEPE_BASE_URL", process.env.PHONEPE_BASE_URL);
    const token = await getOAuthToken();

    const res = await fetchWithTimeout(
      `${PG_BASE}/checkout/v2/order/${encodeURIComponent(orderId)}/status`,
      { headers: { Authorization: `O-Bearer ${token}` } },
      12_000
    );

    const txt = await res.text(); let data: any = null; try { data = JSON.parse(txt); } catch {}
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, step: "status", status: res.status, body: data ?? txt }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    }

    const state = data?.state || data?.status || "UNKNOWN";
    return new Response(JSON.stringify({ ok: true, state, raw: data }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ ok: false, step: "exception", error: err?.message || String(err) }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
