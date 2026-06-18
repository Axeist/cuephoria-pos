/**
 * Node-only Razorpay credential verification (official SDK).
 * Edge fetch to api.razorpay.com can return 406 with an empty body from Vercel;
 * checkout already uses this SDK path via create-order.
 */

import { normalizePaymentCredential } from "./razorpay-auth.js";
import { inferPaymentModeFromKeyId, type PaymentMode } from "./payment-provider.js";

export async function testRazorpayCredentialsNode(args: {
  keyId: string;
  keySecret: string;
  mode?: PaymentMode;
}): Promise<{ ok: boolean; message: string }> {
  const keyId = normalizePaymentCredential(args.keyId);
  const keySecret = normalizePaymentCredential(args.keySecret);
  if (!keyId || !keySecret) {
    return { ok: false, message: "Key ID and Secret are required." };
  }

  const inferredMode = inferPaymentModeFromKeyId(keyId) ?? args.mode ?? "test";
  const expectedPrefix = inferredMode === "live" ? "rzp_live_" : "rzp_test_";
  if (!keyId.startsWith(expectedPrefix)) {
    return {
      ok: false,
      message:
        inferredMode === "live"
          ? "Live keys must use a Key ID starting with rzp_live_."
          : "Test keys must use a Key ID starting with rzp_test_.",
    };
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    await razorpay.orders.create({
      amount: 100,
      currency: "INR",
      receipt: `cuetronix-test-${Date.now()}`.slice(0, 40),
    });
    return { ok: true, message: `Razorpay credentials are valid in ${inferredMode} mode.` };
  } catch (err: unknown) {
    const e = err as { error?: { description?: string }; message?: string; statusCode?: number };
    const detail =
      e?.error?.description ||
      e?.message ||
      "Authentication failed — check that Key ID and Secret are a matching pair from Razorpay Dashboard.";
    const status = e?.statusCode ?? "error";
    return {
      ok: false,
      message: `Razorpay auth failed (${status}, ${inferredMode}): ${detail} Re-copy both Key ID and Secret from Razorpay Dashboard → Settings → API Keys (${inferredMode} mode).`,
    };
  }
}
