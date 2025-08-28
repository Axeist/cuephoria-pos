// /api/phonepe/pay.ts
export const config = { runtime: "edge" };

const BASE_URL =
  (process.env as any).PHONEPE_BASE_URL ||
  "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = (process.env as any).PHONEPE_MERCHANT_ID || "";
const SALT_KEY = (process.env as any).PHONEPE_SALT_KEY || "";
const SALT_INDEX = (process.env as any).PHONEPE_SALT_INDEX || "1";

// helper: sha256 -> hex using Web Crypto (works on Edge runtime)
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
    const missing = [
      "PHONEPE_BASE_URL",
      "PHONEPE_MERCHANT_ID",
      "PHONEPE_SALT_KEY",
      "PHONEPE_SALT_INDEX",
    ].filter((k) => !(process.env as any)[k]);
    if (missing.length) return json({ error: "Missing env", missing }, 500);

    const { amount, customerPhone, merchantTransactionId, successUrl, failedUrl } =
      await req.json();

    if (!amount || !customerPhone || !merchantTransactionId || !successUrl || !failedUrl) {
      return json(
        {
          error: "Missing required fields",
          got: { amount, customerPhone, merchantTransactionId, successUrl, failedUrl },
        },
        400
      );
    }

    const amountPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return json({ error: "PhonePe requires positive amount in INR" }, 400);
    }

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      amount: amountPaise,
      merchantUserId: customerPhone,
      mobileNumber: customerPhone,
      callbackUrl: successUrl,
      redirectUrl: successUrl,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadBase64 = btoa(JSON.stringify(payload));
    const endpoint = "/pg/v1/pay";
    const stringToSign = payloadBase64 + endpoint + SALT_KEY;
    const sha256 = await sha256Hex(stringToSign);
    const xVerify = `${sha256}###${SALT_INDEX}`;

    const resp = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    const url =
      data?.data?.instrumentResponse?.redirectInfo?.url ||
      data?.data?.redirectUrl ||
      null;

    if (!url) {
      return json(
        { error: "No redirect url from PhonePe", upstream: data, status: resp.status },
        502
      );
    }

    return json({ url });
  } catch (e: any) {
    return json({ error: "PhonePe init error", detail: String(e?.message || e) }, 500);
  }
}
