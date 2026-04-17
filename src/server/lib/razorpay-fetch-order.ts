/**
 * Node-only: uses the Razorpay SDK. Do not import from Edge handlers.
 */
import { getRazorpayCredentials, type RazorpayProfile } from "./razorpay-credentials";

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  return undefined;
}

function hasDistinctLiteKeys(): boolean {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  if (isLive) {
    return !!(getEnv("RAZORPAY_KEY_ID_LIVE_LITE") && getEnv("RAZORPAY_KEY_SECRET_LIVE_LITE"));
  }
  return !!(getEnv("RAZORPAY_KEY_ID_TEST_LITE") && getEnv("RAZORPAY_KEY_SECRET_TEST_LITE"));
}

/** Webhook: merchant unknown — try main Razorpay account, then lite. */
export async function fetchRazorpayOrderWithMerchantFallback(orderId: string) {
  const Razorpay = (await import("razorpay")).default;

  const fetchWith = async (profile: RazorpayProfile) => {
    const { keyId, keySecret } = getRazorpayCredentials(profile);
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpay.orders.fetch(orderId);
  };

  try {
    return await fetchWith("default");
  } catch (first: unknown) {
    if (!hasDistinctLiteKeys()) {
      throw first;
    }
    return await fetchWith("lite");
  }
}
