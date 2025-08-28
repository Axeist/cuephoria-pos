export const runtime = 'edge';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET() {
  const env_present = [
    'PHONEPE_BASE_URL',
    'PHONEPE_AUTH_BASE',
    'PHONEPE_MERCHANT_ID',
    'PHONEPE_CLIENT_ID',
    'PHONEPE_CLIENT_VERSION',
    'PHONEPE_CLIENT_SECRET',
    'NEXT_PUBLIC_SITE_URL',
  ].filter((k) => !!process.env[k as keyof typeof process.env]);

  const env_missing = [
    'PHONEPE_BASE_URL',
    'PHONEPE_AUTH_BASE',
    'PHONEPE_MERCHANT_ID',
    'PHONEPE_CLIENT_ID',
    'PHONEPE_CLIENT_VERSION',
    'PHONEPE_CLIENT_SECRET',
  ].filter((k) => !process.env[k as keyof typeof process.env]);

  return json({
    ok: env_missing.length === 0,
    runtime: 'edge',
    env_present,
    env_missing,
  });
}

// fallback for other methods
export const POST = () => json({ ok: false, error: 'Method not allowed' }, 405);
