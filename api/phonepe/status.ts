// /api/phonepe/status.ts
export const runtime = "edge";

// same small helpers (duplicated for clarity/single-file paste)
function need(name: string, value?: string | null) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getOAuthToken(): Promise<string> {
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

  const res = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {}

  if (!res.ok) {
    return Promise.reject(
      new Response(JSON.stringify({ ok: false, step: "oauth", status: res.status, body: data ?? text }), {
        status: 502, headers: { "content-type": "application/json" },
      })
    );
  }

  const access = data?.access_token || data?.encrypted_access_token;
  const ttlSec: number = data?.expires_in ?? 3600;
  if (!access) {
    return Promise.reject(
      new Response(JSON.stringify({ ok: false, step: "oauth", status: 500, body: data }), {
        status: 502, headers: { "content-type": "application/json" },
      })
    );
  }

  cachedToken = { token: access, exp: Date.now() + ttlSec * 1000 };
  return access;
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405, headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const orderId =
      url.searchParams.get("merchantOrderId") ||
      url.searchParams.get("order") ||
      url.searchParams.get("merchantTransactionId"); // fallback

    if (!orderId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing merchantOrderId (or merchantTransactionId)" }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    const PG_BASE = need("PHONEPE_BASE_URL", process.env.PHONEPE_BASE_URL);
    const token = await getOAuthToken();

    const resStatus = await fetch(
      `${PG_BASE}/checkout/v2/order/${encodeURIComponent(orderId)}/status`,
      { headers: { Authorization: `O-Bearer ${token}` } }
    );

    const text = await resStatus.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch {}

    if (!resStatus.ok) {
      return new Response(JSON.stringify({ ok: false, step: "status", status: resStatus.status, body: data ?? text }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    }

    // phonepe uses root-level "state": COMPLETED | FAILED | PENDING
    const state = data?.state || data?.status || "UNKNOWN";
    return new Response(JSON.stringify({ ok: true, state, raw: data }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
