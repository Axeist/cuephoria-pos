/**
 * Razorpay subscription helpers — used by /api/tenant/billing and
 * /api/razorpay/webhook. Node-only (crypto + razorpay SDK).
 *
 * Design notes (rewritten May 2026 per spec):
 *
 * - We use the official `razorpay` SDK for `subscriptions.create` and
 *   `subscriptions.fetch` only — these are battle-tested in this codebase.
 *
 * - Everything else (PATCH update, pause, resume, cancel, list invoices,
 *   cancel scheduled changes) goes through `rzpFetch`, a tiny HTTPS helper
 *   that calls api.razorpay.com directly with HTTP Basic Auth. This avoids
 *   surprises if a future SDK version renames or drops a method.
 *
 * - `verifySubscriptionWebhookSignature` is retained so that callers outside
 *   the unified /api/razorpay/webhook dispatcher can still verify if needed.
 *   The dispatcher already verifies signatures at the edge, so the
 *   subscription webhook handler does NOT re-verify (single source of truth).
 *
 * - subscriptions.status keeps the INTERNAL bucket vocabulary that the rest
 *   of the app (platform admin actions, organization settings) depends on.
 *   The new subscriptions.razorpay_status column carries the verbatim 9-state
 *   Razorpay value for the new Billing UI.
 */

import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { getRazorpayCredentials } from "./razorpay-credentials.js";

// ---------------------------------------------------------------------------
// Status mapping — Razorpay -> internal bucket
// ---------------------------------------------------------------------------

/**
 * Map a Razorpay subscription.status to the internal vocabulary used by
 * public.subscriptions.status. The internal vocab is what
 * src/server/handlers/platform/organization-action.ts and
 * src/pages/OrganizationSettings.tsx already key on; do NOT change this map
 * without auditing those consumers.
 */
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

/** All 9 verbatim Razorpay statuses, used for typing and the UI badge map. */
export type RazorpayStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused";

// ---------------------------------------------------------------------------
// SDK client (create / fetch only)
// ---------------------------------------------------------------------------

