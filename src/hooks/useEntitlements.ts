import { useMemo } from "react";
import { useOrganizationOptional } from "@/context/OrganizationContext";
import { isInternalOrganization, type PlanFeatureKey } from "@/types/tenancy";

function readBool(features: Record<string, boolean | number> | undefined, key: string): boolean {
  if (!features) return false;
  const v = features[key];
  if (v === true) return true;
  if (typeof v === "number") return v > 0;
  return false;
}

function readLimit(features: Record<string, boolean | number> | undefined, key: string): number {
  if (!features) return 0;
  const v = features[key];
  return typeof v === "number" ? v : readBool(features, key) ? 999 : 0;
}

export function useEntitlements() {
  const orgCtx = useOrganizationOptional();
  const entitlements = orgCtx?.entitlements ?? null;
  const loading = orgCtx?.status === "loading";

  return useMemo(
    () => {
      const org = orgCtx?.organization ?? null;
      const internal = isInternalOrganization(org?.slug, org?.isInternal || entitlements?.isInternal);

      return {
      loading,
      entitlements,
      planCode: entitlements?.planCode ?? null,
      planTier: entitlements?.planTier ?? orgCtx?.subscription?.planTier ?? null,
      isSandbox: !!entitlements?.isSandbox || !!org?.isSandbox,
      isInternal: internal,
      can: (key: PlanFeatureKey) => {
        if (internal) return true;
        return readBool(entitlements?.features, key);
      },
      limit: (key: PlanFeatureKey) => {
        if (internal) return 999;
        return readLimit(entitlements?.features, key);
      },
    };
    },
    [loading, entitlements, orgCtx?.subscription?.planTier, orgCtx?.organization?.isSandbox, orgCtx?.organization?.isInternal, orgCtx?.organization?.slug],
  );
}
