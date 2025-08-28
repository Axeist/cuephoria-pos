// /api/phonepe/status.ts
export const runtime = "edge";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function fetchOAuth() {
  const authBase = env("PHONEPE_AUTH_BASE_URL");
  const clientId = env("PHONEPE_CLIENT_ID");
  const clientSecret = env("PHONEPE_CLIENT_SECRET");
  const clientVersion = env("PHONEPE_CLIENT_VERSION");

  const res = await fetch(`${authBase}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientId,
      clientSecret,
      clientVersion: Number(clientVersion),
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, body: json };

  const token = json.access_token || json.encrypted_access_token;
  const type  = json.token_type || "O-Bearer";
  if (!token) return { ok: false, status: 500, body: json, note: "No access_token" };
  return { ok: true, token, type };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const merchantOrderId = url.searchParams.get("merchantOrderId");
  const merchantTransactionId = url.searchParams.get("merchantTransactionId");

  if (!merchantOrderId && !merchantTransactionId) {
    return new Response(JSON.stringify({ ok: false, error: "Missing merchantOrderId (or merchantTransactionId)" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const oauth = await fetchOAuth();
  if (!oauth.ok) {
    return new Response(JSON.stringify({ ok: false, step: "oauth", ...oauth }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const pgBase = env("PHONEPE_PG_BASE_URL");
  const mid    = env("PHONEPE_MERCHANT_ID");

  // Docs: GET /checkout/v2/order/{merchantOrderId}/status
  const statusUrl = merchantOrderId
    ? `${pgBase}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?merchantId=${encodeURIComponent(mid)}`
    : `${pgBase}/checkout/v2/order/${encodeURIComponent(merchantTransactionId!)}/status?merchantId=${encodeURIComponent(mid)}`;

  const res = await fetch(statusUrl, {
    method: "GET",
    headers: { "authorization": `${oauth.type} ${oauth.token}` },
  });

  const txt = await res.text();
  let json: any;
  try { json = JSON.parse(txt); } catch { json = { raw: txt }; }

  if (!res.ok) {
    return new Response(JSON.stringify({ ok: false, step: "status", status: res.status, body: json }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  // Use root-level "state": COMPLETED | FAILED | PENDING
  const state = json.state || json.data?.state || "UNKNOWN";
  return new Response(JSON.stringify({ ok: true, state, raw: json }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
