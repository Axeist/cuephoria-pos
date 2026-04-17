/**
 * Razorpay subscription helpers — used by platform + tenant billing endpoints
 * and the /api/razorpay/webhook handler.
 *
 * The existing /api/razorpay/* routes already ship Razorpay SDK + credentials
 * helpers for ONE-TIME payments (bookings / tournaments). Subscriptions reuse
 * the same credentials (default profile) but speak a separate REST surface.
 *
 * All functions here are Node-only (crypto + razorpay SDK). Edge runtime
 * callers must not import this file.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getRazorpayCredentials } from "./razorpay-credentials";

/** Authoritative mapping from Razorpay subscription.status → our internal status. */
export const RZP_STATUS_TO_INTERNAL: Record<string, string> = {
  created: "trialing",
  authenticated: "trialing",
  active: "active",
  pending: "past_due",
  halted: "past_due",
  cancelled: "canceled",
  completed: "canceled",
  expired: "canceled",
  paused: "paused",
};

export type RazorpayClient = {
  subscriptions: {
    create: (opts: Record<string, unknown>) => Promise<RazorpaySubscription>;
    fetch: (id: string) => Promise<RazorpaySubscription>;
    cancel: (id: string, body?: { cancel_at_cycle_end?: 0 | 1 }) => Promise<RazorpaySubscription>;
    update: (id: string, body: Record<string, unknown>) => Promise<RazorpaySubscription>;
  };
  customers: {
    create: (opts: Record<string, unknown>) => Promise<RazorpayCustomer>;
    fetch: (id: string) => Promise<RazorpayCustomer>;
  };
  invoices: {
    fetch: (id: string) => Promise<RazorpayInvoice>;
  };
};

export interface RazorpaySubscription {
  id: string;
  status: string;
  plan_id: string;
  customer_id?: string;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  start_at?: number | null;
  short_url?: string | null;
  total_count?: number | null;
  paid_count?: number | null;
  remaining_count?: number | null;
  notes?: Record<string, string> | null;
}

export interface RazorpayCustomer {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string> | null;
}

export interface RazorpayInvoice {
  id: string;
  status: string;
  amount_paid?: number;
  amount?: number;
  currency?: string;
  subscription_id?: string;
  payment_id?: string | null;
  short_url?: string | null;
  issued_at?: number | null;
  paid_at?: number | null;
  notes?: Record<string, string> | null;
}

/** Create a Razorpay SDK client using the default (main) profile credentials. */
export async function getRazorpayClient(): Promise<RazorpayClient> {
  const { keyId, keySecret } = getRazorpayCredentials("default");
  const Razorpay = (await import("razorpay")).default;
  return new Razorpay({ key_id: keyId, key_secret: keySecret }) as unknown as RazorpayClient;
}

/**
 * Razorpay sends webhooks with an `x-razorpay-signature` header — HMAC SHA256
 * of the *raw* body using the webhook secret. We use timingSafeEqual to avoid
 * leaking validation timing.
 *
 * Fails CLOSED (returns false) for any ambiguity. Callers should reject with
 * 401 when this returns false.
 */
export function verifySubscriptionWebhookSignature(rawBody: string, signature: string): boolean {
  if (!rawBody || !signature) return false;
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_WEBHOOK_SECRET_LIVE ||
    process.env.RAZORPAY_WEBHOOK_SECRET_TEST;
  if (!secret) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unixToIso(n: number | null | undefined): string | null {
  if (!n || Number.isNaN(n)) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * Normalise a subscription payload from Razorpay into the columns we store
 * on `public.subscriptions` (minus organization_id / plan_id which are
 * resolved by the caller from local state).
 */
export function mapRazorpaySubscriptionToRow(sub: RazorpaySubscription): {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  razorpay_subscription_id: string;
  razorpay_customer_id: string | null;
} {
  return {
    status: RZP_STATUS_TO_INTERNAL[sub.status] ?? "active",
    current_period_start: unixToIso(sub.current_start),
    current_period_end: unixToIso(sub.current_end),
    razorpay_subscription_id: sub.id,
    razorpay_customer_id: sub.customer_id ?? null,
  };
}
