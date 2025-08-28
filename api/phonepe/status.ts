export const runtime = 'edge';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function requireEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k as keyof typeof process.env]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}

async function fetchJSON(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = init;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...rest, signal: ac.signal });
    const text = await resp.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { resp, body, text };
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  try {
    requireEnv([
      'PHONEPE_BASE_URL',
      'PHONEPE_AUTH_BASE',
      'PHONEPE_CLIENT_ID',
      'PHONEPE_CLIENT_VERSION',
      'PHONEPE_CLIENT_SECRET',
    ]);

    const { searchParams } = new URL(req.url);
    const merchantOrderId = searchParams.get('merchantOrderId') || searchParams.get('merchantTransactionId');
    if (!merchantOrderId) {
      return json({ ok: false, error: 'Missing merchantOrderId (or merchantTransactionId)' }, 400);
    }

    // OAuth
    const authUrl = `${process.env.PHONEPE_AUTH_BASE}/v1/oauth/token`;
    const payload = {
      client_id: process.env.PHONEPE_CLIENT_ID,
      client_version: Number(process.env.PHONEPE_CLIENT_VERSION || '1'),
      client_secret: process.env.PHONEPE_CLIENT_SECRET,
    };

    const { resp: aResp, body: aBody } = await fetchJSON(authUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!aResp.ok || !aBody?.access_token) {
      return json({ ok: false, step: 'oauth', status: aResp.status, body: aBody }, 502);
    }
    const token = aBody.access_token as string;

    // Status
    const statusUrl = `${process.env.PHONEPE_BASE_URL}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`;
    const { resp: sResp, body: sBody } = await fetchJSON(statusUrl, {
      method: 'GET',
      headers: { 'authorization': `O-Bearer ${token}` },
    });

    if (!sResp.ok) {
      return json({ ok: false, step: 'status', status: sResp.status, body: sBody }, 502);
    }

    return json({ ok: true, ...sBody });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

// Guard
export const POST = () => json({ ok: false, error: 'Method not allowed' }, 405);

