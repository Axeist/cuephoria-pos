/**
 * Resolve a branch for public surfaces (booking, stations, tournaments).
 *
 * Legacy `/public/booking` without `?location=` targets Cuephoria Gaming
 * Lounge main — not whichever tenant happened to match slug `main` first.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Default org when public links omit ?location= (admin.cuephoria.in legacy URLs). */
export const DEFAULT_PUBLIC_ORG_SLUG = "cuephoria";

export type ResolvedPublicLocation = {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  organizationSlug: string;
};

export async function resolvePublicLocation(
  supabase: SupabaseClient,
  opts: {
    locationId?: string | null;
    branchSlug?: string;
    orgSlug?: string;
  },
): Promise<ResolvedPublicLocation | null> {
  const locationId = opts.locationId?.trim();
  if (locationId) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, slug, organization_id, organizations:organization_id ( slug, status )")
      .eq("id", locationId)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data?.id) return null;

    type OrgEmbed = { slug?: string; status?: string | null };
    const orgRaw = (data as { organizations?: OrgEmbed | OrgEmbed[] | null }).organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (!org || org.status === "suspended" || org.status === "canceled") return null;

    return {
      id: data.id,
      name: String(data.name ?? data.slug),
      slug: String(data.slug),
      organizationId: String(data.organization_id),
      organizationSlug: String(org.slug ?? DEFAULT_PUBLIC_ORG_SLUG),
    };
  }

  const branchSlug = (opts.branchSlug || "main").trim().toLowerCase();
  const orgSlug = (opts.orgSlug || DEFAULT_PUBLIC_ORG_SLUG).trim().toLowerCase();

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug, status")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgErr || !org?.id) return null;
  if (org.status === "suspended" || org.status === "canceled") return null;

  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("id, name, slug, organization_id")
    .eq("organization_id", org.id)
    .eq("slug", branchSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (locErr || !loc?.id) return null;

  return {
    id: loc.id,
    name: String(loc.name ?? branchSlug),
    slug: String(loc.slug),
    organizationId: String(loc.organization_id),
    organizationSlug: String(org.slug),
  };
}
