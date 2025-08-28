// /api/phonepe/ping.ts
export const runtime = 'edge';

const must = [
  'PHONEPE_BASE_URL',
  'PHONEPE_MERCHANT_ID',
  'PHONEPE_CLIENT_ID',
  'PHONEPE_CLIENT_VERSION',
  'PHONEPE_CLIENT_SECRET',
];

export default async function handler() {
  const present: string[] = [];
  const missing: string[] = [];
  must.forEach((k) => (process.env[k] ? present.push(k) : missing.push(k)));

  return new Response(
    JSON.stringify({
      ok: missing.length === 0,
      runtime: 'edge',
      env_present: present,
      env_missing: missing,
    }),
    { headers: { 'content-type': 'application/json' } },
  );
}
