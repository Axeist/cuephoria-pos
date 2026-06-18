/**
 * Razorpay payment reconciler (Node-only).
 *
 * Reached at /api/razorpay/reconcile via the api/razorpay/[action].ts
 * dispatcher (so we add ZERO new Vercel function files).
 *
 * Two callers, two auth modes:
 *
 *   1. pg_cron (every 15s)    → POST,  header `x-cron-secret`         (sweep)
 *   2. Manual UI re-check     → POST,  body `{ order_id: "..." }`     (no auth)
 *
 * Single-order rechecks are unauthenticated on purpose: they can only
 * convert a Razorpay-paid order into the booking that customer already
 * paid for, and they are gated by the Razorpay-side payment record. There
 * is no privilege escalation surface. The sweep path is still secret-gated
 * because it is an unbounded background job.
 *
 * The handler:
 *   - Claims a batch of stuck `payment_orders` rows via the
 *     `claim_payment_orders_for_reconcile` RPC (FOR UPDATE SKIP LOCKED).
 *   - For each, polls Razorpay (orders.fetchPayments) using the row's
 *     stored `profile` (so main vs lite is deterministic).
 *   - On a captured/authorized payment → calls
 *     `materializeBookingFromPaymentOrder`. On amount mismatch → marks
 *     `failed`. On no payment after 30 min → marks `expired` and releases
 *     stale slot_blocks.
 *   - Always returns 200 (even on per-row errors) so neither pg_cron nor
 *     Vercel Cron retry-storm.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRazorpayCredentials, type RazorpayProfile } from "../../lib/razorpay-credentials.js";
import { materializeBookingFromPaymentOrder } from "../../lib/materialize-booking.js";

export const config = {
  maxDuration: 30,
};

type VercelRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  end: () => void;
};

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  return undefined;
}

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-cron-secret");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

function readHeader(req: VercelRequest, name: string): string {
  const v = req.headers?.[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] || "";
  return (v as string | undefined) || "";
}

function authorize(req: VercelRequest): boolean {
  const x = readHeader(req, "x-cron-secret");
  const reconcileSecret = getEnv("RECONCILE_CRON_SECRET");
  if (reconcileSecret && x && x === reconcileSecret) return true;

  // Bearer fallback (kept for parity with Razorpay-style admin tooling).
  const auth = readHeader(req, "authorization");
  if (reconcileSecret && auth === `Bearer ${reconcileSecret}`) return true;

  return false;
}

let cachedSupabase: SupabaseClient | null = null;
async function getSupabase(): Promise<SupabaseClient> {
  if (cachedSupabase) return cachedSupabase;
  const { createClient } = await import("@supabase/supabase-js");
  const url =
    getEnv("SUPABASE_URL") ||
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    getEnv("VITE_SUPABASE_URL");
  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url) throw new Error("Supabase URL not configured");
  if (!key) throw new Error("Supabase key not configured");
  cachedSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuephoria-reconciler" } },
  });
  return cachedSupabase;
}

type PaymentOrderRow = {
  id: string;
  provider: string;
  profile: string;
  status: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount_paise: number;
  location_id: string | null;
  customer_phone: string | null;
  booking_payload: Record<string, unknown>;
  reconcile_attempts: number;
  created_at: string;
};

type RazorpayPaymentEntity = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  order_id: string;
};

async function fetchOrderPayments(
  orderId: string,
  profile: RazorpayProfile,
): Promise<RazorpayPaymentEntity[]> {
  const Razorpay = (await import("razorpay")).default;
  const { keyId, keySecret } = getRazorpayCredentials(profile);
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  // razorpay.orders.fetchPayments returns { entity: 'collection', count, items: Payment[] }
  const res = (await razorpay.orders.fetchPayments(orderId)) as unknown as {
    items?: RazorpayPaymentEntity[];
  };
  return Array.isArray(res?.items) ? res.items : [];
}

async function expireRow(supabase: SupabaseClient, row: PaymentOrderRow, reason: string) {
  await supabase
    .from("payment_orders")
    .update({
      status: "expired",
      last_error: reason,
    })
    .eq("id", row.id);

  // Release any stale slot_blocks held for this order.
  try {
    const payload = row.booking_payload as {
      selectedStations?: string[];
      s?: string[];
      selectedDateISO?: string;
      d?: string;
      slots?: Array<{ start_time?: string; end_time?: string; s?: string; e?: string }>;
      t?: Array<{ start_time?: string; end_time?: string; s?: string; e?: string }>;
    };
    const stations: string[] = payload.selectedStations || payload.s || [];
    const date: string = payload.selectedDateISO || payload.d || "";
    const slots = (payload.slots || payload.t || []).map((s) => ({
      start_time: s.start_time ?? s.s ?? "",
      end_time: s.end_time ?? s.e ?? "",
    }));
    if (stations.length > 0 && date) {
      for (const slot of slots) {
        await supabase
          .from("slot_blocks")
          .delete()
          .in("station_id", stations)
          .eq("booking_date", date)
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time)
          .eq("is_confirmed", false);
      }
    }
  } catch (err) {
    console.warn("[reconcile] slot_blocks cleanup failed:", (err as Error).message);
  }
}

async function processRow(
  supabase: SupabaseClient,
  row: PaymentOrderRow,
): Promise<"paid" | "pending" | "expired" | "failed" | "error"> {
  const profile: RazorpayProfile = row.profile === "lite" ? "lite" : "default";
  let payments: RazorpayPaymentEntity[] = [];
  try {
    payments = await fetchOrderPayments(row.provider_order_id, profile);
  } catch (err) {
    const message = (err as Error)?.message || String(err);
    await supabase
      .from("payment_orders")
      .update({ last_error: `razorpay fetchPayments: ${message}` })
      .eq("id", row.id);
    return "error";
  }

  const captured = payments.find(
    (p) => p.status === "captured" || p.status === "authorized",
  );

  if (captured) {
    try {
      const outcome = await materializeBookingFromPaymentOrder({
        orderId: row.provider_order_id,
        paymentId: captured.id,
        paymentAmountPaise: Number(captured.amount) || 0,
        source: "reconciler",
      });
      if (outcome.status === "amount_mismatch") return "failed";
      return "paid";
    } catch (err) {
      const message = (err as Error)?.message || String(err);
      await supabase
        .from("payment_orders")
        .update({ last_error: `materialize: ${message}` })
        .eq("id", row.id);
      return "error";
    }
  }

  // No captured payment — expire if the order has been pending too long.
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs > 30 * 60 * 1000) {
    await expireRow(supabase, row, "no captured payment after 30 minutes");
    return "expired";
  }

  return "pending";
}

async function processSingleOrder(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ ok: boolean; status: string; message?: string }> {
  const { data: row } = await supabase
    .from("payment_orders")
    .select(
      "id, provider, profile, status, provider_order_id, provider_payment_id, amount_paise, location_id, customer_phone, booking_payload, reconcile_attempts, created_at",
    )
    .eq("provider", "razorpay")
    .eq("provider_order_id", orderId)
    .maybeSingle();

  if (!row) {
    return { ok: false, status: "not_found", message: "no payment_orders row for that order_id" };
  }

  const typed = row as PaymentOrderRow;
  if (typed.status === "paid" || typed.status === "reconciled") {
    return { ok: true, status: typed.status };
  }

  // Bump last_reconciled_at + attempts so the UI shows progress.
  await supabase
    .from("payment_orders")
    .update({
      last_reconciled_at: new Date().toISOString(),
      reconcile_attempts: (typed.reconcile_attempts || 0) + 1,
      status: typed.status === "created" ? "pending" : typed.status,
    })
    .eq("id", typed.id);

  const outcome = await processRow(supabase, typed);
  return { ok: outcome !== "error", status: outcome };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  // Parse body up-front so we can branch on order_id BEFORE the auth gate.
  // Manual single-order rechecks (POST { order_id }) are intentionally
  // unauthenticated — they can only convert a Razorpay-paid order into
  // the booking the customer already paid for. The sweep path remains
  // secret-gated because it is an unbounded background job.
  let body: Record<string, unknown> = {};
  if (req.method === "POST" && req.body) {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : (req.body as Record<string, unknown>)) || {};
  }
  const isSingleOrderRecheck =
    req.method === "POST" &&
    typeof body.order_id === "string" &&
    (body.order_id as string).length > 0;

  if (!isSingleOrderRecheck && !authorize(req)) {
    return j(res, { ok: false, error: "Unauthorized" }, 401);
  }

  const supabase = await getSupabase();

  if (isSingleOrderRecheck) {
    try {
      const single = await processSingleOrder(supabase, body.order_id as string);
      return j(res, { ok: single.ok, mode: "single", ...single });
    } catch (err) {
      console.error("[reconcile single] threw:", err);
      return j(res, { ok: false, error: (err as Error).message }, 500);
    }
  }

  // Sweep mode (pg_cron / Vercel Cron).
  const startedAt = Date.now();
  const tally = { scanned: 0, paid: 0, pending: 0, expired: 0, failed: 0, errors: 0 };
  try {
    const { data: claimed, error: claimErr } = await supabase.rpc(
      "claim_payment_orders_for_reconcile",
      { p_limit: 25 },
    );
    if (claimErr) {
      console.error("[reconcile] claim RPC error:", claimErr);
      return j(res, { ok: false, error: claimErr.message }, 200);
    }

    const rows = (claimed as PaymentOrderRow[] | null) || [];
    tally.scanned = rows.length;

    for (const row of rows) {
      // Bound the work per invocation to stay well under maxDuration.
      if (Date.now() - startedAt > 24_000) break;
      try {
        const outcome = await processRow(supabase, row);
        switch (outcome) {
          case "paid":    tally.paid    += 1; break;
          case "pending": tally.pending += 1; break;
          case "expired": tally.expired += 1; break;
          case "failed":  tally.failed  += 1; break;
          case "error":   tally.errors  += 1; break;
        }
      } catch (err) {
        tally.errors += 1;
        console.error("[reconcile row] threw:", err, "row:", row.provider_order_id);
      }
    }
  } catch (err) {
    console.error("[reconcile sweep] threw:", err);
    return j(res, { ok: false, error: (err as Error).message, ...tally }, 200);
  }

  return j(res, { ok: true, mode: "sweep", elapsedMs: Date.now() - startedAt, ...tally });
}
