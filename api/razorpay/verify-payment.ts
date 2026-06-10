import {
  parseRazorpayProfile,
  resolveRazorpayCredentials,
  verifyRazorpayPaymentSignature,
  type RazorpayProfile,
} from "./credentials.js";
import { lookupPaymentOrderOrganizationId } from "../../src/server/lib/payment-gateway-config.ts";

type VercelRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
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

async function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  profile: RazorpayProfile,
  locationId?: string,
): Promise<boolean> {
  const orgId = await lookupPaymentOrderOrganizationId(razorpayOrderId);
  const creds = await resolveRazorpayCredentials({
    orderId: razorpayOrderId,
    locationId,
    organizationId: orgId ?? undefined,
    profile,
    purpose: "booking",
  });
  return verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, creds);
}

async function fetchPaymentStatus(
  paymentId: string,
  orderId: string,
  profile: RazorpayProfile,
  locationId?: string,
) {
  const Razorpay = (await import("razorpay")).default;
  const orgId = await lookupPaymentOrderOrganizationId(orderId);
  const creds = await resolveRazorpayCredentials({
    orderId,
    locationId,
    organizationId: orgId ?? undefined,
    profile,
    purpose: "booking",
  });
  const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
  return razorpay.payments.fetch(paymentId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  if (req.method !== "POST") return j(res, { ok: false, error: "Method not allowed" }, 405);

  try {
    const payload = req.body || {};
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, profile: profileRaw, location_id } =
      payload;
    const profile = parseRazorpayProfile(profileRaw);
    const locationId = typeof location_id === "string" ? location_id : undefined;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return j(res, { ok: false, error: "Missing required payment parameters" }, 400);
    }

    let payment;
    try {
      payment = await fetchPaymentStatus(razorpay_payment_id, razorpay_order_id, profile, locationId);
    } catch (fetchErr: any) {
      return j(res, {
        ok: false,
        success: false,
        status: "failed",
        error: fetchErr?.message || "Payment not found or failed",
      });
    }

    const isSuccess = payment.status === "captured" || payment.status === "authorized";
    if (!isSuccess) {
      const errorMsg =
        payment.error_description || payment.error_reason || payment.error_code || `Payment status: ${payment.status}`;
      return j(res, { ok: false, success: false, status: payment.status, error: errorMsg });
    }

    let signatureValid = await verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      profile,
      locationId,
    );

    if (!signatureValid) {
      const altProfile: RazorpayProfile = profile === "lite" ? "default" : "lite";
      signatureValid = await verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        altProfile,
        locationId,
      );
    }

    if (!signatureValid) {
      return j(res, { ok: false, success: false, error: "Invalid Razorpay signature" }, 401);
    }

    return j(res, {
      ok: true,
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: payment.status,
      amount: payment.amount / 100,
      currency: payment.currency,
      signatureValid,
    });
  } catch (err: any) {
    return j(res, { ok: false, success: false, error: String(err?.message || err) }, 500);
  }
}
