import { DEFAULT_TENANT_BRAND, type TenantBrand } from "@/branding/brand";
import { resolveBrand, type TenantBrandingOverride } from "@/branding/resolveBranding";

export type PublicWorkspacePayload = {
  slug: string;
  name: string;
  branding?: TenantBrandingOverride;
  location?: { id: string; name: string; slug: string };
};

const CUEPHORIA_MAIN_LOGO = "/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png";
const CUEPHORIA_LITE_LOGO = "/lovable-uploads/cuephoria-lite-logo.png";

/** Cuephoria-only legacy assets; other tenants must set logo_url in branding. */
export function defaultLogoForSlug(orgSlug: string, locationSlug: string): string | null {
  if (orgSlug !== "cuephoria") return null;
  if (locationSlug === "lite") return CUEPHORIA_LITE_LOGO;
  return CUEPHORIA_MAIN_LOGO;
}

export function resolvePublicBookingBrand(
  workspace: PublicWorkspacePayload | null | undefined,
  fallbackLocationSlug: string,
): {
  brand: TenantBrand;
  displayName: string;
  tagline: string;
  logoUrl: string;
  locationSlug: string;
  locationName: string | null;
  primaryHex: string;
  accentHex: string;
  hidePoweredBy: boolean;
} {
  const locationSlug = workspace?.location?.slug ?? fallbackLocationSlug;
  const base: TenantBrand = workspace
    ? {
        ...DEFAULT_TENANT_BRAND,
        id: workspace.slug,
        slug: workspace.slug,
        name: workspace.name,
        shortName: workspace.name.slice(0, 12),
      }
    : DEFAULT_TENANT_BRAND;

  const override = workspace?.branding;
  const brand = resolveBrand(base, override);
  const displayName = override?.display_name?.trim() || workspace?.name || brand.name;
  const tagline =
    override?.tagline?.trim() ||
    (locationSlug === "lite" ? "Compact branch gaming experience" : "Premium Gaming Lounge");
  const legacyLogo = defaultLogoForSlug(workspace?.slug ?? "", locationSlug);
  const logoUrl =
    override?.logo_url?.trim() ||
    override?.icon_url?.trim() ||
    legacyLogo ||
    "";
  const primaryHex = override?.primary_color || "#7c3aed";
  const accentHex = override?.accent_color || "#ec4899";

  return {
    brand,
    displayName,
    tagline,
    logoUrl,
    locationSlug,
    locationName: workspace?.location?.name ?? null,
    primaryHex,
    accentHex,
    hidePoweredBy: brand.hidePoweredBy,
  };
}
