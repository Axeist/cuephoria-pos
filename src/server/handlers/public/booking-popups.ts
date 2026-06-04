/**
 * GET /api/public/booking-popups?location=<uuid>
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { BOOKING_POPUP_BRANCH_SETTING_KEY } from "@/types/publicBookingPopups";
import {
  mergePublicBookingPopupConfig,
  parseBranchPopupOverride,
  parsePublicBookingPopupConfig,
} from "@/utils/publicBookingPopups";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const locationId = (url.searchParams.get("location") || "").trim();
    if (!locationId) return j({ ok: false, error: "Missing location" }, 400);

    const supabase = supabaseServiceClient("cuetronix-public-booking-popups");

    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("id, organization_id")
      .eq("id", locationId)
      .eq("is_active", true)
      .maybeSingle();
    if (locErr) return j({ ok: false, error: locErr.message }, 500);
    if (!loc?.organization_id) return j({ ok: true, config: null }, 200);

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

    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
    if (branchErr) return j({ ok: false, error: branchErr.message }, 500);

    if (org?.status === "suspended" || org?.status === "canceled") {
      return j({ ok: true, config: null }, 200);
    }

    const workspaceDefaults = parsePublicBookingPopupConfig(org?.public_booking_popup_defaults);
    const branchOverride = branchRow?.setting_value
      ? parseBranchPopupOverride(branchRow.setting_value)
      : null;
    const config = mergePublicBookingPopupConfig(workspaceDefaults, branchOverride);

    return j({ ok: true, config }, 200, { "cache-control": "public, max-age=60" });
  } catch (err: unknown) {
    console.error("public/booking-popups error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
