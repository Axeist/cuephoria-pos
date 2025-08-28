// /api/phonepe/status.ts
export const runtime = 'edge';

/** ---------- Tiny in-memory OAuth cache (per edge instance) ---------- */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getEnv() {
  const BASE = process.env.PHONEPE_BASE_URL;
  const MID  = process.env.PHONEPE_MERCHANT_ID;
  const CID  = process.env.PHONEPE_CLIENT_ID;
  const CVER = process.env.PHONEPE_CLIENT_VERSION;
  const CSEC = process.env.PHONEPE_CLIENT_SECRET;

  const AUTH_BASE =
    process.env.PHONEPE_AUTH_BASE ||
    (BASE?.includes('api-preprod')
      ? 'https://api-preprod.phonepe.com/apis/identity-manager'
      : 'https://api.phonepe.com/apis/identity-manager');

  if (!BASE || !MID || !CID || !CVER || !CSEC) {
    return {
      ok: false as const,
      error: 'Missing environment variables',
      missing: {
        PHONEPE_BASE_URL: !BASE,
        PHONEPE_MERCHANT_ID: !MID,
        PHONEPE_CLIENT_ID: !CID,
        PHONEPE_CLIENT_VERSION: !CVER,
        PHONEPE_CLIENT_SECRET: !CSEC,
      },
    };
  }
  return { ok: true as const, BASE, MID, CID, CVER, CSEC, AUTH_BASE };
}

async function fetchOAuthToken(AUTH_BASE: string, CID: string, CVER: string, CSEC: string) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - now > 30) {
    return cachedToken.accessToken;
  }

  const url = `${AUTH_BASE}/v1/oauth/token`;
  const form = new URLSearchParams();
  form.set('client_id', CID);
  form.set('client_version', String(CVER));
  form.set('client_secret', CSEC);

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const text = await r.text();
  let j: any = null;
  try { j = JSON.parse(text); } catch {}

  if (!r.ok) {
    throw new Error(`oauth-failed [HTTP ${r.status}]. ${text}`);
  }

  const token = j?.access_token || j?.accessToken;
  const expiresAt = j?.expires_at || j?.expiresAt;
  const exp = typeof expiresAt === 'number' ? Number(expiresAt) : (now + 3000);

  if (!token) throw new Error(`oauth-bad-response: ${text}`);

  cachedToken = { accessToken: token, expiresAt: exp };
  return token;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const env = await getEnv();
  if (!env.ok) {
    return json(500, { step: 'env', ok: false, ...env });
  }
  const { BASE, CID, CVER, CSEC, AUTH_BASE } = env;

  const urlObj = new URL(req.url);
  // Accept either ?merchantOrderId=... or ?merchantTransactionId=... (alias)
  const merchantOrderId =
    urlObj.searchParams.get('merchantOrderId') ||
    urlObj.searchParams.get('merchantTransactionId');

  if (!merchantOrderId) {
    return json(400, { ok: false, error: 'Missing query param: merchantOrderId (or merchantTransactionId)' });
  }

  try {
    // 1) OAuth
    const accessToken = await fetchOAuthToken(AUTH_BASE, CID, String(CVER), CSEC);

    // 2) Order status
    const statusUrl = `${BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`;
    const r = await fetch(statusUrl, {
      method: 'GET',
      headers: { Authorization: `O-Bearer ${accessToken}` },
    });

    const text = await r.text();
    let j: any = null;
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      return json(r.status, {
        ok: false,
        step: 'status',
        status: r.status,
        error: 'PhonePe status failed',
        body: text,
      });
    }

    const state = j?.state; // COMPLETED | FAILED | PENDING
    return json(200, {
      ok: true,
      step: 'status',
      state,
      raw: j ?? text,
    });
  } catch (e: any) {
    return json(500, { ok: false, step: 'exception', error: String(e?.message || e) });
  }
}
