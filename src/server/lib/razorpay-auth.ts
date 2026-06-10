import type { PaymentMode } from "./payment-provider.js";

/** Strip invisible chars / whitespace from pasted API keys. */
export function normalizePaymentCredential(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function buildRazorpayBasicAuth(keyId: string, keySecret: string): string {
  const bytes = new TextEncoder().encode(`${keyId}:${keySecret}`);
  let binary = "";
  for (const i of bytes) binary += String.fromCharCode(i);
  return btoa(binary);
}

export function parseRazorpayErrorBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Authentication failed — check that Key ID and Secret are a matching pair from Razorpay Dashboard.";
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { description?: string; reason?: string; code?: string };
      description?: string;
    };
    const err = parsed?.error;
    return (
      err?.description ||
      err?.reason ||
      err?.code ||
      parsed?.description ||
      trimmed.slice(0, 300)
    );
  } catch {
    return trimmed.slice(0, 300);
  }
}

export async function testRazorpayCredentials(args: {
  keyId: string;
  keySecret: string;
  mode: PaymentMode;
}): Promise<{ ok: boolean; message: string }> {
  const keyId = normalizePaymentCredential(args.keyId);
  const keySecret = normalizePaymentCredential(args.keySecret);
  if (!keyId || !keySecret) {
    return { ok: false, message: "Key ID and Secret are required." };
  }

  const expectedPrefix = args.mode === "live" ? "rzp_live_" : "rzp_test_";
  if (!keyId.startsWith(expectedPrefix)) {
    return {
      ok: false,
      message:
        args.mode === "live"
          ? "Live mode requires a Key ID starting with rzp_live_. Switch to Test mode or paste live keys."
          : "Test mode requires a Key ID starting with rzp_test_. Switch to Live mode or paste test keys.",
    };
  }

  const auth = buildRazorpayBasicAuth(keyId, keySecret);
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: 100,
      currency: "INR",
      receipt: `cuetronix-test-${Date.now()}`,
    }),
  });

  if (response.ok) {
    return { ok: true, message: `Razorpay credentials are valid in ${args.mode} mode.` };
  }

  const text = await response.text();
  let detail = parseRazorpayErrorBody(text);
  const authFailure =
    response.status === 401 ||
    response.status === 406 ||
    (response.status === 400 && /auth|invalid|api key|secret/i.test(detail));
  if (authFailure) {
    detail = `${detail} Re-copy both Key ID and Secret from Razorpay Dashboard → Settings → API Keys (${args.mode} mode). If you regenerated the secret, paste the new one and save again.`;
  }

  return {
    ok: false,
    message: `Razorpay auth failed (${response.status}, ${args.mode}): ${detail}`,
  };
}
