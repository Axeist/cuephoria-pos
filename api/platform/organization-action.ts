/**
 * POST /api/platform/organization-action?id=<uuid>&action=<name>
 *
 * Actions:
 *   suspend      — force status='suspended'. Internal orgs are refused.
 *   reactivate   — bring back to 'active' or the appropriate state.
 *   change-plan  — swap the active subscription's plan. Body: { planCode, confirm?: true }
 *                  Returns 409 with { warnings } when the new plan's limits
 *                  would be below current usage; pass `confirm: true` to force.
 *   end-trial    — fast-forward a trialing subscription to active.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { requirePlatformSession } from "../../src/server/platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPPORTED_ACTIONS = new Set(["suspend", "reactivate", "change-plan", "end-trial"]);

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  const action = (url.searchParams.get("action") || "").trim();

  if (!UUID_RE.test(id)) return j({ ok: false, error: "Invalid organization id." }, 400);
  if (!SUPPORTED_ACTIONS.has(action)) return j({ ok: false, error: `Unsupported action "${action}".` }, 400);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { planCode?: string; confirm?: boolean } = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-org-action");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, slug, name, status, is_internal")
      .eq("id", id)
      .maybeSingle();
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
    if (!org) return j({ ok: false, error: "Organization not found." }, 404);

    if (action === "suspend") {
      if (org.is_internal) {
        return j({ ok: false, error: "Internal organizations cannot be suspended." }, 409);
      }
      if (org.status === "suspended") {
        return j({ ok: true, organization: org, noop: true }, 200);
      }
      const { data: updated, error } = await supabase
        .from("organizations")
        .update({ status: "suspended" })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return j({ ok: false, error: error.message }, 500);
      await audit(supabase, session, id, "organization.suspended", { previousStatus: org.status });
      return j({ ok: true, organization: updated }, 200);
    }

    if (action === "reactivate") {
      if (org.status === "active") return j({ ok: true, organization: org, noop: true }, 200);
      const nextStatus = resolveReactivationStatus(supabase, id).then((s) => s);
      const status = await nextStatus;
      const { data: updated, error } = await supabase
        .from("organizations")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return j({ ok: false, error: error.message }, 500);
      await audit(supabase, session, id, "organization.reactivated", {
        previousStatus: org.status,
        nextStatus: status,
      });
      return j({ ok: true, organization: updated }, 200);
    }

    if (action === "end-trial") {
      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) return j({ ok: false, error: subErr.message }, 500);
      if (!sub) return j({ ok: false, error: "No subscription exists for this organization." }, 404);
      if (sub.status !== "trialing") {
        return j({ ok: true, subscription: sub, noop: true }, 200);
      }
      const { data: subUpd, error: subUpdErr } = await supabase
        .from("subscriptions")
        .update({ status: "active", trial_ends_at: null })
        .eq("id", sub.id)
        .select("*")
        .single();
      if (subUpdErr) return j({ ok: false, error: subUpdErr.message }, 500);
      await supabase
        .from("organizations")
        .update({ status: "active", trial_ends_at: null })
        .eq("id", id);
      await audit(supabase, session, id, "subscription.trial_ended_manually", {});
      return j({ ok: true, subscription: subUpd }, 200);
    }

    if (action === "change-plan") {
      const targetCode = (body.planCode || "").trim().toLowerCase();
      if (!targetCode) return j({ ok: false, error: "planCode is required." }, 400);

      const { data: plan, error: planErr } = await supabase
        .from("plans")
        .select("id, code, name, is_active")
        .eq("code", targetCode)
        .maybeSingle();
      if (planErr) return j({ ok: false, error: planErr.message }, 500);
      if (!plan || !plan.is_active) return j({ ok: false, error: `Plan "${targetCode}" is not available.` }, 404);

      // Load limits for the target plan.
      const { data: featureRows, error: featErr } = await supabase
        .from("plan_features")
        .select("key, value")
        .eq("plan_id", plan.id);
      if (featErr) return j({ ok: false, error: featErr.message }, 500);
      const limits: Record<string, unknown> = Object.fromEntries(
        (featureRows ?? []).map((r) => [r.key, r.value]),
      );

      // Load current usage.
      const [{ count: stationCount }, { count: memberCount }, { count: branchCount }] = await Promise.all([
        supabase
          .from("stations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id),
        supabase
          .from("org_memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id),
        supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id)
          .eq("is_active", true),
      ]);

      const warnings: string[] = [];
      const maxBranches = Number(limits.max_branches ?? 0);
      const maxStations = Number(limits.max_stations ?? 0);
      const maxAdminSeats = Number(limits.max_admin_seats ?? 0);

      if (maxBranches && (branchCount ?? 0) > maxBranches) {
        warnings.push(`Current active branches (${branchCount}) exceed new limit (${maxBranches}).`);
      }
      if (maxStations && (stationCount ?? 0) > maxStations) {
        warnings.push(`Current stations (${stationCount}) exceed new limit (${maxStations}).`);
      }
      if (maxAdminSeats && (memberCount ?? 0) > maxAdminSeats) {
        warnings.push(`Current members (${memberCount}) exceed new limit (${maxAdminSeats}).`);
      }

      if (warnings.length > 0 && body.confirm !== true) {
        return j({ ok: false, error: "Plan downgrade exceeds current usage.", warnings }, 409);
      }

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) return j({ ok: false, error: subErr.message }, 500);

      if (!sub) {
        // No subscription yet — insert one.
        const { data: newSub, error: insErr } = await supabase
          .from("subscriptions")
          .insert({
            organization_id: id,
            plan_id: plan.id,
            provider: "manual",
            status: "active",
            interval: "month",
          })
          .select("*")
          .single();
        if (insErr) return j({ ok: false, error: insErr.message }, 500);
        await audit(supabase, session, id, "subscription.plan_changed", {
          fromPlan: null,
          toPlan: targetCode,
          warnings,
        });
        return j({ ok: true, subscription: newSub, warnings }, 200);
      }

      const { data: updated, error: updErr } = await supabase
        .from("subscriptions")
        .update({ plan_id: plan.id })
        .eq("id", sub.id)
        .select("*")
        .single();
      if (updErr) return j({ ok: false, error: updErr.message }, 500);
      await audit(supabase, session, id, "subscription.plan_changed", {
        fromPlanId: sub.plan_id,
        toPlan: targetCode,
        warnings,
      });
      return j({ ok: true, subscription: updated, warnings }, 200);
    }

    return j({ ok: false, error: "Unhandled action." }, 500);
  } catch (err: unknown) {
    console.error("platform/organization-action error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

// Prefer trialing when a trial end date is still in the future, otherwise active.
async function resolveReactivationStatus(
  supabase: ReturnType<typeof supabaseServiceClient>,
  orgId: string,
): Promise<"trialing" | "active"> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sub?.trial_ends_at && new Date(sub.trial_ends_at).getTime() > Date.now()) {
    return "trialing";
  }
  return "active";
}

async function audit(
  supabase: ReturnType<typeof supabaseServiceClient>,
  session: { id: string; email: string },
  orgId: string,
  action: string,
  meta: Record<string, unknown>,
) {
  try {
    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: orgId,
      action,
      target_type: "organization",
      target_id: orgId,
      meta,
    });
  } catch (err) {
    console.warn(`audit write failed for ${action}:`, err);
  }
}
