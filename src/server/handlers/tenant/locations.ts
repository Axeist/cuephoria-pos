/**
 * GET/POST /api/tenant/locations
 *
 * List branches and create new ones when within plan limits (including trial).
 */

import { j } from "../../adminApiUtils";
import { getPlanFeature, withOrgContext, type OrgContext } from "../../orgContext";
import { slugifyBranch } from "../../../utils/publicBookingPopups";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);
const INTERNAL_MAX_BRANCHES = 999;

async function resolveMaxBranches(ctx: OrgContext): Promise<number> {
  if (ctx.isInternal) return INTERNAL_MAX_BRANCHES;
  const raw = await getPlanFeature<number | string>(ctx, "max_branches");
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function handler(req: Request, ctx: OrgContext) {
  if (req.method === "GET") return listLocations(ctx);
  if (req.method === "POST") return createLocation(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function listLocations(ctx: OrgContext) {
  const { data: locations, error: locErr } = await ctx.supabase
    .from("locations")
    .select("id, name, slug, short_code, sort_order, is_active, created_at")
    .eq("organization_id", ctx.organizationId)
    .order("sort_order", { ascending: true });
  if (locErr) return j({ ok: false, error: locErr.message }, 500);

  const activeCount = (locations ?? []).filter((l) => l.is_active).length;
  const maxBranches = await resolveMaxBranches(ctx);
  const canEdit = EDITOR_ROLES.has(ctx.role);

  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("status, trial_ends_at")
    .eq("id", ctx.organizationId)
    .maybeSingle();

  const { data: sub } = await ctx.supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isTrialing =
    sub?.status === "trialing" ||
    org?.status === "trialing" ||
    (org?.trial_ends_at && new Date(org.trial_ends_at).getTime() > Date.now());

  return j(
    {
      ok: true,
      locations: locations ?? [],
      limits: {
        max_branches: maxBranches,
        active_count: activeCount,
        can_create: canEdit && activeCount < maxBranches,
        is_trialing: isTrialing,
      },
      canEdit,
    },
    200,
  );
}

async function createLocation(req: Request, ctx: OrgContext) {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j({ ok: false, error: "Only owners and admins can create branches." }, 403);
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    return j({ ok: false, error: "Branch name must be 2–120 characters." }, 400);
  }

  let slug = typeof body.slug === "string" ? slugifyBranch(body.slug) : slugifyBranch(name);
  if (!slug || slug.length < 2) {
    return j({ ok: false, error: "Branch slug must be at least 2 characters." }, 400);
  }

  let shortCode =
    typeof body.short_code === "string"
      ? body.short_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
      : slug.replace(/-/g, "").slice(0, 8).toUpperCase();
  if (shortCode.length < 2 || shortCode.length > 12) {
    return j({ ok: false, error: "Short code must be 2–12 letters or numbers." }, 400);
  }

  const maxBranches = await resolveMaxBranches(ctx);
  const { count, error: countErr } = await ctx.supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("is_active", true);
  if (countErr) return j({ ok: false, error: countErr.message }, 500);

  if ((count ?? 0) >= maxBranches) {
    return j(
      {
        ok: false,
        error: `Your plan allows up to ${maxBranches} active branch${maxBranches === 1 ? "" : "es"}. Upgrade or deactivate a branch to add another.`,
        code: "branch_limit",
      },
      403,
    );
  }

  const { data: slugConflict } = await ctx.supabase
    .from("locations")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("slug", slug)
    .maybeSingle();
  if (slugConflict) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const { data: codeConflict } = await ctx.supabase
    .from("locations")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("short_code", shortCode)
    .maybeSingle();
  if (codeConflict) {
    shortCode = `${shortCode.slice(0, 8)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
  }

  const { data: maxSort } = await ctx.supabase
    .from("locations")
    .select("sort_order")
    .eq("organization_id", ctx.organizationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = Number(maxSort?.sort_order ?? -1) + 1;

  const { data: created, error: insErr } = await ctx.supabase
    .from("locations")
    .insert({
      organization_id: ctx.organizationId,
      name,
      slug,
      short_code: shortCode,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("id, name, slug, short_code, sort_order, is_active, created_at")
    .single();

  if (insErr) return j({ ok: false, error: insErr.message }, 500);

  await ctx.supabase.from("admin_user_locations").upsert(
    { admin_user_id: ctx.user.id, location_id: created.id },
    { onConflict: "admin_user_id,location_id" },
  );

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "location.created",
    target_type: "location",
    target_id: created.id,
    meta: { name, slug, short_code: shortCode, source: "tenant" },
  });

  return j({ ok: true, location: created }, 201);
}

export default withOrgContext(handler);
