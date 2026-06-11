import type { SupabaseClient } from "@supabase/supabase-js";
import { isStrictPricingEnabled } from "./securityFlags";

const VR_PASS_DURATION_MINUTES = 60;
const PRICE_TOLERANCE_INR = 2;

function slotDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export type BookingPricePayload = {
  location_id: string;
  selectedStations: string[];
  selectedSlots?: Array<{ start_time: string; end_time: string }>;
  selectedSlot?: { start_time: string; end_time: string };
  originalPrice?: number;
  discount?: number;
  finalPrice?: number;
};

export type PriceValidationResult = {
  ok: boolean;
  serverEstimate: number;
  clientFinal: number;
  message?: string;
};

/**
 * Server-side estimate from station hourly rates (conservative baseline).
 * Does not replicate every coupon rule — flags large underpayment.
 */
export async function validateBookingPrices(
  supabase: SupabaseClient,
  payload: BookingPricePayload,
): Promise<PriceValidationResult> {
  const clientFinal = Number(payload.finalPrice ?? 0);
  const slots =
    payload.selectedSlots && payload.selectedSlots.length > 0
      ? payload.selectedSlots
      : payload.selectedSlot
        ? [payload.selectedSlot]
        : [];

  if (!payload.location_id || payload.selectedStations.length === 0 || slots.length === 0) {
    return { ok: true, serverEstimate: clientFinal, clientFinal };
  }

  const { data: stations } = await supabase
    .from("stations")
    .select("id, hourly_rate, type, slot_duration")
    .eq("location_id", payload.location_id)
    .in("id", payload.selectedStations);

  if (!stations?.length) {
    return { ok: true, serverEstimate: clientFinal, clientFinal };
  }

  const rateById = new Map(stations.map((s) => [s.id, s]));

  let serverEstimate = 0;
  for (const stationId of payload.selectedStations) {
    const st = rateById.get(stationId);
    if (!st) continue;
    const hourly = Number(st.hourly_rate) || 0;
    for (const slot of slots) {
      let minutes = slotDurationMinutes(slot.start_time, slot.end_time);
      if (st.type === "vr") minutes = VR_PASS_DURATION_MINUTES;
      else if (st.slot_duration && st.slot_duration > 0) minutes = Number(st.slot_duration);
      serverEstimate += (hourly * minutes) / 60;
    }
  }

  serverEstimate = Math.round(serverEstimate * 100) / 100;

  // Client may legitimately discount below server baseline — flag severe underpayment only
  const underpayment = serverEstimate - clientFinal;
  const suspicious =
    clientFinal <= 0 && serverEstimate > PRICE_TOLERANCE_INR
      ? true
      : underpayment > Math.max(PRICE_TOLERANCE_INR, serverEstimate * 0.5);

  if (suspicious) {
    const message = `Price mismatch: client=${clientFinal} server~=${serverEstimate}`;
    console.warn("[security/pricing]", message, {
      location_id: payload.location_id,
      stations: payload.selectedStations.length,
      slots: slots.length,
      strict: isStrictPricingEnabled(),
    });
    if (isStrictPricingEnabled()) {
      return { ok: false, serverEstimate, clientFinal, message };
    }
  }

  return { ok: true, serverEstimate, clientFinal };
}
