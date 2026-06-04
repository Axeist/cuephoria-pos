/**
 * GET /api/public/bookable-stations?branch=main|lite
 *
 * Returns stations visible on the public booking page for a branch.
 * Uses service role so visibility matches Station Command regardless of client RLS quirks.
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
    const branch = (url.searchParams.get("branch") || "main").trim().toLowerCase();
    if (!BRANCH_SLUGS.has(branch)) {
      return j({ ok: false, error: "Invalid branch" }, 400);
    }

    const supabase = supabaseServiceClient("cuephoria-public-bookable-stations");

    const { data: location, error: locError } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", branch)
      .eq("is_active", true)
      .maybeSingle();

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
