/**
 * Edge-compatible Razorpay REST client.
 *
 * We use direct `fetch` against api.razorpay.com with HTTP Basic Auth so the
 * tenant billing endpoints can run on the Vercel edge runtime (same footprint
 * as the rest of the admin/tenant API surface).
 *
 * The Node-only webhook continues to use the SDK — signature verification
 * needs Node's `crypto.timingSafeEqual`, which isn't fully mirrored at the
 * edge (Web Crypto has no constant-time compare primitive).
 */

import { getRazorpayCredentials } from "./lib/razorpay-credentials";

export type RazorpayMode = "test" | "live";

type Creds = { keyId: string; keySecret: string; isLive: boolean };

function normalizeCredential(raw: string | undefined): string {
  const trimmed = String(raw ?? "").trim();
  // Defensively strip wrapping quotes if a value was pasted into host env vars as `"value"`.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** Returns the Razorpay credentials for the *main* (default) profile. */
export function getRazorpayCreds(): Creds {
  const base = getRazorpayCredentials("default");
  const keyId = normalizeCredential(base.keyId);
  const keySecret = normalizeCredential(base.keySecret);
  if (!keyId || !keySecret) {
    throw new Error("Missing or invalid Razorpay credentials after normalization.");
  }

  return { keyId, keySecret, isLive: base.isLive };
}

function authHeader(creds: Creds): string {
  const token = btoa(`${creds.keyId}:${creds.keySecret}`);
  return `Basic ${token}`;
}

const BASE = "https://api.razorpay.com/v1";

type RzpRequestInit = { method: "GET" | "POST"; body?: unknown };

async function doRzpFetch(path: string, init: RzpRequestInit, creds: Creds): Promise<Response> {
  const isGet = init.method === "GET";
  return fetch(`${BASE}${path}`, {
    method: init.method,
    headers: {
      // Use permissive accept for compatibility with intermediary proxies/WAFs.
      Accept: "*/*",
      Authorization: authHeader(creds),
      ...(isGet ? {} : { "content-type": "application/json" }),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

async function rzp<T>(
  path: string,
  init: RzpRequestInit = { method: "GET" },
): Promise<T> {
  const creds = getRazorpayCreds();
  let res = await doRzpFetch(path, init, creds);
  // Some environments surface a 406 on GETs due aggressive content negotiation.
  // Retry once with the most minimal header set before failing hard.
  if (res.status === 406 && init.method === "GET") {
    res = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: { Authorization: authHeader(creds) },
    });
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const providerError = (json as { error?: { description?: string; code?: string; reason?: string } })?.error;
    const msg =
      providerError?.description ||
      providerError?.reason ||
      providerError?.code ||
      `Razorpay ${init.method} ${path} failed with ${res.status}${text ? `: ${text.slice(0, 220)}` : ""}`;
    throw new RazorpayRestError(msg, res.status, json);
  }
  return json as T;
}

export class RazorpayRestError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Domain types (a trimmed subset of Razorpay's response shape)
// ---------------------------------------------------------------------------
export interface RzpSubscription {
  id: string;
  plan_id: string;
  customer_id?: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  start_at?: number | null;
  charge_at?: number | null;
  short_url?: string | null;
  notes?: Record<string, string> | null;
  total_count?: number | null;
  paid_count?: number | null;
  remaining_count?: number | null;
}

export interface RzpCustomer {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string> | null;
}

export interface RzpInvoice {
  id: string;
  status: string;
  amount?: number;
  amount_paid?: number;
  currency?: string;
  subscription_id?: string | null;
  payment_id?: string | null;
  short_url?: string | null;
  period_start?: number | null;
  period_end?: number | null;
  paid_at?: number | null;
  issued_at?: number | null;
  line_items?: Array<{
    id?: string;
    name?: string;
    description?: string;
    amount?: number;
    unit_amount?: number;
    quantity?: number;
  }>;
}

export interface RzpPlan {
  id: string;
  period?: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  item?: {
    name?: string;
    description?: string;
    amount?: number;
    currency?: string;
  };
  notes?: Record<string, string> | null;
}

type RzpListResponse<T> = {
  entity: "collection";
  count: number;
  items: T[];
};

// ---------------------------------------------------------------------------
// Subscription + customer endpoints
// ---------------------------------------------------------------------------
export function createRzpCustomer(body: {
  name: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
}): Promise<RzpCustomer> {
  return rzp<RzpCustomer>("/customers", { method: "POST", body });
}

export function createRzpSubscription(body: {
  plan_id: string;
  customer_id?: string;
  total_count: number;
  quantity?: number;
  start_at?: number;
  notes?: Record<string, string>;
  customer_notify?: 0 | 1;
}): Promise<RzpSubscription> {
  return rzp<RzpSubscription>("/subscriptions", { method: "POST", body });
}

export function createRzpPlan(body: {
  period: "monthly" | "yearly";
  interval: number;
  item: {
    name: string;
    amount: number;
    currency: string;
    description?: string;
  };
  notes?: Record<string, string>;
}): Promise<RzpPlan> {
  return rzp<RzpPlan>("/plans", { method: "POST", body });
}

export function listRzpPlans(opts: { count?: number; skip?: number } = {}): Promise<RzpListResponse<RzpPlan>> {
  const qs = new URLSearchParams();
  qs.set("count", String(opts.count ?? 100));
  if (typeof opts.skip === "number" && opts.skip > 0) qs.set("skip", String(opts.skip));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return rzp<RzpListResponse<RzpPlan>>(`/plans${suffix}`, { method: "GET" });
}

export function fetchRzpSubscription(id: string): Promise<RzpSubscription> {
  return rzp<RzpSubscription>(`/subscriptions/${encodeURIComponent(id)}`, { method: "GET" });
}

export function cancelRzpSubscription(
  id: string,
  opts: { immediately?: boolean } = {},
): Promise<RzpSubscription> {
  return rzp<RzpSubscription>(`/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { cancel_at_cycle_end: opts.immediately ? 0 : 1 },
  });
}

export function updateRzpSubscription(
  id: string,
  body: { plan_id?: string; quantity?: number; schedule_change_at?: "now" | "cycle_end" },
): Promise<RzpSubscription> {
  return rzp<RzpSubscription>(`/subscriptions/${encodeURIComponent(id)}`, {
    method: "POST",
    body,
  });
}

export function listRzpInvoices(opts: {
  subscription_id?: string;
  count?: number;
  skip?: number;
} = {}): Promise<RzpListResponse<RzpInvoice>> {
  const qs = new URLSearchParams();
  if (opts.subscription_id) qs.set("subscription_id", opts.subscription_id);
  qs.set("count", String(opts.count ?? 24));
  if (typeof opts.skip === "number" && opts.skip > 0) qs.set("skip", String(opts.skip));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return rzp<RzpListResponse<RzpInvoice>>(`/invoices${suffix}`, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Status mapping + date helpers
// ---------------------------------------------------------------------------
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

export function unixToIso(n: number | null | undefined): string | null {
  if (!n || Number.isNaN(n)) return null;
  return new Date(n * 1000).toISOString();
}

export function mapRzpSubToRow(sub: RzpSubscription): {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  razorpay_subscription_id: string;
  razorpay_customer_id: string | null;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string | null;
} {
  return {
    status: RZP_STATUS_TO_INTERNAL[sub.status] ?? "active",
    current_period_start: unixToIso(sub.current_start),
    current_period_end: unixToIso(sub.current_end),
    razorpay_subscription_id: sub.id,
    razorpay_customer_id: sub.customer_id ?? null,
    provider: "razorpay",
    provider_subscription_id: sub.id,
    provider_customer_id: sub.customer_id ?? null,
  };
}