export type RazorpayClient = {
  subscriptions: {
    create: (opts: Record<string, unknown>) => Promise<RazorpaySubscription>;
    fetch: (id: string) => Promise<RazorpaySubscription>;
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
  end_at?: number | null;
  short_url?: string | null;
  total_count?: number | null;
  paid_count?: number | null;
  remaining_count?: number | null;
  notes?: Record<string, string> | null;
}

export interface RazorpayInvoice {
  id: string;
  status: string;
  amount?: number;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  subscription_id?: string | null;
  payment_id?: string | null;
  short_url?: string | null;
  issued_at?: number | null;
  paid_at?: number | null;
  expire_by?: number | null;
  period_start?: number | null;
  period_end?: number | null;
  notes?: Record<string, string> | null;
}

/** Create a Razorpay SDK client using the default (main) profile credentials. */
export async function getRazorpayClient(): Promise<RazorpayClient> {
  const { keyId, keySecret } = getRazorpayCredentials("default");
  const Ctor = Razorpay as unknown as new (opts: { key_id: string; key_secret: string }) => RazorpayClient;
  return new Ctor({ key_id: keyId, key_secret: keySecret }) as RazorpayClient;
}

// ---------------------------------------------------------------------------
// rzpFetch — direct REST helper for operations the SDK declarations don't
// cover safely across versions (PATCH update, pause, resume, cancel,
// list invoices, cancel scheduled changes).
// ---------------------------------------------------------------------------

export interface RazorpayApiError extends Error {
  status: number;
  description?: string;
  code?: string;
  body?: unknown;
}

function buildBasicAuthHeader(): string {
  const { keyId, keySecret } = getRazorpayCredentials("default");
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Direct Razorpay REST call. Path must start with a slash (e.g. "/subscriptions/sub_xxx/pause").
 * Returns the parsed JSON body, or throws a RazorpayApiError on non-2xx.
 */
export async function rzpFetch<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `https://api.razorpay.com/v1${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: buildBasicAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown = null;
  if (text.trim().length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errBody =
      parsed && typeof parsed === "object" && parsed !== null
        ? (parsed as { error?: { description?: string; code?: string } }).error ?? null
        : null;
    const description = errBody?.description || `Razorpay ${method} ${path} failed (${res.status})`;
    const err = new Error(description) as RazorpayApiError;
    err.status = res.status;
    err.description = errBody?.description;
    err.code = errBody?.code;
    err.body = parsed;
    throw err;
  }

  return parsed as T;
}

// ---------------------------------------------------------------------------
// Signature verification (subscription checkout + webhook)
// ---------------------------------------------------------------------------

/**
 * Verify subscription Checkout success payload.
 * @see https://razorpay.com/docs/api/payments/subscriptions/#payment-verification
 */
export function verifySubscriptionCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  apiKeySecret: string,
): boolean {
  if (!paymentId || !subscriptionId || !signature || !apiKeySecret) return false;
  const payload = `${paymentId}|${subscriptionId}`;
  const expected = createHmac("sha256", apiKeySecret).update(payload).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verify a Razorpay webhook signature. Retained for callers outside the
 * unified /api/razorpay/webhook dispatcher; the dispatcher already verifies
 * at the edge so the subscription handler does NOT re-verify (single source).
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function unixToIso(n: number | null | undefined): string | null {
  if (!n || Number.isNaN(n)) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * Project a Razorpay subscription resource into the full set of
 * public.subscriptions columns the new schema understands.
 *
 * organization_id / plan_id are resolved by the caller from local state.
 */
export function mapRazorpaySubscriptionToRow(sub: RazorpaySubscription): {
  status: string;
  razorpay_status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  start_at: string | null;
  end_at: string | null;
  charge_at: string | null;
  total_count: number | null;
  paid_count: number;
  remaining_count: number | null;
  razorpay_subscription_id: string;
  razorpay_customer_id: string | null;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string | null;
} {
  return {
    status: RZP_STATUS_TO_INTERNAL[sub.status] ?? "active",
    razorpay_status: sub.status,
    current_period_start: unixToIso(sub.current_start),
    current_period_end: unixToIso(sub.current_end),
    start_at: unixToIso(sub.start_at),
    end_at: unixToIso(sub.end_at),
    charge_at: unixToIso(sub.charge_at),
    total_count: typeof sub.total_count === "number" ? sub.total_count : null,
    paid_count: typeof sub.paid_count === "number" ? sub.paid_count : 0,
    remaining_count: typeof sub.remaining_count === "number" ? sub.remaining_count : null,
    razorpay_subscription_id: sub.id,
    razorpay_customer_id: sub.customer_id ?? null,
    provider: "razorpay",
    provider_subscription_id: sub.id,
    provider_customer_id: sub.customer_id ?? null,
  };
}

/**
 * Build the `notes` map persisted on every Razorpay subscription. Used by the
 * webhook handler to resolve the originating organization without an extra
 * DB lookup. Subscriptions are org-scoped (no outlet_id) by product decision.
 */
export function buildSubscriptionNotes(args: {
  organizationId: string;
  organizationSlug: string;
  planTier: string;
  billingCycle: "month" | "year";
  adminUserId: string;
}): Record<string, string> {
  return {
    organization_id: String(args.organizationId),
    organization_slug: String(args.organizationSlug),
    plan_tier: String(args.planTier),
    billing_cycle: String(args.billingCycle),
    admin_user_id: String(args.adminUserId),
  };
}

/** A subscription state from which we can safely mint a fresh subscription. */
export function isTerminalRazorpayStatus(status: string | null | undefined): boolean {
  return status === "cancelled" || status === "completed" || status === "expired";
}

/** A non-terminal Razorpay status that means an existing sub is still usable. */
export function isReusableRazorpayStatus(status: string | null | undefined): boolean {
  return status === "created" || status === "authenticated" || status === "active";
}
