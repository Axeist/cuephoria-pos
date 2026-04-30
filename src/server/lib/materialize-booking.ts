/**
 * materialize-booking.ts (Node-only)
 *
 * The single, idempotent booking-materialisation helper used by:
 *   - api/razorpay/webhook.ts                    (real-time path)
 *   - src/server/handlers/razorpay/reconcile.ts  (cron safety net)
 *   - src/server/handlers/bookings/materialize.ts (success page)
 *
 * Three independent paths converge here. Whoever wins the race writes the
 * booking + bill rows; the others detect "already exists" and short-circuit
 * cleanly. The DB-level partial unique index
 *   bookings_no_double_book_idx (location_id, station_id, booking_date, start_time)
 *   WHERE status IN ('confirmed','in-progress')
 * is the final hard guard against double-booking.
 *
 * Re-running this helper for the same (orderId, paymentId) is always safe.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRazorpayOrderWithMerchantFallback } from "./razorpay-fetch-order.js";
import { PAYMENT_ORDER_PENDING_TTL_MS } from "./payment-order-ttl.js";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type MaterializeSource = "webhook" | "reconciler" | "success_page";

export type MaterializeArgs = {
  orderId: string;
  paymentId: string;
  /** Razorpay payment.amount (paise). Verified against payment_orders.amount_paise. */
  paymentAmountPaise: number;
  source: MaterializeSource;
};

export type MaterializeStatus =
  | "created"          // booking + bill written by this call
  | "already_exists"   // booking + bill already present (idempotent)
  | "amount_mismatch"  // payment.amount != payment_orders.amount_paise — refused
  | "order_unknown"    // no payment_orders row and Razorpay notes had no payload
  | "no_op";           // payment_orders already finalized (e.g. paid by another caller)

export type MaterializeOutcome = {
  status: MaterializeStatus;
  bookingIds: string[];
  billId: string | null;
  paymentOrderId: string | null;
  message?: string;
};

// Loosely-typed booking payload (matches what PublicBooking.tsx sends).
type BookingPayload = {
  selectedStations?: string[];
  s?: string[];
  selectedDateISO?: string;
  d?: string;
  slots?: Array<{ start_time: string; end_time: string } | { s: string; e: string }>;
  t?: Array<{ s: string; e: string } | { start_time: string; end_time: string }>;
  duration?: number;
  du?: number;
  dur?: number;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    id?: string;
  };
  c?: { n?: string; p?: string; e?: string; i?: string };
  cust?: { n?: string; name?: string; p?: string; phone?: string; e?: string; email?: string; i?: string; id?: string };
  pricing?: {
    original?: number;
    discount?: number;
    final?: number;
    transactionFee?: number;
    totalWithFee?: number;
    coupons?: string;
  };
  p?: { o?: number; d?: number; f?: number; tf?: number; twf?: number };
  price?: { o?: number; d?: number; f?: number; original?: number; discount?: number; final?: number };
  cp?: string;
  coup?: string;
  coupons?: string;
  locationId?: string;
  profile?: "default" | "lite";
};

type NormalizedPayload = {
  selectedStations: string[];
  selectedDateISO: string;
  slots: Array<{ start_time: string; end_time: string }>;
  duration: number;
  customer: { id?: string; name: string; phone: string; email?: string };
  pricing: { original: number; discount: number; final: number; coupons: string };
  locationId: string | null;
};

type PaymentOrderRow = {
  id: string;
  provider: string;
  profile: string;
  status: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount_paise: number;
  location_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  booking_payload: BookingPayload;
  notes: Record<string, unknown> | null;
  materialized_booking_ids: string[] | null;
  materialized_bill_id: string | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Supabase service-role client
// ────────────────────────────────────────────────────────────────────────────

function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  return undefined;
}

