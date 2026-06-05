/** Shared Razorpay script + key preload for public booking checkout. */

let scriptPromise: Promise<void> | null = null;

const keyCache: Record<"default" | "lite", string | null> = {
  default: null,
  lite: null,
};

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

export async function fetchRazorpayKeyId(isLiteBranch: boolean): Promise<string> {
  const cacheKey = isLiteBranch ? "lite" : "default";
  const cached = keyCache[cacheKey];
  if (cached) return cached;

  const profileQs = isLiteBranch ? "?profile=lite" : "";
  const res = await fetch(`/api/razorpay/get-key-id${profileQs}`);
  const data = (await res.json()) as { ok?: boolean; keyId?: string };
  if (data.ok && data.keyId) {
    keyCache[cacheKey] = data.keyId;
    return data.keyId;
  }
  throw new Error("Payment gateway configuration error");
}

export function primeRazorpayCheckout(isLiteBranch: boolean): void {
  void loadRazorpayScript().catch(() => {});
  void fetchRazorpayKeyId(isLiteBranch).catch(() => {});
}
