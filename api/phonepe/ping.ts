// /api/phonepe/ping.ts
export const config = { runtime: "edge" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(_req: Request) {
  try {
    const required = [
      "PHONEPE_BASE_URL",
      "PHONEPE_MERCHANT_ID",
      "PHONEPE_SALT_KEY",
      "PHONEPE_SALT_INDEX",
    ];
    const present = required.filter((k) => !!(process.env as any)[k]);
    return json({
      ok: true,
      runtime: "edge",
      env_present: present,
      env_missing: required.filter((k) => !present.includes(k)),
    });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
