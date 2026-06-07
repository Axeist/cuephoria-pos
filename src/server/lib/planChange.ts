/**
 * Shared plan-change logic for platform ops and sandbox demo workspaces.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanChangeResult =
  | { ok: true; subscription: Record<string, unknown>; warnings: string[] }
  | { ok: false; error: string; warnings?: string[]; status: number };

export async function applyPlanChange(
  supabase: SupabaseClient,
  organizationId: string,
  targetCode: string,
  opts: { confirm?: boolean } = {},
): Promise<PlanChangeResult> {
  const code = targetCode.trim().toLowerCase();
  if (!code) return { ok: false, error: "planCode is required.", status: 400 };

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, code, name, is_active")
    .eq("code", code)
    .maybeSingle();
  if (planErr) return { ok: false, error: planErr.message, status: 500 };
  if (!plan || !plan.is_active) {
    return { ok: false, error: `Plan "${code}" is not available.`, status: 404 };
  }

  const { data: featureRows, error: featErr } = await supabase
    .from("plan_features")
    .select("key, value")
    .eq("plan_id", plan.id);
  if (featErr) return { ok: false, error: featErr.message, status: 500 };

  const limits: Record<string, unknown> = Object.fromEntries(
    (featureRows ?? []).map((r) => [r.key, r.value]),
  );

  const [{ count: stationCount }, { count: memberCount }, { count: branchCount }] = await Promise.all([
    supabase
      .from("stations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("org_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
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

  if (warnings.length > 0 && opts.confirm !== true) {
    return {
      ok: false,
      error: "Plan downgrade exceeds current usage.",
      warnings,
      status: 409,
    };
  }

  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, plan_tier")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subErr) return { ok: false, error: subErr.message, status: 500 };

  if (!sub) {
    const { data: newSub, error: insErr } = await supabase
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        plan_id: plan.id,
        plan_tier: code,
        provider: "manual",
        status: "active",
        interval: "month",
      })
      .select("*")
      .single();
    if (insErr) return { ok: false, error: insErr.message, status: 500 };
    return { ok: true, subscription: newSub as Record<string, unknown>, warnings };
  }

  const { data: updated, error: updErr } = await supabase
    .from("subscriptions")
    .update({ plan_id: plan.id, plan_tier: code })
    .eq("id", sub.id)
    .select("*")
    .single();
  if (updErr) return { ok: false, error: updErr.message, status: 500 };

  return { ok: true, subscription: updated as Record<string, unknown>, warnings };
}