let cachedClient: SupabaseClient | null = null;
async function getSupabase(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;
  const { createClient } = await import("@supabase/supabase-js");
  const url =
    env("SUPABASE_URL") ||
    env("NEXT_PUBLIC_SUPABASE_URL") ||
    env("VITE_SUPABASE_URL");
  const key =
    env("SUPABASE_SERVICE_ROLE_KEY") ||
    env("SUPABASE_SERVICE_KEY") ||
    env("SUPABASE_ANON_KEY") ||
    env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url) throw new Error("Supabase URL not configured");
  if (!key) throw new Error("Supabase key not configured");
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuephoria-materialize-booking" } },
  });
  return cachedClient;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function normalizePhoneNumber(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function generateCustomerID(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = String(timeStr).split(":").map(Number);
  return h * 60 + m;
}

function normalizeBookingPayload(raw: BookingPayload | string): NormalizedPayload {
  const data: BookingPayload = typeof raw === "string" ? JSON.parse(raw) : raw;

  const selectedStations: string[] = data.selectedStations || data.s || [];
  const selectedDateISO: string = data.selectedDateISO || data.d || "";

  const rawSlots: Array<{ start_time?: string; end_time?: string; s?: string; e?: string }> =
    (data.slots as Array<{ start_time?: string; end_time?: string; s?: string; e?: string }>) ||
    (data.t as Array<{ s?: string; e?: string }>) ||
    [];
  const slots = rawSlots.map((s) => ({
    start_time: s.start_time ?? s.s ?? "",
    end_time: s.end_time ?? s.e ?? "",
  }));

  const duration = Number(data.duration ?? data.du ?? data.dur ?? 60);

  const customerSrc = data.customer || data.c || data.cust || {};
  const customer = {
    id: (customerSrc as { id?: string; i?: string }).id ?? (customerSrc as { i?: string }).i,
    name: ((customerSrc as { name?: string; n?: string }).name ?? (customerSrc as { n?: string }).n ?? "").trim(),
    phone: ((customerSrc as { phone?: string; p?: string }).phone ?? (customerSrc as { p?: string }).p ?? "").trim(),
    email: ((customerSrc as { email?: string; e?: string }).email ?? (customerSrc as { e?: string }).e ?? "").trim() || undefined,
  };

  const pricingSrc = data.pricing || data.p || data.price || {};
  type PricingSrc = {
    original?: number; o?: number;
    discount?: number; d?: number;
    final?: number; f?: number;
    coupons?: string;
  };
  const pricing = {
    original: Number((pricingSrc as PricingSrc).original ?? (pricingSrc as PricingSrc).o ?? 0),
    discount: Number((pricingSrc as PricingSrc).discount ?? (pricingSrc as PricingSrc).d ?? 0),
    final: Number((pricingSrc as PricingSrc).final ?? (pricingSrc as PricingSrc).f ?? 0),
    coupons: String((pricingSrc as PricingSrc).coupons ?? data.coupons ?? data.cp ?? data.coup ?? ""),
  };

  const locationId = (data.locationId as string | undefined) || null;

  return { selectedStations, selectedDateISO, slots, duration, customer, pricing, locationId };
}

/** Fall back to Razorpay order notes if no payment_orders row exists. */
async function reconstructFromOrderNotes(orderId: string): Promise<NormalizedPayload | null> {
  try {
    const order = await fetchRazorpayOrderWithMerchantFallback(orderId);
    const notes = (order as { notes?: Record<string, unknown> })?.notes;
    if (!notes) return null;
    let payloadStr: string | null = null;
    if (typeof notes.booking_data === "string") {
      payloadStr = notes.booking_data;
    } else if (typeof notes.booking_data_1 === "string") {
      payloadStr = String(notes.booking_data_1) + String(notes.booking_data_2 || "");
    }
    if (!payloadStr) return null;
    const parsed = JSON.parse(payloadStr) as BookingPayload;
    return normalizeBookingPayload(parsed);
  } catch (err) {
    console.warn("[materialize] reconstructFromOrderNotes failed:", (err as Error).message);
    return null;
  }
}

async function resolveLocationId(
  supabase: SupabaseClient,
  payload: NormalizedPayload,
  paymentOrderLocationId: string | null,
  profile: string,
): Promise<string | null> {
  if (paymentOrderLocationId) return paymentOrderLocationId;
  if (payload.locationId) return payload.locationId;
  const slug = profile === "lite" ? "lite" : "main";
  const { data } = await supabase.from("locations").select("id").eq("slug", slug).limit(1).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function ensureCustomer(
  supabase: SupabaseClient,
  paymentOrder: PaymentOrderRow,
  payload: NormalizedPayload,
  locationId: string,
): Promise<string | null> {
  if (paymentOrder.customer_id) return paymentOrder.customer_id;
  if (payload.customer.id) return payload.customer.id;

  const phoneRaw = payload.customer.phone || paymentOrder.customer_phone || "";
  const normalizedPhone = normalizePhoneNumber(phoneRaw);
  if (!normalizedPhone) return null;

  const name = payload.customer.name || paymentOrder.customer_name || "";
  const email = payload.customer.email || paymentOrder.customer_email || undefined;

  // Existing customer at this location?
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .eq("location_id", locationId)
    .maybeSingle();
  if ((existing as { id?: string } | null)?.id) return (existing as { id: string }).id;

  // Create new
  const customId = generateCustomerID(normalizedPhone);
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      name: name.trim() || "Razorpay Customer",
      phone: normalizedPhone,
      email: email?.trim() || null,
      custom_id: customId,
      location_id: locationId,
      is_member: false,
      loyalty_points: 0,
      total_spent: 0,
      total_play_time: 0,
    })
    .select("id")
    .single();

  if (!error && (created as { id?: string } | null)?.id) {
    return (created as { id: string }).id;
  }

  // Race with a parallel materializer — re-fetch.
  if (error?.code === "23505") {
    const { data: retry } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .eq("location_id", locationId)
      .maybeSingle();
    if ((retry as { id?: string } | null)?.id) return (retry as { id: string }).id;
  }

  console.error("[materialize] customer create failed:", error);
  return null;
}

