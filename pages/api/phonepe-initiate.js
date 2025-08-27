// /pages/api/phonepe-initiate.js

import crypto from "crypto";
import axios from "axios";

const PHONEPE_MERCHANT_ID = "TEST-M236V4PJIYABI_25082"; // from your credentials
const PHONEPE_SALT_KEY = "YzYzZWNjNjQtZmVINIi00Yjk0LWE3NGEtMDE4MDNlZmVhNjkx"; // from your credentials
const PHONEPE_SALT_INDEX = "1";
const REDIRECT_URL = "https://admin.cuephoria.in/public/booking"; // your booking page!

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed (POST only)" });
  }

  const { amount, phone } = req.body;
  if (!amount || !phone) {
    return res.status(400).json({ error: "Amount and phone required" });
  }

  // Unique transaction id
  const transactionId = "ORDER_" + Date.now();

  const paymentPayload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantUserId: phone,
    amount: Math.round(Number(amount) * 100), // rupees to paise
    merchantTransactionId: transactionId,
    redirectUrl: `${REDIRECT_URL}?merchantTransactionId=${transactionId}`,
    redirectMode: "POST",
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const payload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
  const endpoint = "/pg/v1/pay";
  const checksum =
    crypto
      .createHash("sha256")
      .update(payload + endpoint + PHONEPE_SALT_KEY)
      .digest("hex") +
    "###" +
    PHONEPE_SALT_INDEX;

  try {
    const response = await axios.post(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
      { request: payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
        },
      }
    );
    res.json({
      redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
      transactionId,
    });
  } catch (err) {
    res.status(500).json({
      error: "PhonePe payment initiation failed",
      details: err.response?.data || err.message,
    });
  }
}
