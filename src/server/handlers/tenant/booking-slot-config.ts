/**
 * GET/PATCH/POST /api/tenant/booking-slot-config
 *
 * Workspace defaults (organizations.default_*_minutes) and
 * per-branch overrides (booking_settings.booking_slot_config).
 *
 * POST applies config and syncs non-VR station slot_duration + rates.
 */

import { j } from "../../adminApiUtils";
import { withOrgContext, type OrgContext } from "../../orgContext";
import {
  BOOKING_SLOT_CONFIG_KEY,
  type BookingSlotMinutes,
  type BranchBookingSlotConfig,
} from "../../../types/bookingSlotConfig";
import {
  DEFAULT_WORKSPACE_SLOT_DEFAULTS,
  isValidSlotCombo,
  normalizeSlotMinutes,
  parseBranchBookingSlotConfig,
  parseWorkspaceSlotDefaults,
  resolveBookingSlotConfig,
} from "../../../utils/bookingSlotConfig";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);

async function handler(req: Request, ctx: OrgContext) {
  if (req.method === "GET") return getConfig(req, ctx);
  if (req.method === "PATCH") return patchConfig(req, ctx);
  if (req.method === "POST") return applyConfig(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function loadWorkspaceDefaults(ctx: OrgContext) {
  const { data: org, error } = await ctx.supabase
    .from("organizations")
    .select("default_slot_interval_minutes, default_minimum_booking_minutes")
    .eq("id", ctx.organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseWorkspaceSlotDefaults(org ?? undefined);
}

async function getConfig(_req: Request, ctx: OrgContext) {
  const url = new URL(_req.url);
  const locationId = (url.searchParams.get("location_id") || "").trim();

  const workspaceDefaults = await loadWorkspaceDefaults(ctx);

  let branchOverride: BranchBookingSlotConfig | null = null;
  if (locationId) {
    const { data: row, error: rowErr } = await ctx.supabase
      .from("booking_settings")
      .select("setting_value")
      .eq("location_id", locationId)
      .eq("setting_key", BOOKING_SLOT_CONFIG_KEY)
      .maybeSingle();
    if (rowErr) return j({ ok: false, error: rowErr.message }, 500);
    if (row?.setting_value) branchOverride = parseBranchBookingSlotConfig(row.setting_value);
  }

  const resolved = resolveBookingSlotConfig(workspaceDefaults, branchOverride);

  return j(
    {
      ok: true,
      workspaceDefaults,
      branchOverride,
      resolved,
      canEdit: EDITOR_ROLES.has(ctx.role),
    },
    200,
  );
}

async function patchConfig(req: Request, ctx: OrgContext) {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j({ ok: false, error: "Only owners and admins can update session length settings." }, 403);
  }
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const scope = body.scope === "branch" ? "branch" : "workspace";
  const locationId = typeof body.location_id === "string" ? body.location_id.trim() : "";

  if (scope === "branch") {
    if (!locationId) return j({ ok: false, error: "location_id is required for branch scope." }, 400);

    const { data: loc, error: locErr } = await ctx.supabase
      .from("locations")
      .select("id")
      .eq("id", locationId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (locErr) return j({ ok: false, error: locErr.message }, 500);
    if (!loc) return j({ ok: false, error: "Branch not found." }, 404);

    const branchOverride = parseBranchBookingSlotConfig(body.config);
    const { error: upsertErr } = await ctx.supabase.from("booking_settings").upsert(
      {
        location_id: locationId,
        setting_key: BOOKING_SLOT_CONFIG_KEY,
        setting_value: branchOverride,
        description: "Public booking slot interval and minimum session length (branch override)",
      },
      { onConflict: "location_id,setting_key" },
    );
    if (upsertErr) return j({ ok: false, error: upsertErr.message }, 500);

    return j({ ok: true, branchOverride }, 200);
  }

  const interval = normalizeSlotMinutes(
    (body as { slot_interval_minutes?: unknown }).slot_interval_minutes,
    DEFAULT_WORKSPACE_SLOT_DEFAULTS.slot_interval_minutes,
  );
  let minimum = normalizeSlotMinutes(
    (body as { minimum_booking_minutes?: unknown }).minimum_booking_minutes,
    DEFAULT_WORKSPACE_SLOT_DEFAULTS.minimum_booking_minutes,
  );
  if (!isValidSlotCombo(interval, minimum)) {
    return j({ ok: false, error: "Invalid combination: minimum must be >= interval and a multiple of it." }, 400);
  }

  const { error: updErr } = await ctx.supabase
    .from("organizations")
    .update({
      default_slot_interval_minutes: interval,
      default_minimum_booking_minutes: minimum,
    })
    .eq("id", ctx.organizationId);
  if (updErr) return j({ ok: false, error: updErr.message }, 500);

  return j({ ok: true, workspaceDefaults: { slot_interval_minutes: interval, minimum_booking_minutes: minimum } }, 200);
}

function halveRate(n: number): number {
  return Math.max(0, Math.round(n / 2));
}

function doubleRate(n: number): number {
  return Math.max(0, Math.round(n * 2));
}

function scaleOccupancyRates(
  raw: Record<string, number> | null | undefined,
  factor: number,
): Record<string, number> | null {
  if (!raw || typeof raw !== "object") return raw ?? null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[k] = factor < 0 ? halveRate(n) : doubleRate(n);
  }
  return out;
}

async function syncBranchStations(
  ctx: OrgContext,
  locationId: string,
  newMinimum: BookingSlotMinutes,
  previousMinimum: BookingSlotMinutes,
) {
  const { data: stations, error } = await ctx.supabase
    .from("stations")
    .select("id, type, hourly_rate, single_rate, occupancy_rates, slot_duration")
    .eq("location_id", locationId)
    .neq("type", "vr");
  if (error) throw new Error(error.message);

  for (const st of stations ?? []) {
    const updates: Record<string, unknown> = { slot_duration: newMinimum };
    if (previousMinimum !== newMinimum) {
      if (previousMinimum === 60 && newMinimum === 30) {
        if (st.hourly_rate != null) updates.hourly_rate = halveRate(Number(st.hourly_rate));
        if (st.single_rate != null) updates.single_rate = halveRate(Number(st.single_rate));
        updates.occupancy_rates = scaleOccupancyRates(
          st.occupancy_rates as Record<string, number> | null,
          -1,
        );
      } else if (previousMinimum === 30 && newMinimum === 60) {
        if (st.hourly_rate != null) updates.hourly_rate = doubleRate(Number(st.hourly_rate));
        if (st.single_rate != null) updates.single_rate = doubleRate(Number(st.single_rate));
        updates.occupancy_rates = scaleOccupancyRates(
          st.occupancy_rates as Record<string, number> | null,
          1,
        );
      }
    }
    const { error: updErr } = await ctx.supabase.from("stations").update(updates).eq("id", st.id);
    if (updErr) throw new Error(updErr.message);
  }

  const { data: types, error: typesErr } = await ctx.supabase
    .from("station_types")
    .select("id, slug")
    .eq("location_id", locationId);
  if (typesErr) throw new Error(typesErr.message);

  for (const t of types ?? []) {
    if (t.slug === "vr") continue;
    const { error: typeUpdErr } = await ctx.supabase
      .from("station_types")
      .update({ default_slot_minutes: newMinimum })
      .eq("id", t.id);
    if (typeUpdErr) throw new Error(typeUpdErr.message);
  }
}

/** POST — save config at scope and sync stations for affected branch(es). */
async function applyConfig(req: Request, ctx: OrgContext) {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j({ ok: false, error: "Only owners and admins can apply session length settings." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const scope = body.scope === "branch" ? "branch" : "workspace";
  const locationId = typeof body.location_id === "string" ? body.location_id.trim() : "";
  const interval = normalizeSlotMinutes(body.slot_interval_minutes, 60);
  let minimum = normalizeSlotMinutes(body.minimum_booking_minutes, 60);
  if (!isValidSlotCombo(interval, minimum)) {
    return j({ ok: false, error: "Invalid slot interval / minimum combination." }, 400);
  }

  const workspaceBefore = await loadWorkspaceDefaults(ctx);

  if (scope === "workspace") {
    const { error: updErr } = await ctx.supabase
      .from("organizations")
      .update({
        default_slot_interval_minutes: interval,
        default_minimum_booking_minutes: minimum,
      })
      .eq("id", ctx.organizationId);
    if (updErr) return j({ ok: false, error: updErr.message }, 500);

    const { data: locations, error: locErr } = await ctx.supabase
      .from("locations")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("is_active", true);
    if (locErr) return j({ ok: false, error: locErr.message }, 500);

    const synced: string[] = [];
    for (const loc of locations ?? []) {
      const { data: row } = await ctx.supabase
        .from("booking_settings")
        .select("setting_value")
        .eq("location_id", loc.id)
        .eq("setting_key", BOOKING_SLOT_CONFIG_KEY)
        .maybeSingle();
      const branchOverride = row?.setting_value
        ? parseBranchBookingSlotConfig(row.setting_value)
        : null;
      if (branchOverride && branchOverride.use_workspace_defaults === false) continue;

      const prevMin = resolveBookingSlotConfig(workspaceBefore, branchOverride).minimum_booking_minutes;
      await syncBranchStations(ctx, loc.id, minimum, prevMin);
      synced.push(loc.id);
    }

    return j({ ok: true, syncedBranchIds: synced, workspaceDefaults: { slot_interval_minutes: interval, minimum_booking_minutes: minimum } }, 200);
  }

  if (!locationId) return j({ ok: false, error: "location_id is required for branch scope." }, 400);

  const { data: loc, error: locErr } = await ctx.supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (locErr) return j({ ok: false, error: locErr.message }, 500);
  if (!loc) return j({ ok: false, error: "Branch not found." }, 404);

  const { data: prevRow } = await ctx.supabase
    .from("booking_settings")
    .select("setting_value")
    .eq("location_id", locationId)
    .eq("setting_key", BOOKING_SLOT_CONFIG_KEY)
    .maybeSingle();
  const prevOverride = prevRow?.setting_value
    ? parseBranchBookingSlotConfig(prevRow.setting_value)
    : null;
  const prevMin = resolveBookingSlotConfig(workspaceBefore, prevOverride).minimum_booking_minutes;

  const branchOverride: BranchBookingSlotConfig = {
    use_workspace_defaults: false,
    slot_interval_minutes: interval,
    minimum_booking_minutes: minimum,
    switched_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await ctx.supabase.from("booking_settings").upsert(
    {
      location_id: locationId,
      setting_key: BOOKING_SLOT_CONFIG_KEY,
      setting_value: branchOverride,
      description: "Public booking slot interval and minimum session length (branch override)",
    },
    { onConflict: "location_id,setting_key" },
  );
  if (upsertErr) return j({ ok: false, error: upsertErr.message }, 500);

  await syncBranchStations(ctx, locationId, minimum, prevMin);

  return j({ ok: true, branchOverride, resolved: resolveBookingSlotConfig(workspaceBefore, branchOverride) }, 200);
}

export default withOrgContext(handler);
