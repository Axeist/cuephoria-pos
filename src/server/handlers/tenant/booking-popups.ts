/**
 * GET/PATCH /api/tenant/booking-popups
 *
 * Workspace defaults (organizations.public_booking_popup_defaults) and
 * per-branch overrides (booking_settings.public_booking_popup_config).
 */

import { j } from "../../adminApiUtils";
import { withOrgContext, type OrgContext } from "../../orgContext";
import {
  BOOKING_POPUP_BRANCH_SETTING_KEY,
  type BranchPublicBookingPopupConfig,
  type PublicBookingPopupConfig,
} from "../../../types/publicBookingPopups";
import {
  parseBranchPopupOverride,
  parsePublicBookingPopupConfig,
} from "../../../utils/publicBookingPopups";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);

async function handler(req: Request, ctx: OrgContext) {
  if (req.method === "GET") return getConfig(req, ctx);
  if (req.method === "PATCH") return patchConfig(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function getConfig(req: Request, ctx: OrgContext) {
  const url = new URL(req.url);
  const locationId = (url.searchParams.get("location_id") || "").trim();

  const { data: org, error: orgErr } = await ctx.supabase
    .from("organizations")
    .select("public_booking_popup_defaults")
    .eq("id", ctx.organizationId)
    .maybeSingle();
  if (orgErr) return j({ ok: false, error: orgErr.message }, 500);

  const workspaceDefaults = parsePublicBookingPopupConfig(org?.public_booking_popup_defaults);

  let branchOverride: BranchPublicBookingPopupConfig | null = null;
  if (locationId) {
    const { data: row, error: rowErr } = await ctx.supabase
      .from("booking_settings")
      .select("setting_value")
      .eq("location_id", locationId)
      .eq("setting_key", BOOKING_POPUP_BRANCH_SETTING_KEY)
      .maybeSingle();
    if (rowErr) return j({ ok: false, error: rowErr.message }, 500);
    if (row?.setting_value) branchOverride = parseBranchPopupOverride(row.setting_value);
  }

  return j(
    {
      ok: true,
      workspaceDefaults,
      branchOverride,
      canEdit: EDITOR_ROLES.has(ctx.role),
    },
    200,
  );
}

async function patchConfig(req: Request, ctx: OrgContext) {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j({ ok: false, error: "Only owners and admins can update popup settings." }, 403);
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

    const branchOverride = parseBranchPopupOverride(body.config);
    const { error: upsertErr } = await ctx.supabase.from("booking_settings").upsert(
      {
        location_id: locationId,
        setting_key: BOOKING_POPUP_BRANCH_SETTING_KEY,
        setting_value: branchOverride,
        description: "Public booking promotional popups (branch override)",
      },
      { onConflict: "location_id,setting_key" },
    );
    if (upsertErr) return j({ ok: false, error: upsertErr.message }, 500);

    return j({ ok: true, branchOverride }, 200);
  }

  const workspaceDefaults = parsePublicBookingPopupConfig(body.config) as PublicBookingPopupConfig;
  const { error: updErr } = await ctx.supabase
    .from("organizations")
    .update({ public_booking_popup_defaults: workspaceDefaults })
    .eq("id", ctx.organizationId);
  if (updErr) return j({ ok: false, error: updErr.message }, 500);

  return j({ ok: true, workspaceDefaults }, 200);
}

export default withOrgContext(handler);
