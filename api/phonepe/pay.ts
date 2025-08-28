// /api/phonepe/pay.ts
export const config = { runtime: "edge" };

/** utils */
const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (s: string) => {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

const base64Utf8 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin); // Web API available in Edge runtime
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      amount,                      // in INR
      customerPhone,
      merchantTransactionId,
      successUrl,
      failedUrl,
    } = body || {};

    // ---- envs
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

    // ---- fallback redirect URLs
    const origin = new URL(req.url).origin;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${origin}/public/booking`;
    const redirectSuccess = successUrl || `${siteUrl}?payStatus=success`;
    const redirectFail = failedUrl || `${siteUrl}?payStatus=failed`;

    // ---- payload (PhonePe v2 expects "merchantOrderId")
    const txnId = merchantTransactionId || `ORDER_${Date.now()}`;
    const userId = customerPhone || `USER_${Date.now()}`;
    const paise = Math.max(100, Math.round(Number(amount || 0) * 100)); // >= 1 INR

    const payload = {
      merchantId: MERCHANT_ID,
      merchantOrderId: txnId,
      merchantUserId: userId,
      amount: paise, // in paise
      redirectUrl: redirectSuccess,
      redirectMode: "REDIRECT",
      callbackUrl: redirectFail,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadB64 = base64Utf8(JSON.stringify(payload));

    // endpoint path (from docs)
    const path = "/checkout/v2/pay";
    const checksum = await sha256Hex(payloadB64 + path + SALT_KEY);
    const xVerify = `${checksum}###${SALT_INDEX}`;

    const upstream = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
      body: JSON.stringify({ request: payloadB64 }),
    });

    const data = await upstream.json().catch(() => ({}));

    const url =
      data?.data?.instrumentResponse?.redirectInfo?.url ||
      data?.data?.redirectUrl ||
      null;

    if (!upstream.ok || !data?.success || !url) {
      return Response.json(
        {
          ok: false,
          message: "Failed to initiate payment with PhonePe",
          upstreamStatus: upstream.status,
          upstreamBody: data,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      orderId: txnId,
      url,
    });
  } catch (err: any) {
    console.error("PhonePe /pay error", err);
    return Response.json({ error: "Internal error starting payment" }, { status: 500 });
  }
}
