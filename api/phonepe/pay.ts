// /api/phonepe/pay.ts
export const config = { runtime: "nodejs" };

import { createHash } from "crypto";

const BASE_URL = process.env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "";
const SALT_KEY = process.env.PHONEPE_SALT_KEY || "";
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";

function json(res: any, code: number, body: any) {
  res.setHeader("Content-Type", "application/json");
  res.status(code).end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const missing = ["PHONEPE_BASE_URL", "PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"]
      .filter((k) => !process.env[k]);
    if (missing.length) return json(res, 500, { error: "Missing env", missing });

    const { amount, customerPhone, merchantTransactionId, successUrl, failedUrl } = req.body || {};
    if (!amount || !customerPhone || !merchantTransactionId || !successUrl || !failedUrl) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return json(res, 400, { error: "PhonePe requires positive amount in INR" });
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

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const endpoint = "/pg/v1/pay";
    const stringToSign = payloadBase64 + endpoint + SALT_KEY;
    const sha256 = createHash("sha256").update(stringToSign).digest("hex");
    const xVerify = `${sha256}###${SALT_INDEX}`;

    const resp = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const data = await resp.json().catch(() => ({}));

    const url =
      data?.data?.instrumentResponse?.redirectInfo?.url ||
      data?.data?.redirectUrl ||
      null;

    if (!url) {
      return json(res, 502, { error: "No redirect url from PhonePe", upstream: data });
    }
    return json(res, 200, { url });
  } catch (e: any) {
    console.error("PAY ERROR:", e);
    return json(res, 500, { error: "PhonePe init error", detail: String(e?.message || e) });
  }
}
