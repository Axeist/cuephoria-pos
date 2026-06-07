/**
 * Plan entitlements — resolved feature flags + numeric limits for the active org.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { j } from "../adminApiUtils.js";
import { PLAN_FEATURE_KEYS, type PlanFeatureKey, isInternalOrganization } from "../../types/tenancy.js";
import type { OrgContext } from "../orgContext.js";

export type EntitlementFeatures = Record<PlanFeatureKey, boolean | number>;

export type Entitlements = {
  planCode: string;
  planTier: string;
  features: EntitlementFeatures;
  isInternal: boolean;
  isSandbox: boolean;
};

const BOOLEAN_KEYS = new Set<PlanFeatureKey>([
  "bookings_enabled",
  "staff_hr_enabled",
  "tournaments_enabled",
  "loyalty_enabled",
  "happy_hours_enabled",
  "memberships_enabled",
  "public_booking",
  "cafe_module",
  "exports_enabled",
  "custom_domain",
  "custom_font",
  "hide_powered_by",
  "custom_sms_sender",
  "priority_support",
  "advanced_analytics_enabled",
  "premium_modules_enabled",
]);

const NUMERIC_KEYS = new Set<PlanFeatureKey>(["max_branches", "max_stations", "max_admin_seats"]);

function defaultNumeric(key: PlanFeatureKey): number {
  if (key === "max_branches") return 1;
  if (key === "max_stations") return 6;
  if (key === "max_admin_seats") return 1;
  return 0;
}

export function parseFeatureValue(key: PlanFeatureKey, raw: unknown): boolean | number {
  if (NUMERIC_KEYS.has(key)) {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : defaultNumeric(key);
  }
  if (typeof raw === "boolean") return raw;
  if (raw === true) return true;
  if (raw === false) return false;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    const n = Number(s);
    if (Number.isFinite(n)) return n !== 0;
  }
  return false;
}

export function internalEntitlements(): Entitlements {
  const features = {} as EntitlementFeatures;
  for (const key of PLAN_FEATURE_KEYS) {
    features[key] = NUMERIC_KEYS.has(key) ? 999 : true;
  }
  return {
    planCode: "internal",
    planTier: "internal",
    features,
    isInternal: true,
    isSandbox: false,
  };
}

export async function resolveEntitlements(
  supabase: SupabaseClient,
  organizationId: string,
  opts: { isInternal?: boolean; isSandbox?: boolean } = {},
): Promise<Entitlements | null> {
  if (opts.isInternal) return internalEntitlements();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, plan_tier, plans:plan_id ( code )")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.plan_id) return null;

  type PlanEmbed = { code?: string };
  const rawPlan = (sub as { plans?: PlanEmbed | PlanEmbed[] | null }).plans;
  const planMeta = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
  const planCode = String(planMeta?.code ?? sub.plan_tier ?? "starter").toLowerCase();
  const planTier = String(sub.plan_tier ?? planCode).toLowerCase();

  const { data: rows } = await supabase
    .from("plan_features")
    .select("key, value")
    .eq("plan_id", sub.plan_id);

  const features = {} as EntitlementFeatures;
  for (const key of PLAN_FEATURE_KEYS) {
    features[key] = NUMERIC_KEYS.has(key) ? defaultNumeric(key) : false;
  }
  for (const row of rows ?? []) {
    const k = String(row.key) as PlanFeatureKey;
    if ((PLAN_FEATURE_KEYS as readonly string[]).includes(k)) {
      features[k] = parseFeatureValue(k, row.value);
    }
  }

  return {
    planCode,
    planTier,
    features,
    isInternal: false,
    isSandbox: !!opts.isSandbox,
  };
}

export function featureEnabled(entitlements: Entitlements | null, key: PlanFeatureKey): boolean {
  if (!entitlements) return false;
  if (entitlements.isInternal) return true;
  const v = entitlements.features[key];
  return v === true || (typeof v === "number" && v > 0);
}

export function featureLimit(entitlements: Entitlements | null, key: PlanFeatureKey): number {
  if (!entitlements) return 0;
  if (entitlements.isInternal) return 999;
  const v = entitlements.features[key];
  return typeof v === "number" ? v : featureEnabled(entitlements, key) ? 999 : 0;
}

export function minPlanForFeature(key: PlanFeatureKey): string {
  if (
    key === "bookings_enabled" ||
    key === "public_booking" ||
    key === "tournaments_enabled" ||
    key === "loyalty_enabled" ||
    key === "exports_enabled"
  ) {
    return "growth";
  }
  if (key === "staff_hr_enabled" || key === "advanced_analytics_enabled" || key === "custom_domain") {
    return "pro";
  }
  if (key === "premium_modules_enabled" || key === "cafe_module") {
    return "enterprise";
  }
  return "growth";
}

export function entitlementsToClientPayload(entitlements: Entitlements): {
  planCode: string;
  planTier: string;
  isInternal: boolean;
  isSandbox: boolean;
  features: Record<string, boolean | number>;
} {
  return {
    planCode: entitlements.planCode,
    planTier: entitlements.planTier,
    isInternal: entitlements.isInternal,
    isSandbox: entitlements.isSandbox,
    features: { ...entitlements.features },
  };
}

export async function getEntitlementsForContext(ctx: OrgContext): Promise<Entitlements | null> {
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) return internalEntitlements();
  return resolveEntitlements(ctx.supabase, ctx.organizationId, {
    isInternal: ctx.isInternal,
    isSandbox: ctx.isSandbox,
  });
}

export async function assertEntitlement(
  ctx: OrgContext,
  key: PlanFeatureKey,
): Promise<Response | null> {
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) return null;
  const ent = await getEntitlementsForContext(ctx);
  if (!featureEnabled(ent, key)) {
    return j(
      {
        ok: false,
        error: `This feature is not included on your current plan.`,
        code: "plan_feature_required",
        feature: key,
        minPlan: minPlanForFeature(key),
      },
      403,
    );
  }
  return null;
}

export async function assertFeatureLimit(
  ctx: OrgContext,
  key: PlanFeatureKey,
  currentCount: number,
): Promise<Response | null> {
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) return null;
  const ent = await getEntitlementsForContext(ctx);
  const limit = featureLimit(ent, key);
  if (currentCount >= limit) {
    return j(
      {
        ok: false,
        error: `Your plan allows up to ${limit} ${key.replace(/^max_/, "").replace(/_/g, " ")}.`,
        code: "plan_limit",
        feature: key,
        limit,
      },
      403,
    );
  }
  return null;
}

/** Resolve org entitlements from a location id (public/unauthenticated routes). */
export async function resolveEntitlementsForLocation(
  supabase: SupabaseClient,
  locationId: string,
): Promise<{ entitlements: Entitlements | null; organizationId: string | null }> {
  const { data: loc } = await supabase
    .from("locations")
    .select("organization_id")
    .eq("id", locationId)
    .maybeSingle();
  if (!loc?.organization_id) return { entitlements: null, organizationId: null };

  const { data: org } = await supabase
    .from("organizations")
    .select("slug, is_internal, is_sandbox")
    .eq("id", loc.organization_id)
    .maybeSingle();

  const entitlements = await resolveEntitlements(supabase, loc.organization_id, {
    isInternal: isInternalOrganization(org?.slug, org?.is_internal),
    isSandbox: !!org?.is_sandbox,
  });
  return { entitlements, organizationId: loc.organization_id };
}
