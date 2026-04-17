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
    return { keyId, keySecret, isLive, profile };
  }

  const keyId = isLive
    ? getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_LIVE")
    : getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_TEST");

  const keySecret = isLive
    ? getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_LIVE")
    : getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_TEST");

  return { keyId, keySecret, isLive, profile };
}

export function getRazorpayKeyId(profile: RazorpayProfile = "default"): string {
  return getRazorpayCredentials(profile).keyId;
}
