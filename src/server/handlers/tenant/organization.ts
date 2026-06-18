/**
 * /api/tenant/organization
 *
 * Tenant-side view and edit of the caller's active organization.
 *
 *   GET   → public-safe snapshot of the active org + plan summary + role
 *   PATCH → update display name / legal / country / currency / timezone
 *           (owner or admin role required; slug and is_internal are immutable)
 *
 * Uses the admin session cookie and the shared orgContext helper.
 */

import { j } from "../../adminApiUtils";
import { withOrgContext, type OrgContext } from "../../orgContext";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);

async function handler(req: Request, ctx: OrgContext) {
  if (req.method === "GET") return getTenantOrg(ctx);
  if (req.method === "PATCH") return patchTenantOrg(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function getTenantOrg(ctx: OrgContext): Promise<Response> {
  const supabase = ctx.supabase;

  const [{ data: org, error: orgErr }, { data: sub, error: subErr }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, slug, name, legal_name, country, currency, timezone, status, is_internal, trial_ends_at, created_at, updated_at",
      )
      .eq("id", ctx.organizationId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, plan_id, provider, status, interval, current_period_end, trial_ends_at")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
  if (!org) return j({ ok: false, error: "Organization not found." }, 404);
  if (subErr) return j({ ok: false, error: subErr.message }, 500);

  let plan: { id: string; code: string; name: string } | null = null;
  if (sub?.plan_id) {
    const { data: planRow } = await supabase
      .from("plans")
      .select("id, code, name")
      .eq("id", sub.plan_id)
      .maybeSingle();
    plan = planRow ?? null;
  }

  const role = ctx.role;
  const canEdit = EDITOR_ROLES.has(role);

  return j(
    {
      ok: true,
      organization: org,
      subscription: sub,
      plan,
      role,
      canEdit,
    },
    200,
  );
}

async function patchTenantOrg(req: Request, ctx: OrgContext): Promise<Response> {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j(
      { ok: false, error: "Only owners and admins can update the organization." },
      403,
    );
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

  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (v.length < 2 || v.length > 120) {
      return j({ ok: false, error: "Name must be 2–120 characters." }, 400);
    }
    updates.name = v;
  }
  if (body.legalName !== undefined) {
    if (body.legalName === null || body.legalName === "") {
      updates.legal_name = null;
    } else if (typeof body.legalName === "string") {
      const v = body.legalName.trim();
      if (v.length > 160) return j({ ok: false, error: "Legal name too long." }, 400);
      updates.legal_name = v;
    }
  }
  if (typeof body.country === "string") {
    const v = body.country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(v)) return j({ ok: false, error: "Country must be a 2-letter ISO code." }, 400);
    updates.country = v;
  }
  if (typeof body.currency === "string") {
    const v = body.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(v)) return j({ ok: false, error: "Currency must be a 3-letter ISO code." }, 400);
    updates.currency = v;
  }
  if (typeof body.timezone === "string") {
    const v = body.timezone.trim();
    if (v.length < 3 || v.length > 64) return j({ ok: false, error: "Invalid timezone." }, 400);
    updates.timezone = v;
  }

  if (Object.keys(updates).length === 0) {
    return j({ ok: false, error: "No editable fields provided." }, 400);
  }

  const { data: updated, error: updErr } = await ctx.supabase
    .from("organizations")
    .update(updates)
    .eq("id", ctx.organizationId)
    .select(
      "id, slug, name, legal_name, country, currency, timezone, status, is_internal, updated_at",
    )
    .single();
  if (updErr) return j({ ok: false, error: updErr.message }, 500);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "organization.updated",
    target_type: "organization",
    target_id: ctx.organizationId,
    meta: { fields: Object.keys(updates), source: "tenant" },
  });

  return j({ ok: true, organization: updated }, 200);
}

export default withOrgContext(handler);
