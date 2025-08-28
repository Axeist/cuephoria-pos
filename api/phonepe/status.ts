export const config = { runtime: 'edge' };

const JSON_HEADERS = { 'content-type': 'application/json' };

async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), ms);
  try {
    // @ts-ignore
    return await p(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

function readEnv() {
  const env = process.env;

  const PG_BASE =
    env.PHONEPE_PG_BASE ||
    env.PHONEPE_BASE_URL ||
    env.PHONEPE_PG_BASE_URL;

  const AUTH_BASE =
    env.PHONEPE_AUTH_BASE ||
    env.PHONEPE_AUTH_BASE_URL;

  const v = (k?: string | null) => (k ?? '').trim() || null;

  return {
    PG_BASE: v(PG_BASE),
    AUTH_BASE: v(AUTH_BASE),
    MERCHANT_ID: v(env.PHONEPE_MERCHANT_ID),
    CLIENT_ID: v(env.PHONEPE_CLIENT_ID),
    CLIENT_VER: v(env.PHONEPE_CLIENT_VERSION),
    CLIENT_SECRET: v(env.PHONEPE_CLIENT_SECRET),
  };
}

async function getAccessToken(AUTH_BASE: string, CLIENT_ID: string, CLIENT_VER: string, CLIENT_SECRET: string) {
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', CLIENT_ID);
  form.set('client_version', CLIENT_VER);
  form.set('client_secret', CLIENT_SECRET);

  const res = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, status: res.status, body };

  const token = body?.access_token ?? body?.encrypted_access_token ?? null;
  const type = (body?.token_type || 'O-Bearer') as string;
  if (!token) return { ok: false as const, status: res.status, body: { message: 'Auth OK but no token' } };

  return { ok: true as const, token: `${type} ${token}` };
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS });
  }

  const url = new URL(req.url);
  const merchantOrderId = url.searchParams.get('merchantOrderId') || url.searchParams.get('id');
  if (!merchantOrderId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing merchantOrderId' }), { status: 400, headers: JSON_HEADERS });
  }

  const env = readEnv();
  const missing = Object.entries(env).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return new Response(JSON.stringify({ ok: false, step: 'env', error: 'Missing env', missing }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const auth = await getAccessToken(env.AUTH_BASE!, env.CLIENT_ID!, env.CLIENT_VER!, env.CLIENT_SECRET!);
  if (!auth.ok) {
    return new Response(JSON.stringify({ ok: false, step: 'oauth', status: auth.status, body: auth.body }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }

  const doStatus = (signal: AbortSignal) =>
    fetch(`${env.PG_BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`, {
      method: 'GET',
      headers: { authorization: auth.token },
      cache: 'no-store',
      signal,
    });

  try {
    const res = await withTimeout(doStatus, 15000);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, step: 'status', status: res.status, body }), {
        status: 502,
        headers: JSON_HEADERS,
      });
    }

    // State is the single source of truth
    const state = body?.state || body?.data?.state || 'UNKNOWN';

    return new Response(JSON.stringify({ ok: true, state, raw: body }), { headers: JSON_HEADERS });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, step: 'status-exception', message: String(e?.message || e) }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}
