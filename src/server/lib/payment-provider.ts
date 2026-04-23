export const PAYMENT_PROVIDERS = ["razorpay", "stripe"] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type PaymentMode = "test" | "live";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function parsePaymentProvider(raw: unknown, fallback: PaymentProvider = "razorpay"): PaymentProvider {
  const value = String(raw ?? "").trim().toLowerCase();
  if ((PAYMENT_PROVIDERS as readonly string[]).includes(value)) {
    return value as PaymentProvider;
  }
  return fallback;
}

export function parsePaymentMode(raw: unknown, fallback: PaymentMode = "test"): PaymentMode {
  return String(raw ?? "").trim().toLowerCase() === "live" ? "live" : fallback;
}

export function parseCurrency(raw: unknown, fallback = "INR"): string {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) return fallback;
  return value;
}

export function toMinorUnits(amountMajor: number, currency: string): number {
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    throw new Error("Amount must be a positive number");
  }
  const ccy = parseCurrency(currency);
  if (ZERO_DECIMAL_CURRENCIES.has(ccy)) {
    return Math.round(amountMajor);
  }
  return Math.round(amountMajor * 100);
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  const ccy = parseCurrency(currency);
  if (ZERO_DECIMAL_CURRENCIES.has(ccy)) return amountMinor;
  return amountMinor / 100;
}

export function getDefaultCheckoutCurrency(): string {
  const fromEnv =
    (typeof process !== "undefined" ? process.env?.DEFAULT_PAYMENT_CURRENCY : undefined) ||
    (typeof process !== "undefined" ? process.env?.DEFAULT_CHECKOUT_CURRENCY : undefined);
  return parseCurrency(fromEnv, "INR");
}
