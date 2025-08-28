// /api/phonepe/status.ts  (Edge Runtime, ESM)
export const config = { runtime: "edge" };

/** helpers */
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
    const transactionId = url.searchParams.get("transactionId");
    if (!transactionId) {
      return Response.json({ error: "transactionId is required" }, { status: 400 });
    }

    // envs
    const BASE = process.env.PHONEPE_BASE_URL!;
    const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID!;
    const SALT_KEY = process.env.PHONEPE_SALT_KEY!;
    const SALT_INDEX = process.env.PHONEPE_SALT_INDEX!;
    if (!BASE || !MERCHANT_ID || !SALT_KEY || !SALT_INDEX) {
      return Response.json(
        { error: "Missing PhonePe environment variables" },
        { status: 500 }
      );
    }

    // X-VERIFY for status:
    // sha256( "/pg/v1/status/{merchantId}/{transactionId}" + SALT_KEY ) + "###" + SALT_INDEX
    const path = `/pg/v1/status/${MERCHANT_ID}/${transactionId}`;
    const checksum = await sha256Hex(path + SALT_KEY);
    const xVerify = `${checksum}###${SALT_INDEX}`;

    const upstream = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    const data = await upstream.json().catch(() => ({}));

    // Return upstream as-is so frontend can decide (expects code === "PAYMENT_SUCCESS")
    return Response.json(
      { ok: upstream.ok, ...data },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (err: any) {
    console.error("PhonePe /status error", err);
    return Response.json({ error: "Internal error checking status" }, { status: 500 });
  }
}
