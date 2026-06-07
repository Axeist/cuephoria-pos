/**
 * GET /api/public/bookable-stations?location=<uuid>
 *        or ?branch=main|lite&org=cuephoria (legacy public links)
 *
 * Prefer `location` so multi-tenant workspaces load the correct stations.
 */

import { j } from "../../src/server/adminApiUtils";
import { resolvePublicLocation, DEFAULT_PUBLIC_ORG_SLUG } from "../../src/server/lib/resolvePublicLocation";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { isStationPublicBookable } from "../../src/utils/stationTransform";

export const config = { runtime: "edge" };

const BRANCH_SLUGS = new Set(["main", "lite", "cafe"]);

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const locationId = (url.searchParams.get("location") || "").trim() || null;
    const branch = (url.searchParams.get("branch") || "main").trim().toLowerCase();
    const orgSlug = (url.searchParams.get("org") || DEFAULT_PUBLIC_ORG_SLUG).trim().toLowerCase();

    if (!locationId && !BRANCH_SLUGS.has(branch)) {
      return j({ ok: false, error: "Invalid branch" }, 400);
    }

    const supabase = supabaseServiceClient("cuephoria-public-bookable-stations");

    const resolved = await resolvePublicLocation(supabase, {
      locationId,
      branchSlug: branch,
      orgSlug,
    });

    if (!resolved?.id) {
      return j({ ok: true, stations: [], location_id: null }, 200);
    }

    const { data: rows, error: stError } = await supabase
      .from("stations")
      .select(
        "id, name, type, hourly_rate, team_name, team_color, max_capacity, single_rate, category, event_enabled, slot_duration, max_players, occupancy_rates, pricing_mode, maintenance_mode"
      )
      .eq("location_id", resolved.id)
      .order("name");

    if (stError) throw stError;

    const stations = (rows || []).filter((s) => isStationPublicBookable(s));

    return j(
      { ok: true, location_id: resolved.id, stations, count: stations.length },
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
