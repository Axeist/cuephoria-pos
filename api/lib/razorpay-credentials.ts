/**
 * Shared Razorpay key resolution for main vs lite public booking.
 *
 * Main (default): RAZORPAY_KEY_ID_LIVE / RAZORPAY_KEY_SECRET_LIVE (or TEST variants)
 * Lite branch live: RAZORPAY_KEY_ID_LIVE_LITE / RAZORPAY_KEY_SECRET_LIVE_LITE
 *
 * Test mode for lite falls back to main test keys if *_TEST_LITE is unset.
 */

export type RazorpayProfile = "default" | "lite";

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  const fromDeno = (globalThis as { Deno?: { env?: { get?: (n: string) => string | undefined } } })
    .Deno?.env?.get?.(name);
  return fromDeno;
}

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function parseRazorpayProfile(raw: string | null | undefined): RazorpayProfile {
  const p = (raw || "").trim().toLowerCase();
  return p === "lite" ? "lite" : "default";
}

export function getRazorpayCredentials(profile: RazorpayProfile = "default") {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";

  if (profile === "lite") {
    if (isLive) {
      const keyId = getEnv("RAZORPAY_KEY_ID_LIVE_LITE") || need("RAZORPAY_KEY_ID_LIVE_LITE");
      const keySecret = getEnv("RAZORPAY_KEY_SECRET_LIVE_LITE") || need("RAZORPAY_KEY_SECRET_LIVE_LITE");
      if (!keyId.startsWith("rzp_live_")) {
        console.warn("⚠️ Lite live: key id should start with 'rzp_live_'");
      }
      return { keyId, keySecret, isLive, profile };
    }
    const keyId =
      getEnv("RAZORPAY_KEY_ID_TEST_LITE") ||
      getEnv("RAZORPAY_KEY_ID_TEST") ||
      getEnv("RAZORPAY_KEY_ID") ||
      need("RAZORPAY_KEY_ID_TEST");
    const keySecret =
      getEnv("RAZORPAY_KEY_SECRET_TEST_LITE") ||
      getEnv("RAZORPAY_KEY_SECRET_TEST") ||
      getEnv("RAZORPAY_KEY_SECRET") ||
      need("RAZORPAY_KEY_SECRET_TEST");
    if (!keyId.startsWith("rzp_test_")) {
      console.warn("⚠️ Lite test mode: key id should start with 'rzp_test_'");
    }
    return { keyId, keySecret, isLive, profile };
  }

  const keyId = isLive
    ? getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_LIVE")
    : getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_TEST");

  const keySecret = isLive
    ? getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_LIVE")
    : getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_TEST");

  if (isLive && !keyId.startsWith("rzp_live_")) {
    console.warn("⚠️ Live mode but key doesn't start with 'rzp_live_'");
  } else if (!isLive && !keyId.startsWith("rzp_test_")) {
    console.warn("⚠️ Test mode but key doesn't start with 'rzp_test_'");
  }

  return { keyId, keySecret, isLive, profile };
}

export function getRazorpayKeyId(profile: RazorpayProfile = "default"): string {
  return getRazorpayCredentials(profile).keyId;
}
