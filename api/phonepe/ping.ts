// /api/phonepe/ping.ts
export const config = { runtime: "nodejs" };

export default async function handler(_: any, res: any) {
  try {
    const required = ["PHONEPE_BASE_URL", "PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"];
    const present = required.filter((k) => !!process.env[k]);
    res.setHeader("Content-Type", "application/json");
    res.status(200).end(JSON.stringify({
      ok: true,
      runtime: "nodejs",
      env_present: present,
      env_missing: required.filter((k) => !present.includes(k)),
    }));
  } catch (e: any) {
    res.status(500).end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  }
}
