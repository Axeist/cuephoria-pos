/**
 * Exclusive slot holds before Razorpay checkout (same pattern as ticketing sites).
 * Uses slot_blocks INSERT fail-closed — no upsert that could steal another user's hold.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { NormalizedPayload } from "./materialize-booking.js";
import { normalizeBookingPayload } from "./materialize-booking.js";

export const CHECKOUT_HOLD_PREFIX = "checkout_hold_";

function timeToMinutes(timeStr: string): number {
  const [h, m] = String(timeStr).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Overlap check aligned with Razorpay webhook / availability handlers. */
export function slotRangesOverlap(
  reqStart: string,
  reqEnd: string,
  exStart: string,
  exEnd: string,
): boolean {
  const requestedStart = timeToMinutes(reqStart);
  const requestedEnd = timeToMinutes(reqEnd);
  const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;
  const existingStart = timeToMinutes(exStart);
  const existingEnd = timeToMinutes(exEnd);
  const existingEndMinutes = existingEnd === 0 ? 24 * 60 : existingEnd;

  return (
    (requestedStart >= existingStart && requestedStart < existingEndMinutes) ||
    (requestedEndMinutes > existingStart && requestedEndMinutes <= existingEndMinutes) ||
    (requestedStart <= existingStart && requestedEndMinutes >= existingEndMinutes) ||
    (existingStart <= requestedStart && existingEndMinutes >= requestedEndMinutes)
  );
}

export async function resolveLocationIdForCheckout(
  supabase: SupabaseClient,
  payloadLocationId: string | null | undefined,
  profile: "default" | "lite",
): Promise<string | null> {
  if (payloadLocationId && String(payloadLocationId).length > 0) return String(payloadLocationId);
  const slug = profile === "lite" ? "lite" : "main";
  const { data } = await supabase.from("locations").select("id").eq("slug", slug).limit(1).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

export async function assertNoConfirmedBookingOverlap(
  supabase: SupabaseClient,
  payload: NormalizedPayload,
  locationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing, error } = await supabase
    .from("bookings")
    .select("id, station_id, start_time, end_time")
    .in("station_id", payload.selectedStations)
    .eq("booking_date", payload.selectedDateISO)
    .in("status", ["confirmed", "in-progress"])
    .eq("location_id", locationId);

  if (error) {
    console.error("[checkout-slot-hold] overlap query failed:", error);
    return { ok: false, message: "Could not verify slot availability. Try again." };
  }

  const rows = (existing || []) as Array<{
    station_id: string;
    start_time: string;
    end_time: string;
  }>;

  for (const stationId of payload.selectedStations) {
    for (const slot of payload.slots) {
      for (const b of rows) {
        if (b.station_id !== stationId) continue;
        if (
          slotRangesOverlap(slot.start_time, slot.end_time, String(b.start_time), String(b.end_time))
        ) {
          return {
            ok: false,
            message: "This slot is no longer available. Please pick another time or station.",
          };
        }
      }
    }
  }

  return { ok: true };
}

export type InsertHoldsResult =
  | { ok: true; holdSessionId: string }
  | { ok: false; code: "duplicate" | "unknown"; message: string };

export async function insertExclusiveCheckoutHolds(
  supabase: SupabaseClient,
  args: {
    locationId: string;
    payload: NormalizedPayload;
    holdSessionId: string;
    expiresAtIso: string;
  },
): Promise<InsertHoldsResult> {
  const { locationId, payload, holdSessionId, expiresAtIso } = args;
  const rows = payload.selectedStations.flatMap((station_id) =>
    payload.slots.map((slot) => ({
      station_id,
      location_id: locationId,
      booking_date: payload.selectedDateISO,
      start_time: slot.start_time,
      end_time: slot.end_time,
      expires_at: expiresAtIso,
      session_id: holdSessionId,
      is_confirmed: false,
      customer_phone: payload.customer.phone || null,
    })),
  );

  const { error } = await supabase.from("slot_blocks").insert(rows);
  if (!error) return { ok: true, holdSessionId };

  if (error.code === "23505") {
    return {
      ok: false,
      code: "duplicate",
      message: "This slot was just reserved by another customer. Please choose another time.",
    };
  }
  return { ok: false, code: "unknown", message: error.message || "Could not reserve slot" };
}

export async function deleteSlotHoldsBySessionId(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await supabase.from("slot_blocks").delete().eq("session_id", sessionId);
}

export async function reassignHoldSessionToProviderOrderId(
  supabase: SupabaseClient,
  holdSessionId: string,
  providerOrderId: string,
): Promise<void> {
  await supabase.from("slot_blocks").update({ session_id: providerOrderId }).eq("session_id", holdSessionId);
}

export function newCheckoutHoldSessionId(): string {
  return `${CHECKOUT_HOLD_PREFIX}${randomUUID()}`;
}

export function normalizePayloadFromBody(bookingPayload: unknown): NormalizedPayload | null {
  if (!bookingPayload || typeof bookingPayload !== "object") return null;
  try {
    return normalizeBookingPayload(bookingPayload as Parameters<typeof normalizeBookingPayload>[0]);
  } catch {
    return null;
  }
}