async function createBookingsRows(
  supabase: SupabaseClient,
  args: {
    customerId: string;
    locationId: string;
    payload: NormalizedPayload;
    orderId: string;
    paymentId: string;
  },
): Promise<{ ids: string[]; alreadyExists: boolean }> {
  const { customerId, locationId, payload, orderId, paymentId } = args;
  const totalBookings = payload.selectedStations.length * payload.slots.length;
  if (totalBookings === 0) return { ids: [], alreadyExists: false };

  // Check first whether we have already materialized for THIS payment id —
  // covers the case where the helper is re-invoked for the same payment.
  const { data: alreadyByPayment } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_txn_id", paymentId);
  if (Array.isArray(alreadyByPayment) && alreadyByPayment.length > 0) {
    return { ids: (alreadyByPayment as Array<{ id: string }>).map((r) => r.id), alreadyExists: true };
  }

  const rows: Array<Record<string, unknown>> = [];
  payload.selectedStations.forEach((station_id) => {
    payload.slots.forEach((slot) => {
      rows.push({
        station_id,
        customer_id: customerId,
        location_id: locationId,
        booking_date: payload.selectedDateISO,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration: payload.duration,
        status: "confirmed",
        original_price: payload.pricing.original / totalBookings,
        discount_percentage:
          payload.pricing.discount > 0 && payload.pricing.original > 0
            ? (payload.pricing.discount / payload.pricing.original) * 100
            : null,
        final_price: payload.pricing.final / totalBookings,
        coupon_code: payload.pricing.coupons || null,
        payment_mode: "razorpay",
        payment_txn_id: paymentId,
        notes: `Razorpay Order: ${orderId}`,
      });
    });
  });

  const { data: inserted, error } = await supabase.from("bookings").insert(rows).select("id");
  if (!error && Array.isArray(inserted)) {
    return { ids: (inserted as Array<{ id: string }>).map((r) => r.id), alreadyExists: false };
  }

  // Concurrent materializer won the race — partial unique index raised 23505.
  // Re-fetch the bookings created by the winner and treat as already-exists.
  if (error?.code === "23505") {
    // Try by payment id first.
    const { data: byPayment } = await supabase
      .from("bookings")
      .select("id")
      .eq("payment_txn_id", paymentId);
    if (Array.isArray(byPayment) && byPayment.length > 0) {
      return { ids: (byPayment as Array<{ id: string }>).map((r) => r.id), alreadyExists: true };
    }
    // Fall back to slot-level lookup.
    const { data: bySlot } = await supabase
      .from("bookings")
      .select("id, station_id, start_time, end_time")
      .in("station_id", payload.selectedStations)
      .eq("booking_date", payload.selectedDateISO)
      .in("status", ["confirmed", "in-progress"]);
    const matching = ((bySlot || []) as Array<{ id: string; station_id: string; start_time: string; end_time: string }>).filter((b) =>
      payload.slots.some((s) => s.start_time === b.start_time && s.end_time === b.end_time),
    );
    if (matching.length > 0) {
      return { ids: matching.map((r) => r.id), alreadyExists: true };
    }
  }

  throw new Error(`Booking insert failed: ${error?.message || "unknown"}`);
}

