import type { SupabaseClient } from "@supabase/supabase-js";
import { BOOKING_POPUP_BRANCH_SETTING_KEY } from "../../types/publicBookingPopups";
import type { PublicBookingPopupConfig } from "../../types/publicBookingPopups";
import {
  EMPTY_PUBLIC_BOOKING_POPUP_CONFIG,
  mergePublicBookingPopupConfig,
  parseBranchPopupOverride,
  parsePublicBookingPopupConfig,
} from "../../utils/publicBookingPopups";

/** Load effective public booking popup config for a branch (empty defaults on error). */
export async function resolvePublicBookingPopupsForLocation(
  supabase: SupabaseClient,
  locationId: string,
): Promise<PublicBookingPopupConfig | null> {
  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("organization_id")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();
  if (locErr || !loc?.organization_id) return null;

  const [{ data: org, error: orgErr }, { data: branchRow, error: branchErr }] = await Promise.all([
    supabase
      .from("organizations")
      .select("public_booking_popup_defaults, status")
      .eq("id", loc.organization_id)
      .maybeSingle(),
    supabase
      .from("booking_settings")
      .select("setting_value")
      .eq("location_id", locationId)
      .eq("setting_key", BOOKING_POPUP_BRANCH_SETTING_KEY)
      .maybeSingle(),
  ]);

  if (orgErr || branchErr) return EMPTY_PUBLIC_BOOKING_POPUP_CONFIG;
  if (org?.status === "suspended" || org?.status === "canceled") return null;

  const workspaceDefaults = parsePublicBookingPopupConfig(org?.public_booking_popup_defaults);
  const branchOverride = branchRow?.setting_value
    ? parseBranchPopupOverride(branchRow.setting_value)
    : null;
  return mergePublicBookingPopupConfig(workspaceDefaults, branchOverride);
}
