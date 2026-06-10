/**
 * Server-side guards for public Razorpay checkout (create-order).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOOKING_ACCESS_KEYS,
  parseBookingSettingBool,
} from "../../utils/bookingAccessSettings.ts";
import type { PaymentMode } from "./payment-provider.ts";

export async function resolveOrganizationIdFromLocation(
  supabase: SupabaseClient,
  locationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("organization_id")
    .eq("id", locationId)
    .maybeSingle();
  if (error) {
    console.error("[payment-checkout-guards] location lookup failed:", error.message);
    return null;
  }
  return (data as { organization_id?: string } | null)?.organization_id ?? null;
}

export async function isOnlinePaymentEnabledForLocation(
  supabase: SupabaseClient,
  locationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("booking_settings")
    .select("setting_value")
    .eq("location_id", locationId)
    .eq("setting_key", BOOKING_ACCESS_KEYS.onlinePayment)
    .maybeSingle();
  if (error) {
    console.error("[payment-checkout-guards] online_payment setting lookup failed:", error.message);
    return true;
  }
  return parseBookingSettingBool((data as { setting_value?: unknown } | null)?.setting_value, true);
}

export async function assertLocationOwnedByOrg(
  supabase: SupabaseClient,
  locationId: string,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Location not found in this workspace." };
  return { ok: true };
}

export async function getOrganizationLocationIds(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

export function validateRazorpayKeyIdPrefix(keyId: string, mode: PaymentMode): boolean {
  const v = keyId.trim();
  if (mode === "live") return v.startsWith("rzp_live_");
  return v.startsWith("rzp_test_");
}
