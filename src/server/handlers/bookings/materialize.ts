/**
 * /api/bookings/materialize (Node)
 *
 * Public endpoint called by PublicPaymentSuccess after Razorpay redirects.
 * Replaces the localStorage-driven booking insert that used to live in the
 * client. Verifies the Razorpay signature, fetches the payment to confirm
 * status + amount, then delegates to the shared idempotent helper.
 *
 * Reached via the api/bookings/[action].ts dispatcher — no new function file.
 *
 * Auth: Razorpay HMAC signature triplet only. Anyone in possession of a
 * valid (order_id, payment_id, signature) tuple can request materialization
 * for that single payment — exactly what the public success page needs.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getRazorpayCredentials, type RazorpayProfile } from "../../lib/razorpay-credentials";
import { materializeBookingFromPaymentOrder } from "../../lib/materialize-booking";

export const config = {
  maxDuration: 30,
};

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  end: () => void;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  profile: RazorpayProfile,
): boolean {
  if (!orderId || !paymentId || !signature) return false;
  try {
    const { keySecret } = getRazorpayCredentials(profile);
    const expected = createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error("[bookings/materialize] signature verify threw:", err);
    return false;
  }
}

async function fetchPayment(paymentId: string, profile: RazorpayProfile) {
  const Razorpay = (await import("razorpay")).default;
  const { keyId, keySecret } = getRazorpayCredentials(profile);
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay.payments.fetch(paymentId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (typeof req.body === "string"
      ? JSON.parse(req.body)
      : (req.body as Record<string, unknown>)) || {};
  } catch {
    return j(res, { ok: false, error: "Invalid JSON body" }, 400);
  }

  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");
  const profile: RazorpayProfile = body.profile === "lite" ? "lite" : "default";

  if (!orderId || !paymentId || !signature) {
    return j(res, { ok: false, error: "Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature" }, 400);
  }

  const sigValid = verifyRazorpaySignature(orderId, paymentId, signature, profile);
  if (!sigValid) {
    // Try the alternate profile (older orders may have used a different one).
    const altProfile: RazorpayProfile = profile === "lite" ? "default" : "lite";
    const altValid = verifyRazorpaySignature(orderId, paymentId, signature, altProfile);
    if (!altValid) {
      return j(res, { ok: false, error: "Invalid Razorpay signature" }, 401);
    }
  }

  // Pull the actual payment so we can confirm status + amount.
  let payment: { id: string; status: string; amount: number; currency: string; order_id: string };
  try {
    payment = (await fetchPayment(paymentId, profile)) as unknown as typeof payment;
  } catch (err) {
    return j(
      res,
      {
        ok: false,
        error: `Could not fetch payment from Razorpay: ${(err as Error).message}`,
      },
      502,
    );
  }

  const accepted = payment.status === "captured" || payment.status === "authorized";
  if (!accepted) {
    return j(res, {
      ok: false,
      success: false,
      status: payment.status,
      error: `Payment is not in a successful state (status=${payment.status})`,
    });
  }

  try {
    const outcome = await materializeBookingFromPaymentOrder({
      orderId,
      paymentId,
      paymentAmountPaise: Number(payment.amount) || 0,
      source: "success_page",
    });

    return j(res, {
      ok: outcome.status !== "amount_mismatch" && outcome.status !== "order_unknown",
      success: outcome.status === "created" || outcome.status === "already_exists",
      status: outcome.status,
      bookingIds: outcome.bookingIds,
      billId: outcome.billId,
      paymentOrderId: outcome.paymentOrderId,
      message: outcome.message,
    });
  } catch (err) {
    console.error("[bookings/materialize] threw:", err);
    return j(res, { ok: false, error: (err as Error).message || "Materialize failed" }, 500);
  }
}
