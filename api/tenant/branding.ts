/**
 * /api/tenant/branding
 *
 *   GET   → current branding object for the active tenant (any member).
 *   PATCH → partial update (owner or admin only). Keys sent as `null` or
 *           empty string are treated as "clear this field". Unknown keys
 *           are dropped silently.
 *
 * The response `branding` always contains the full post-merge object so
 * clients don't have to re-fetch. Audit log gets a row on every successful
 * patch, with the set of keys that changed.
 */

import { j } from "../../src/server/adminApiUtils";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext";
import {
  extractClearFields,
  mergeBranding,
  type TenantBranding,
  validateBrandingPatch,
} from "../../src/server/brandingUtils";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);

async function handler(req: Request, ctx: OrgContext) {
  if (req.method === "GET") return getBranding(ctx);
  if (req.method === "PATCH") return patchBranding(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function getBranding(ctx: OrgContext): Promise<Response> {
  const { data, error } = await ctx.supabase
    .from("organizations")
    .select("branding")
    .eq("id", ctx.organizationId)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);

  return j(
    {
      ok: true,
      branding: (data?.branding as TenantBranding | null) ?? {},
      canEdit: EDITOR_ROLES.has(ctx.role),
      role: ctx.role,
    },
    200,
  );
}

async function patchBranding(req: Request, ctx: OrgContext): Promise<Response> {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j(
      { ok: false, error: "Only owners and admins can update branding." },
      403,
    );
  }

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const validation = validateBrandingPatch(body);
  if (validation.ok !== true) {
    const errs = (validation as { ok: false; errors: unknown[] }).errors;
    return j({ ok: false, error: "Invalid branding.", fields: errs }, 400);
  }
  const patch = validation.patch;
  const clearFields = extractClearFields(body);

  const { data: current, error: curErr } = await ctx.supabase
    .from("organizations")
    .select("branding")
    .eq("id", ctx.organizationId)
    .maybeSingle();
  if (curErr) return j({ ok: false, error: curErr.message }, 500);
  const currentBranding = (current?.branding as TenantBranding | null) ?? {};

  const next = mergeBranding(currentBranding, patch, clearFields);

  const { data: updated, error: updErr } = await ctx.supabase
    .from("organizations")
    .update({ branding: next })
    .eq("id", ctx.organizationId)
    .select("branding")
    .single();
  if (updErr) return j({ ok: false, error: updErr.message }, 400);

  const changedKeys = [
    ...Object.keys(patch),
    ...clearFields,
  ].filter((k, i, arr) => arr.indexOf(k) === i);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "organization.branding.updated",
    target_type: "organization",
    target_id: ctx.organizationId,
    meta: { fields: changedKeys, cleared: clearFields, source: "tenant" },
  });

  return j({ ok: true, branding: (updated?.branding as TenantBranding) ?? {} }, 200);
}

export default withOrgContext(handler);
