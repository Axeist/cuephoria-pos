/** Client helper — resolves public branch via service-role API (multi-tenant safe). */

export const DEFAULT_PUBLIC_ORG_SLUG = "cuephoria";

export type PublicLocationRow = {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  organizationSlug: string;
};

export async function fetchPublicLocation(opts: {
  locationId?: string | null;
  branchSlug?: string;
  orgSlug?: string;
}): Promise<PublicLocationRow | null> {
  const params = new URLSearchParams();
  if (opts.locationId?.trim()) {
    params.set("location", opts.locationId.trim());
  } else {
    params.set("branch", (opts.branchSlug || "main").trim().toLowerCase());
    params.set("org", (opts.orgSlug || DEFAULT_PUBLIC_ORG_SLUG).trim().toLowerCase());
  }

  const res = await fetch(`/api/public/location?${params.toString()}`);
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    location?: PublicLocationRow | null;
    error?: string;
  };
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Failed to resolve branch (${res.status})`);
  }
  return json.location ?? null;
}
