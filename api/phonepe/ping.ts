export const config = { runtime: 'edge' };

type Ok = { ok: true; runtime: 'edge'; env_present: string[]; env_missing: string[] }
type Err = { ok: false; runtime: 'edge'; env_present: string[]; env_missing: string[] }

export default async function handler() {
  const env = process.env;

  // Accept both styles
  const PG_BASE =
    env.PHONEPE_PG_BASE ||
    env.PHONEPE_BASE_URL ||
    env.PHONEPE_PG_BASE_URL ||
    '';

  const AUTH_BASE =
    env.PHONEPE_AUTH_BASE ||
    env.PHONEPE_AUTH_BASE_URL ||
    '';

  const present = [
    PG_BASE && 'PHONEPE_PG_BASE/PHONEPE_BASE_URL',
    AUTH_BASE && 'PHONEPE_AUTH_BASE',
    env.PHONEPE_MERCHANT_ID && 'PHONEPE_MERCHANT_ID',
    env.PHONEPE_CLIENT_ID && 'PHONEPE_CLIENT_ID',
    env.PHONEPE_CLIENT_VERSION && 'PHONEPE_CLIENT_VERSION',
    env.PHONEPE_CLIENT_SECRET && 'PHONEPE_CLIENT_SECRET',
    env.NEXT_PUBLIC_SITE_URL && 'NEXT_PUBLIC_SITE_URL',
  ].filter(Boolean) as string[];

  const required = [
    'PHONEPE_PG_BASE/PHONEPE_BASE_URL',
    'PHONEPE_AUTH_BASE',
    'PHONEPE_MERCHANT_ID',
    'PHONEPE_CLIENT_ID',
    'PHONEPE_CLIENT_VERSION',
    'PHONEPE_CLIENT_SECRET',
    'NEXT_PUBLIC_SITE_URL',
  ];

  const missing = required.filter((k) => !present.includes(k));

  const body: Ok | Err = missing.length
    ? { ok: false, runtime: 'edge', env_present: present, env_missing: missing }
    : { ok: true, runtime: 'edge', env_present: present, env_missing: [] };

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
