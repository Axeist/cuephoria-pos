// /api/phonepe/ping.ts  (Edge Runtime, ESM)
export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const required = [
    "PHONEPE_BASE_URL",
    "PHONEPE_MERCHANT_ID",
    "PHONEPE_SALT_KEY",
    "PHONEPE_SALT_INDEX",
  ] as const;

  const present = required.filter((k) => !!process.env[k]);
  const missing = required.filter((k) => !process.env[k]);

  return Response.json({
    ok: true,
    runtime: "edge",
    env_present: present,
    env_missing: missing,
  });
}
