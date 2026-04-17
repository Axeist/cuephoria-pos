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

export type RazorpayMode = "test" | "live";

type Creds = { keyId: string; keySecret: string; isLive: boolean };

function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  const deno = (globalThis as { Deno?: { env?: { get?: (n: string) => string | undefined } } }).Deno;
  return deno?.env?.get?.(name);
}

function needEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/** Returns the Razorpay credentials for the *main* (default) profile. */
export function getRazorpayCreds(): Creds {
  const mode = (env("RAZORPAY_MODE") || "test").toLowerCase();
  const isLive = mode === "live";

  const keyId = isLive
    ? env("RAZORPAY_KEY_ID_LIVE") || env("RAZORPAY_KEY_ID") || needEnv("RAZORPAY_KEY_ID_LIVE")
    : env("RAZORPAY_KEY_ID_TEST") || env("RAZORPAY_KEY_ID") || needEnv("RAZORPAY_KEY_ID_TEST");

  const keySecret = isLive
    ? env("RAZORPAY_KEY_SECRET_LIVE") || env("RAZORPAY_KEY_SECRET") || needEnv("RAZORPAY_KEY_SECRET_LIVE")
    : env("RAZORPAY_KEY_SECRET_TEST") || env("RAZORPAY_KEY_SECRET") || needEnv("RAZORPAY_KEY_SECRET_TEST");

  return { keyId, keySecret, isLive };
}

function authHeader(creds: Creds): string {
  const token = btoa(`${creds.keyId}:${creds.keySecret}`);
  return `Basic ${token}`;
}

const BASE = "https://api.razorpay.com/v1";

async function rzp<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<T> {
  const creds = getRazorpayCreds();
  const res = await fetch(`${BASE}${path}`, {
    method: init.method,
    headers: {
      "content-type": "application/json",
      authorization: authHeader(creds),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      (json as { error?: { description?: string; code?: string } })?.error?.description ||
      `Razorpay ${init.method} ${path} failed with ${res.status}`;
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
