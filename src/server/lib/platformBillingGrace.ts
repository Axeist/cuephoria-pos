/** Shared tenant billing grace (minutes); operator-configurable in platform_settings.id=1 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const MIN_BILLING_ACCESS_GRACE_MINUTES = 1;
export const MAX_BILLING_ACCESS_GRACE_MINUTES = 10080; // 7 days
export const DEFAULT_BILLING_ACCESS_GRACE_MINUTES = 60;

export function normalizeBillingGraceMinutes(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_BILLING_ACCESS_GRACE_MINUTES;
  return Math.min(
    MAX_BILLING_ACCESS_GRACE_MINUTES,
    Math.max(MIN_BILLING_ACCESS_GRACE_MINUTES, Math.floor(raw)),
  );
}

/**
 * Reads the singleton fleet setting. Caller supplies the service-role client
 * (tenant org context Supabase counts — it bypasses RLS).
 */
export async function fetchBillingAccessGraceMinutes(
  supabase: Pick<SupabaseClient, "from">,
): Promise<number> {
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("billing_access_grace_minutes")
      .eq("id", 1)
      .maybeSingle();
    return normalizeBillingGraceMinutes(data?.billing_access_grace_minutes ?? null);
  } catch {
    return DEFAULT_BILLING_ACCESS_GRACE_MINUTES;
  }
}