async function confirmSlotBlocks(
  supabase: SupabaseClient,
  args: {
    locationId: string;
    payload: NormalizedPayload;
  },
) {
  const { locationId, payload } = args;
  for (const slot of payload.slots) {
    await supabase
      .from("slot_blocks")
      .update({ is_confirmed: true })
      .in("station_id", payload.selectedStations)
      .eq("booking_date", payload.selectedDateISO)
      .eq("location_id", locationId)
      .eq("start_time", slot.start_time)
      .eq("end_time", slot.end_time)
      .gt("expires_at", new Date().toISOString())
      .eq("is_confirmed", false);
  }
}

async function createOrFindBill(
  supabase: SupabaseClient,
  args: {
    customerId: string;
    locationId: string;
    bookingIds: string[];
    payload: NormalizedPayload;
  },
): Promise<string | null> {
  const { customerId, locationId, bookingIds, payload } = args;
  if (bookingIds.length === 0) return null;

  // Idempotency — a bill_item already references one of these bookings.
  const { data: existingItems } = await supabase
    .from("bill_items")
    .select("bill_id")
    .in("item_id", bookingIds)
    .eq("item_type", "session")
    .limit(1);
  if (Array.isArray(existingItems) && existingItems.length > 0) {
    return (existingItems as Array<{ bill_id: string }>)[0].bill_id;
  }

  // Re-fetch bookings to source authoritative pricing.
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, station_id, start_time, end_time, final_price, original_price, location_id")
    .in("id", bookingIds);
  type BookingRow = {
    id: string;
    station_id: string;
    start_time: string;
    end_time: string;
    final_price: number | null;
    original_price: number | null;
    location_id: string | null;
  };
  const rows: BookingRow[] = (bookingRows as BookingRow[] | null) || [];
  if (rows.length === 0) return null;

  const subtotal = rows.reduce(
    (s, r) => s + (Number(r.original_price) || Number(r.final_price) || 0),
    0,
  );
  const total = rows.reduce((s, r) => s + (Number(r.final_price) || 0), 0);
  const discountValue = Math.max(0, subtotal - total);
  const billLocationId = rows.find((r) => r.location_id)?.location_id || locationId;

  const { data: billInsert, error: billErr } = await supabase
    .from("bills")
    .insert({
      customer_id: customerId,
      subtotal,
      discount: subtotal > 0 ? (discountValue / subtotal) * 100 : 0,
      discount_value: discountValue,
      discount_type: "fixed",
      loyalty_points_used: 0,
      loyalty_points_earned: 0,
      total,
      payment_method: "razorpay",
      status: "completed",
      is_split_payment: false,
      cash_amount: 0,
      upi_amount: 0,
      location_id: billLocationId,
    })
    .select("id")
    .single();

  if (billErr || !(billInsert as { id?: string } | null)?.id) {
    console.error("[materialize] bill insert failed:", billErr);
    return null;
  }
  const billId = (billInsert as { id: string }).id;

  // Station names for the line items.
  const stationIds = Array.from(new Set(rows.map((r) => r.station_id)));
  const { data: stationsData } = await supabase
    .from("stations")
    .select("id, name")
    .in("id", stationIds);
  const stationMap = new Map<string, string>(
    ((stationsData as Array<{ id: string; name: string }> | null) || []).map((s) => [s.id, s.name]),
  );

  const dateStr = new Date(payload.selectedDateISO).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const billItems = rows.map((r) => {
    const stationName = stationMap.get(r.station_id) || "Station";
    return {
      bill_id: billId,
      item_id: r.id,
      name: `${stationName} - ${dateStr} (${r.start_time} - ${r.end_time})`,
      price: Number(r.final_price) || 0,
      quantity: 1,
      total: Number(r.final_price) || 0,
      item_type: "session",
      location_id: billLocationId,
    };
  });

  const { error: itemsErr } = await supabase.from("bill_items").insert(billItems);
  if (itemsErr) {
    console.error("[materialize] bill_items insert failed — rolling back bill:", itemsErr);
    await supabase.from("bills").delete().eq("id", billId);
    return null;
  }

  // Update customer total_spent (best-effort; bill is already persisted).
  const { data: cust } = await supabase
    .from("customers")
    .select("total_spent")
    .eq("id", customerId)
    .maybeSingle();
  const currentSpent = Number((cust as { total_spent?: number } | null)?.total_spent) || 0;
  await supabase
    .from("customers")
    .update({ total_spent: currentSpent + total })
    .eq("id", customerId);

  return billId;
}

