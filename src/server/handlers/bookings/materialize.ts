/**
 * /api/bookings/materialize (Node)
 *
 * Public endpoint called by PublicPaymentSuccess after Razorpay redirects.
 * Verifies the Razorpay signature, fetches the payment to confirm
 * status + amount, then delegates to the shared idempotent helper.
 */

import {
  parseRazorpayProfile,
  resolveRazorpayCredentials,
  verifyRazorpayPaymentSignature,
  type RazorpayProfile,
} from "../../lib/razorpay-credentials.js";
import { materializeBookingFromPaymentOrder } from "../../lib/materialize-booking.js";

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

async function verifyWithProfile(
  orderId: string,
  paymentId: string,
  signature: string,
  profile: RazorpayProfile,
): Promise<boolean> {
  const creds = await resolveRazorpayCredentials({ orderId, profile, purpose: "booking" });
  return verifyRazorpayPaymentSignature(orderId, paymentId, signature, creds);
}

async function fetchPayment(paymentId: string, orderId: string, profile: RazorpayProfile) {
  const Razorpay = (await import("razorpay")).default;
  const creds = await resolveRazorpayCredentials({ orderId, profile, purpose: "booking" });
  const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
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

  let sigValid = await verifyWithProfile(orderId, paymentId, signature, profile);
  if (!sigValid) {
    const altProfile: RazorpayProfile = profile === "lite" ? "default" : "lite";
    sigValid = await verifyWithProfile(orderId, paymentId, signature, altProfile);
    if (!sigValid) {
      return j(res, { ok: false, error: "Invalid Razorpay signature" }, 401);
    }
  }

  let payment: { id: string; status: string; amount: number; currency: string; order_id: string };
  try {
    payment = (await fetchPayment(paymentId, orderId, profile)) as unknown as typeof payment;
  } catch (err) {
    const altProfile: RazorpayProfile = profile === "lite" ? "default" : "lite";
    try {
      payment = (await fetchPayment(paymentId, orderId, altProfile)) as unknown as typeof payment;
    } catch {
      return j(
        res,
        {
          ok: false,
          error: `Could not fetch payment from Razorpay: ${(err as Error).message}`,
        },
        502,
      );
    }
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
