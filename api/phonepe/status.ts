// /api/phonepe/status.ts
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

    const { merchantTransactionId } = req.body || {};
    if (!merchantTransactionId) return json(res, 400, { error: "merchantTransactionId required" });

    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
    const stringToSign = endpoint + SALT_KEY;
    const sha256 = createHash("sha256").update(stringToSign).digest("hex");
    const xVerify = `${sha256}###${SALT_INDEX}`;

    const r = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    const data = await r.json().catch(() => ({}));
    const code = data?.code;
    const success = code === "PAYMENT_SUCCESS";
    return json(res, 200, { success, code, raw: data });
  } catch (e: any) {
    console.error("STATUS ERROR:", e);
    return json(res, 500, { success: false, error: "status check failed", detail: String(e?.message || e) });
  }
}
