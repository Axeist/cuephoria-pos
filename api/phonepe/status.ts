// /api/phonepe/status.ts
export const config = { runtime: 'edge' };

type Json = Record<string, unknown>;
const ok = (b: Json, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

function readEnv() {
  const env = {
    AUTH_BASE: process.env.PHONEPE_AUTH_BASE || '',
    PG_BASE: process.env.PHONEPE_BASE_URL || '',
    MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID || '',
    CLIENT_ID: process.env.PHONEPE_CLIENT_ID || '',
    CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION || '',
    CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET || '',
  };
  const miss = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  return { env, miss };
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return ok({ ok: false, error: 'Method not allowed' }, 405);

  const { env, miss } = readEnv();
  if (miss.length) return ok({ ok: false, error: `Missing env: ${miss.join(', ')}` }, 500);

  const url = new URL(req.url);
  const merchantOrderId = url.searchParams.get('merchantOrderId') || url.searchParams.get('order');
  if (!merchantOrderId) return ok({ ok: false, error: 'Missing merchantOrderId' }, 400);

  // 1) OAuth
  const oauthRes = await fetch(`${env.AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      client_version: env.CLIENT_VERSION,
    }),
  });
  const oauthText = await oauthRes.text();
  let oauth: any = {};
  try {
    oauth = JSON.parse(oauthText);
  } catch {}
  if (!oauthRes.ok || !(oauth?.access_token || oauth?.accessToken)) {
    return ok({ ok: false, step: 'oauth', status: oauthRes.status, body: oauthText }, 502);
  }
  const token = oauth.access_token || oauth.accessToken;
  const tokenType = oauth.token_type || oauth.tokenType || 'O-Bearer';

  // 2) Status
  const stRes = await fetch(`${env.PG_BASE}/checkout/v2/order/${merchantOrderId}/status`, {
    method: 'GET',
    headers: { authorization: `${tokenType} ${token}` },
  });
  const stText = await stRes.text();
  let st: any = {};
  try {
    st = JSON.parse(stText);
  } catch {}

  if (!stRes.ok) return ok({ ok: false, step: 'status', status: stRes.status, body: stText }, 502);

  // PhonePe returns root-level "state": COMPLETED | FAILED | PENDING
  return ok({
    ok: true,
    orderId: merchantOrderId,
    state: st?.state || st?.data?.state || 'UNKNOWN',
    raw: st,
  });
}
