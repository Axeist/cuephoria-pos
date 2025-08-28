// /api/phonepe/status.ts
export const runtime = 'edge';

const PG_BASE = process.env.PHONEPE_BASE_URL;
const AUTH_BASE = process.env.PHONEPE_AUTH_BASE || 'https://api.phonepe.com/apis/identity-manager';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_VER = process.env.PHONEPE_CLIENT_VERSION;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;

type Tok = { access_token: string; expires_at: number };
let TOK: Tok | null = null;

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function getAccessToken() {
  if (TOK && TOK.expires_at - 60 > nowSec()) return TOK.access_token;

  const r = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_version: CLIENT_VER,
      client_secret: CLIENT_SECRET,
    }),
  });

  const body = await r.json().catch(() => ({} as any));
  if (!r.ok) throw new Error(`oauth-failed [${r.status}]: ${JSON.stringify(body)}`);

  const token = body.access_token || body.encrypted_access_token || body.token || body.accessToken;
  const exp = body.expires_at || body.session_expires_at || (nowSec() + (body.expires_in || 3600));
  if (!token) throw new Error(`oauth-ok-but-no-token: ${JSON.stringify(body)}`);

  TOK = { access_token: token, expires_at: Number(exp) || nowSec() + 3600 };
  return TOK.access_token;
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    if (!PG_BASE || !MERCHANT_ID) return json({ ok: false, error: 'Missing PHONEPE_BASE_URL or PHONEPE_MERCHANT_ID' }, 500);

    const url = new URL(req.url);
    // accept either param name
    const id =
      url.searchParams.get('merchantOrderId') ||
      url.searchParams.get('merchantTransactionId') ||
      '';

    if (!id) return json({ ok: false, error: 'Missing merchantOrderId (or merchantTransactionId)' }, 400);

    const access = await getAccessToken();

    const resp = await fetch(`${PG_BASE}/checkout/v2/order/${encodeURIComponent(id)}/status`, {
      headers: { Authorization: `O-Bearer ${access}` },
    });

    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok) return json({ ok: false, status: resp.status, body: data }, 502);

    // Return minimally necessary fields
    return json({ ok: true, state: data?.state || data?.data?.state || 'UNKNOWN', raw: data });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
