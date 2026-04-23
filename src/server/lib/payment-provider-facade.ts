import { parsePaymentProvider, type PaymentProvider } from "./payment-provider";

export function resolveRequestedProvider(raw: unknown): PaymentProvider {
  return parsePaymentProvider(raw, "razorpay");
}

export function assertProviderEnabledNow(provider: PaymentProvider, flow: string): void {
  if (provider === "razorpay") return;
  throw new Error(`Provider ${provider} is not enabled yet for ${flow}.`);
}
