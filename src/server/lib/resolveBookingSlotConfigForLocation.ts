import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOOKING_SLOT_CONFIG_KEY,
  type BranchBookingSlotConfig,
  type ResolvedBookingSlotConfig,
} from "../../types/bookingSlotConfig.js";
import {
  DEFAULT_WORKSPACE_SLOT_DEFAULTS,
  parseBranchBookingSlotConfig,
  parseWorkspaceSlotDefaults,
  resolveBookingSlotConfig,
} from "../../utils/bookingSlotConfig.js";

/** Load effective public booking slot config for a branch (defaults 60/60 if columns missing). */
export async function resolveBookingSlotConfigForLocation(
  supabase: SupabaseClient,
  locationId: string,
): Promise<ResolvedBookingSlotConfig> {
  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("organization_id")
    .eq("id", locationId)
    .maybeSingle();
  if (locErr || !loc?.organization_id) {
    return resolveBookingSlotConfig(DEFAULT_WORKSPACE_SLOT_DEFAULTS, null);
  }

  const [{ data: org, error: orgErr }, { data: branchRow, error: branchErr }] = await Promise.all([
    supabase
      .from("organizations")
      .select("default_slot_interval_minutes, default_minimum_booking_minutes")
      .eq("id", loc.organization_id)
      .maybeSingle(),
    supabase
      .from("booking_settings")
      .select("setting_value")
      .eq("location_id", locationId)
      .eq("setting_key", BOOKING_SLOT_CONFIG_KEY)
      .maybeSingle(),
  ]);

  if (orgErr || branchErr) {
    return resolveBookingSlotConfig(DEFAULT_WORKSPACE_SLOT_DEFAULTS, null);
  }

  const workspace = parseWorkspaceSlotDefaults(org ?? undefined);
  const branchOverride: BranchBookingSlotConfig | null = branchRow?.setting_value
    ? parseBranchBookingSlotConfig(branchRow.setting_value)
    : null;
  return resolveBookingSlotConfig(workspace, branchOverride);
}
