export const config = { runtime: 'edge' };

const must = (name: string) => {
  const v = process.env[name];
  return v && v.length > 0 ? v : null;
};

export default async function handler() {
  const required = [
    'PHONEPE_BASE_URL',
    'PHONEPE_MERCHANT_ID',
    'PHONEPE_CLIENT_ID',        // add these three for OAuth style creds
    'PHONEPE_CLIENT_VERSION',
    'PHONEPE_CLIENT_SECRET',
  ];

  const env_missing = required.filter((k) => !must(k));
  const env_present = required.filter((k) => !!must(k));

  return new Response(
    JSON.stringify({
      ok: env_missing.length === 0,
      runtime: 'edge',
      env_present,
      env_missing,
    }),
    { headers: { 'content-type': 'application/json' } }
  );
}
