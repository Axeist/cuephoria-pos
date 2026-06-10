/** Shared Razorpay script + key preload for public booking checkout. */

let scriptPromise: Promise<void> | null = null;

const keyCache = new Map<string, string>();

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay unavailable on server"));
  }
  if ((window as Window & { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout script"));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

function cacheKeyFor(locationId: string | null | undefined, isLiteBranch: boolean): string {
  if (locationId) return `loc:${locationId}`;
  return isLiteBranch ? "profile:lite" : "profile:default";
}

export async function fetchRazorpayKeyId(
  isLiteBranch: boolean,
  locationId?: string | null,
): Promise<string> {
  const cacheKey = cacheKeyFor(locationId, isLiteBranch);
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  if (locationId) {
    params.set("location", locationId);
  } else if (isLiteBranch) {
    params.set("profile", "lite");
  }
  const qs = params.toString();
  const res = await fetch(`/api/razorpay/get-key-id${qs ? `?${qs}` : ""}`);
  const data = (await res.json()) as { ok?: boolean; keyId?: string };
  if (data.ok && data.keyId) {
    keyCache.set(cacheKey, data.keyId);
    return data.keyId;
  }
  throw new Error("Payment gateway configuration error");
}

export function primeRazorpayCheckout(isLiteBranch: boolean, locationId?: string | null): void {
  void loadRazorpayScript().catch(() => {});
  void fetchRazorpayKeyId(isLiteBranch, locationId).catch(() => {});
}
