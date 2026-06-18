// Using Node.js runtime to use Razorpay SDK
// export const config = { runtime: "edge" };

import {
  getRazorpayCredentials,
  parseRazorpayProfile,
  type RazorpayProfile,
} from "../lib/razorpay-credentials";
import { createHmac, timingSafeEqual } from "crypto";
import { fromMinorUnits } from "../lib/payment-provider";
import { assertProviderEnabledNow, resolveRequestedProvider } from "../lib/payment-provider-facade";

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  end: () => void;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

function getRazorpayKeySecret(profile: RazorpayProfile) {
  return getRazorpayCredentials(profile).keySecret;
}

// Verify Razorpay payment signature
function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  profile: RazorpayProfile
): boolean {
  const keySecret = getRazorpayKeySecret(profile);
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

  try {
    const expected = createHmac("sha256", keySecret).update(payload).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(String(razorpaySignature || "").trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error("❌ Payment signature verification failed:", err);
    return false;
  }
}

// Fetch payment status from Razorpay API using SDK
async function fetchPaymentStatus(paymentId: string, profile: RazorpayProfile) {
  // Import Razorpay SDK
  const Razorpay = (await import('razorpay')).default;

  const { keyId, keySecret } = getRazorpayCredentials(profile);

  // Initialize Razorpay client
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  try {
    // Fetch payment using Razorpay SDK
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      error?: { description?: string; code?: string };
    };
    console.error("❌ Failed to fetch payment status:", {
      error: err,
      message: error?.message,
      description: error?.error?.description,
      code: error?.error?.code
    });
    throw new Error(error?.error?.description || error?.message || "Failed to fetch payment status");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // In Vercel Node.js runtime, body is already parsed
    const payload = req.body || {};
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      profile: profileRaw,
      provider: providerRaw,
    } = payload;

    const profile = parseRazorpayProfile(profileRaw);
    const provider = resolveRequestedProvider(providerRaw);
    assertProviderEnabledNow(provider, "payment verification");

    console.log("🔍 Verifying Razorpay payment:", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      profile,
      provider,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return j(res, { 
        ok: false, 
        error: "Missing required payment parameters" 
      }, 400);
    }

    // Fetch payment status from Razorpay API
    let payment;
    try {
      payment = await fetchPaymentStatus(razorpay_payment_id, profile);
    } catch (fetchErr: unknown) {
      const fetchError = fetchErr as { message?: string };
      // If payment doesn't exist or fetch fails, it's likely a failed payment
      console.error("❌ Failed to fetch payment:", fetchError?.message);
      return j(res, {
        ok: false,
        success: false,
        status: "failed",
        error: fetchError?.message || "Payment not found or failed",
      });
    }

    // Check if payment is successful
    const isSuccess = payment.status === "captured" || payment.status === "authorized";
    
    if (!isSuccess) {
      console.log("❌ Payment not successful:", payment.status);
      const errorMsg = payment.error_description || 
                      payment.error_reason || 
                      payment.error_code ||
                      `Payment status: ${payment.status}`;
      return j(res, {
        ok: false,
        success: false,
        status: payment.status,
        error: errorMsg,
      });
    }

    // Verify signature (basic check - full verification should be done client-side)
    const signatureValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      profile
    );
    if (!signatureValid) {
      return j(
        res,
        {
          ok: false,
          success: false,
          status: "failed",
          error: "Invalid payment signature",
        },
        401,
      );
    }

    console.log("✅ Payment verified:", {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: payment.status,
      amount: payment.amount,
    });

    return j(res, {
      ok: true,
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      provider,
      status: payment.status,
      amount: fromMinorUnits(payment.amount, payment.currency), // Minor -> major units
      currency: payment.currency,
      signatureValid,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("💥 Payment verification error:", err);
    const status = String(error?.message || "").includes("not enabled yet") ? 501 : 500;
    return j(res, { 
      ok: false, 
      success: false,
      error: String(error?.message || err) 
    }, status);
  }
}

