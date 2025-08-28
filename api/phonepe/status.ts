// /api/phonepe/status.ts
export const config = { runtime: "edge" };

const BASE_URL =
  (process.env as any).PHONEPE_BASE_URL ||
  "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = (process.env as any).PHONEPE_MERCHANT_ID || "";
const SALT_KEY = (process.env as any).PHONEPE_SALT_KEY || "";
const SALT_INDEX = (process.env as any).PHONEPE_SALT_INDEX || "1";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { merchantTransactionId } = await req.json();
    if (!merchantTransactionId) {
      return json({ error: "merchantTransactionId required" }, 400);
    }

    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
    const stringToSign = endpoint + SALT_KEY;
    const sha256 = await sha256Hex(stringToSign);
    const xVerify = `${sha256}###${SALT_INDEX}`;

    const r = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    const text = await r.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    const code = data?.code;
    const success = code === "PAYMENT_SUCCESS";
    return json({ success, code, raw: data, status: r.status });
  } catch (e: any) {
    return json(
      { success: false, error: "status check failed", detail: String(e?.message || e) },
      500
    );
  }
}
