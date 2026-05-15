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
import Razorpay from "razorpay";
import { getRazorpayCredentials } from "./razorpay-credentials.js";

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

/**
 * Razorpay payment token — what the subscription auto-debits on each cycle.
 * The `card` field is what we expose to tenants as "card on file".
 */
export interface RazorpayToken {
  id: string;
  entity: string;
  token: string;
  method: "card" | "upi" | "emandate" | string;
  recurring: boolean;
  recurring_details?: { status?: string; failure_reason?: string | null } | null;
  card?: {
    last4?: string;
    network?: string;
    type?: string;
    issuer?: string | null;
    international?: boolean;
    emi?: boolean;
    sub_type?: string | null;
  } | null;
  vpa?: { username?: string; handle?: string; name?: string | null } | null;
  bank?: string | null;
  wallet?: string | null;
  used_at?: number | null;
  created_at?: number | null;
}

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
  /** Static import so Vercel / esbuild traces `razorpay` into the Node bundle (dynamic import was often omitted). */
  const Ctor = Razorpay as unknown as new (opts: { key_id: string; key_secret: string }) => RazorpayClient;
  return new Ctor({ key_id: keyId, key_secret: keySecret }) as RazorpayClient;
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

/**
 * UI-friendly card / payment-instrument summary for the billing page.
 * Returned by `getPaymentInstrumentForCustomer` and embedded in the
 * GET /api/tenant/billing response.
 */
export type PaymentInstrumentSummary =
  | {
      kind: "card";
      last4: string;
      network: string | null;
      type: string | null;
      issuer: string | null;
    }
  | { kind: "upi"; vpa: string }
  | { kind: "emandate"; bank: string | null }
  | { kind: "wallet"; provider: string | null }
  | { kind: "none" };

/**
 * Fetch the active recurring token Razorpay is auto-debiting against for the
 * given customer. Cards are preferred (most common), then UPI/eMandate/wallet
 * fall-throughs. Never throws — returns `{ kind: "none" }` on failure so the
 * billing page can degrade gracefully.
 */
async function listCustomerTokens(client: RazorpayClient, customerId: string): Promise<RazorpayToken[]> {
  const c = client.customers as unknown as {
    fetchTokens?: (id: string) => Promise<{ items?: RazorpayToken[] }>;
    allTokens?: (id: string) => Promise<{ items?: RazorpayToken[] }>;
  };
  try {
    if (typeof c.fetchTokens === "function") {
      const res = await c.fetchTokens(customerId);
      return res?.items ?? [];
    }
    if (typeof c.allTokens === "function") {
      const res = await c.allTokens(customerId);
      return res?.items ?? [];
    }
  } catch {
    return [];
  }
  return [];
}

export async function getPaymentInstrumentForCustomer(
  client: RazorpayClient,
  customerId: string | null,
): Promise<PaymentInstrumentSummary> {
  if (!customerId) return { kind: "none" };
  const tokens = await listCustomerTokens(client, customerId);

  const recurring = tokens.filter((t) => t.recurring);
  const candidates = recurring.length ? recurring : tokens;
  if (candidates.length === 0) return { kind: "none" };

  candidates.sort((a, b) => (b.used_at ?? b.created_at ?? 0) - (a.used_at ?? a.created_at ?? 0));
  const top = candidates[0];

  if (top.method === "card" && top.card?.last4) {
    return {
      kind: "card",
      last4: top.card.last4,
      network: top.card.network ?? null,
      type: top.card.type ?? null,
      issuer: top.card.issuer ?? null,
    };
  }
  if (top.method === "upi" && top.vpa) {
    const vpa =
      typeof top.vpa === "object" && top.vpa
        ? `${top.vpa.username ?? ""}@${top.vpa.handle ?? ""}`.replace(/^@$/, "")
        : "";
    return { kind: "upi", vpa: vpa || "upi" };
  }
  if (top.method === "emandate") {
    return { kind: "emandate", bank: top.bank ?? null };
  }
  if (top.wallet) {
    return { kind: "wallet", provider: top.wallet };
  }
  return { kind: "none" };
}
