// /api/phonepe/status.ts
export const config = { runtime: "edge" };

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (s: string) => {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      return Response.json({ error: "orderId is required" }, { status: 400 });
    }

    const BASE = process.env.PHONEPE_BASE_URL!;
    const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID!;
    const SALT_KEY = process.env.PHONEPE_SALT_KEY!;
    const SALT_INDEX = process.env.PHONEPE_SALT_INDEX!;

    const path = `/checkout/v2/order/${orderId}/status`;
    const checksum = await sha256Hex(path + SALT_KEY);
    const xVerify = `${checksum}###${SALT_INDEX}`;

    const upstream = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    const data = await upstream.json().catch(() => ({}));

    return Response.json(
      { ok: upstream.ok, ...data },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (err: any) {
    console.error("PhonePe /status error", err);
    return Response.json({ error: "Internal error checking status" }, { status: 500 });
  }
}
