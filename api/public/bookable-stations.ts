/**
 * GET /api/public/bookable-stations?location=<uuid>
 *        or ?branch=main|lite (legacy — first matching active branch globally)
 *
 * Prefer `location` so multi-tenant workspaces load the correct stations.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { isStationPublicBookable } from "../../src/utils/stationTransform";

export const config = { runtime: "edge" };

const BRANCH_SLUGS = new Set(["main", "lite"]);

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const locationId = (url.searchParams.get("location") || "").trim();
    const branch = (url.searchParams.get("branch") || "main").trim().toLowerCase();

    const supabase = supabaseServiceClient("cuephoria-public-bookable-stations");

    let location: { id: string } | null = null;
    let locError: { message: string } | null = null;

    if (locationId) {
      const r = await supabase
        .from("locations")
        .select("id")
        .eq("id", locationId)
        .eq("is_active", true)
        .maybeSingle();
      location = r.data;
      locError = r.error;
    } else {
      if (!BRANCH_SLUGS.has(branch)) {
        return j({ ok: false, error: "Invalid branch" }, 400);
      }
      const r = await supabase
        .from("locations")
        .select("id")
        .eq("slug", branch)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      location = r.data;
      locError = r.error;
    }

    if (locError) throw locError;
    if (!location?.id) {
      return j({ ok: true, stations: [], location_id: null }, 200);
    }

    const { data: rows, error: stError } = await supabase
      .from("stations")
      .select(
        "id, name, type, hourly_rate, team_name, team_color, max_capacity, single_rate, category, event_enabled, slot_duration, max_players, occupancy_rates, pricing_mode"
      )
      .eq("location_id", location.id)
      .order("name");

    if (stError) throw stError;

    const stations = (rows || []).filter((s) => isStationPublicBookable(s));

    return j(
      { ok: true, location_id: location.id, stations, count: stations.length },
      200,
      { "cache-control": "public, max-age=30" }
    );
  } catch (e) {
    if (e instanceof SupabaseConfigError) {
      return j({ ok: false, error: e.message }, 500);
    }
    console.error("bookable-stations:", e);
    return j({ ok: false, error: "Failed to load stations" }, 500);
  }
}