// ────────────────────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────────────────────

export async function materializeBookingFromPaymentOrder(
  args: MaterializeArgs,
): Promise<MaterializeOutcome> {
  const { orderId, paymentId, paymentAmountPaise, source } = args;
  const supabase = await getSupabase();

  // 1. Look up the payment_orders row.
  const { data: poRow } = await supabase
    .from("payment_orders")
    .select(
      "id, provider, profile, status, provider_order_id, provider_payment_id, amount_paise, location_id, customer_id, customer_name, customer_phone, customer_email, booking_payload, notes, materialized_booking_ids, materialized_bill_id",
    )
    .eq("provider", "razorpay")
    .eq("provider_order_id", orderId)
    .maybeSingle();

  let paymentOrder = poRow as PaymentOrderRow | null;

  // 2. If the row was already finalized — short-circuit.
  if (paymentOrder && (paymentOrder.status === "paid" || paymentOrder.status === "reconciled")) {
    return {
      status: "already_exists",
      bookingIds: paymentOrder.materialized_booking_ids ?? [],
      billId: paymentOrder.materialized_bill_id ?? null,
      paymentOrderId: paymentOrder.id,
      message: "payment_order already finalized",
    };
  }

  // 3. Pull the booking payload (from row, else legacy notes fallback).
  let normalized: NormalizedPayload | null = null;
  let profile: string = paymentOrder?.profile || "default";
  if (paymentOrder?.booking_payload) {
    normalized = normalizeBookingPayload(paymentOrder.booking_payload);
  } else {
    const fallback = await reconstructFromOrderNotes(orderId);
    if (fallback) normalized = fallback;
  }
  if (!normalized || normalized.selectedStations.length === 0 || normalized.slots.length === 0) {
    return {
      status: "order_unknown",
      bookingIds: [],
      billId: null,
      paymentOrderId: paymentOrder?.id ?? null,
      message: "no usable booking payload (row missing and order notes empty/truncated)",
    };
  }

  // 4. Verify amount matches what we recorded at order-create time.
  if (paymentOrder && Number.isFinite(paymentAmountPaise) && paymentAmountPaise > 0) {
    if (paymentAmountPaise !== paymentOrder.amount_paise) {
      await supabase
        .from("payment_orders")
        .update({
          status: "failed",
          last_error: `amount_mismatch: payment=${paymentAmountPaise} order=${paymentOrder.amount_paise}`,
        })
        .eq("id", paymentOrder.id);
      return {
        status: "amount_mismatch",
        bookingIds: [],
        billId: null,
        paymentOrderId: paymentOrder.id,
        message: `payment.amount (${paymentAmountPaise}) != payment_orders.amount_paise (${paymentOrder.amount_paise})`,
      };
    }
  }

  // 5. Resolve location + customer.
  const locationId = await resolveLocationId(supabase, normalized, paymentOrder?.location_id ?? null, profile);
  if (!locationId) {
    const errMsg = "could not resolve location_id";
    if (paymentOrder) {
      await supabase
        .from("payment_orders")
        .update({ last_error: errMsg })
        .eq("id", paymentOrder.id);
    }
    return {
      status: "order_unknown",
      bookingIds: [],
      billId: null,
      paymentOrderId: paymentOrder?.id ?? null,
      message: errMsg,
    };
  }

  // If no payment_orders row exists yet (legacy in-flight order), insert one
  // now using whatever we reconstructed. This keeps the Reconciliation UI
  // honest and gives subsequent retries a fast-path lookup.
  if (!paymentOrder) {
    try {
      const expiresAtBackfill = new Date(Date.now() + PAYMENT_ORDER_PENDING_TTL_MS).toISOString();
      const { data: created } = await supabase
        .from("payment_orders")
        .insert({
          provider: "razorpay",
          profile,
          kind: "booking",
          status: "pending",
          provider_order_id: orderId,
          provider_payment_id: paymentId,
          location_id: locationId,
          customer_name: normalized.customer.name || null,
          customer_phone: normalized.customer.phone || null,
          customer_email: normalized.customer.email || null,
          amount_paise: Math.max(1, Math.round((normalized.pricing.final || 0) * 100)),
          currency: "INR",
          booking_payload: normalized as unknown as Record<string, unknown>,
          expires_at: expiresAtBackfill,
        })
        .select(
          "id, provider, profile, status, provider_order_id, provider_payment_id, amount_paise, location_id, customer_id, customer_name, customer_phone, customer_email, booking_payload, notes, materialized_booking_ids, materialized_bill_id",
        )
        .single();
      if (created) {
        paymentOrder = created as PaymentOrderRow;
        profile = paymentOrder.profile || profile;
      }
    } catch (err) {
      // Row may have been inserted concurrently — we'll re-fetch on next attempt.
      console.warn("[materialize] backfill payment_orders insert failed:", (err as Error).message);
    }
  }

  const customerId = await ensureCustomer(supabase, paymentOrder as PaymentOrderRow, normalized, locationId);
  if (!customerId) {
    if (paymentOrder) {
      await supabase
        .from("payment_orders")
        .update({ last_error: "could not resolve or create customer" })
        .eq("id", paymentOrder.id);
    }
    return {
      status: "order_unknown",
      bookingIds: [],
      billId: null,
      paymentOrderId: paymentOrder?.id ?? null,
      message: "could not resolve customer",
    };
  }

  // 6. Bookings (idempotent + 23505-safe).
  const { ids: bookingIds, alreadyExists } = await createBookingsRows(supabase, {
    customerId,
    locationId,
    payload: { ...normalized, locationId },
    orderId,
    paymentId,
  });

  // 7. Confirm slot blocks (best-effort).
  if (bookingIds.length > 0) {
    try {
      await confirmSlotBlocks(supabase, { locationId, payload: normalized });
    } catch (err) {
      console.warn("[materialize] confirmSlotBlocks failed:", (err as Error).message);
    }
  }

  // 8. Bill + bill_items.
  let billId: string | null = null;
  try {
    billId = await createOrFindBill(supabase, {
      customerId,
      locationId,
      bookingIds,
      payload: normalized,
    });
  } catch (err) {
    console.error("[materialize] createOrFindBill threw:", err);
  }

  // 9. Finalize the payment_orders row.
  if (paymentOrder) {
    await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        provider_payment_id: paymentId,
        customer_id: customerId,
        location_id: locationId,
        materialized_booking_ids: bookingIds,
        materialized_bill_id: billId,
        last_error: null,
      })
      .eq("id", paymentOrder.id);
  }

  console.log(
    `[materialize:${source}] order=${orderId} payment=${paymentId} bookings=${bookingIds.length} bill=${billId} ${alreadyExists ? "(already_exists)" : "(created)"}`,
  );

  return {
    status: alreadyExists ? "already_exists" : "created",
    bookingIds,
    billId,
    paymentOrderId: paymentOrder?.id ?? null,
  };
}
