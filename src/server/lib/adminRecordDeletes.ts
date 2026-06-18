import type { SupabaseClient } from "@supabase/supabase-js";
import { assertLocationOwnedByOrg, getOrganizationLocationIds } from "./payment-checkout-guards.js";
import { isDenied } from "./resultGuards";

export async function deleteProductRecord(
  supabase: SupabaseClient,
  args: { organizationId: string; productId: string; locationId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const owned = await assertLocationOwnedByOrg(supabase, args.locationId, args.organizationId);
  if (isDenied(owned)) return { ok: false, error: owned.message, status: 404 };

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", args.productId)
    .eq("location_id", args.locationId)
    .maybeSingle();

  if (!product?.id) return { ok: false, error: "Product not found.", status: 404 };

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", args.productId)
    .eq("location_id", args.locationId);

  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
}

export async function deleteBillRecord(
  supabase: SupabaseClient,
  args: { organizationId: string; billId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const orgLocationIds = await getOrganizationLocationIds(supabase, args.organizationId);
  if (orgLocationIds.length === 0) return { ok: false, error: "No branches in workspace.", status: 404 };

  const { data: bill } = await supabase
    .from("bills")
    .select("id, location_id")
    .eq("id", args.billId)
    .maybeSingle();

  if (!bill?.id || !bill.location_id || !orgLocationIds.includes(bill.location_id)) {
    return { ok: false, error: "Bill not found.", status: 404 };
  }

  const { data: sessionItems } = await supabase
    .from("bill_items")
    .select("item_id")
    .eq("bill_id", args.billId)
    .eq("item_type", "session");

  const bookingIds = (sessionItems || []).map((item) => item.item_id).filter(Boolean);
  let razorpayPaymentIds: string[] = [];
  if (bookingIds.length > 0) {
    const { data: linkedBookings } = await supabase
      .from("bookings")
      .select("payment_txn_id")
      .in("id", bookingIds)
      .eq("payment_mode", "razorpay");

    razorpayPaymentIds = [
      ...new Set(
        (linkedBookings || [])
          .map((b) => b.payment_txn_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
  }

  const { error: cashErr } = await supabase.from("cash_transactions").delete().eq("bill_id", args.billId);
  if (cashErr) return { ok: false, error: cashErr.message, status: 500 };

  const { error: itemsErr } = await supabase.from("bill_items").delete().eq("bill_id", args.billId);
  if (itemsErr) return { ok: false, error: itemsErr.message, status: 500 };

  const { error: billErr } = await supabase.from("bills").delete().eq("id", args.billId);
  if (billErr) return { ok: false, error: billErr.message, status: 500 };

  const suppressedAt = new Date().toISOString();
  for (const paymentId of razorpayPaymentIds) {
    await supabase
      .from("payment_orders")
      .update({ bill_suppressed_at: suppressedAt, materialized_bill_id: null })
      .eq("provider", "razorpay")
      .eq("provider_payment_id", paymentId);
  }

  await supabase
    .from("payment_orders")
    .update({ bill_suppressed_at: suppressedAt, materialized_bill_id: null })
    .eq("provider", "razorpay")
    .eq("materialized_bill_id", args.billId);

  return { ok: true };
}

export async function deleteBookingRecord(
  supabase: SupabaseClient,
  args: { organizationId: string; bookingId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const orgLocationIds = await getOrganizationLocationIds(supabase, args.organizationId);
  if (orgLocationIds.length === 0) return { ok: false, error: "No branches in workspace.", status: 404 };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, station_id, stations:station_id ( location_id )")
    .eq("id", args.bookingId)
    .maybeSingle();

  const station = booking?.stations as { location_id?: string } | null;
  const locationId = station?.location_id;
  if (!booking?.id || !locationId || !orgLocationIds.includes(locationId)) {
    return { ok: false, error: "Booking not found.", status: 404 };
  }

  await supabase.from("booking_views").delete().eq("booking_id", args.bookingId);

  const { data: deleted, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", args.bookingId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!deleted?.id) return { ok: false, error: "Booking could not be deleted.", status: 404 };
  return { ok: true };
}
