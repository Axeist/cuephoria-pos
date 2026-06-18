/**
 * Brand constants (B0 Cuetronix / default Cuephoria).
 *
 * Three layers:
 *   - PARENT_BRAND:  Cuephoria Tech Pvt. Ltd. (legal / parent company)
 *   - PRODUCT_BRAND: Cuetronix (the SaaS product shell)
 *   - TENANT_BRAND:  per-organization (Cuephoria is the default flagship)
 *
 * Every consumer of the UI should eventually read its copy + theme from a
 * resolved TenantBrand. Until Slice 1 ships the loader, the app boots with
 * `DEFAULT_TENANT_BRAND`, which mirrors today's visual identity exactly so
 * nothing changes for Cuephoria staff mid-migration.
 */

export const PARENT_BRAND = {
  name: "Cuephoria Tech",
  legalName: "Cuephoria Tech Pvt. Ltd.",
  domain: "cuephoriatech.in",
  supportEmail: "hello@cuephoriatech.in",
} as const;

export const PRODUCT_BRAND = {
  name: "Cuetronix",
  tagline: "Operating system for gaming cafés.",
  marketingUrl: "https://cuephoriatech.in/cuetronix",
  docsUrl: "https://cuephoriatech.in/docs",
  statusUrl: "https://cuephoriatech.in/status",
} as const;

/**
 * TenantBrand describes the surface the app can render for any organization.
 * Keys map 1:1 to CSS variables (minus the `--` prefix) applied at :root,
 * plus a small set of rendering hints that don't belong in CSS.
 */
export interface TenantBrand {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  /**
   * HSL triplet strings, e.g. "260 48% 80%". Shape matches shadcn/ui
   * tokens in `src/index.css` so CSS variables can be swapped directly.
   */
  tokens: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  typography: {
    headingFamily: string;
    bodyFamily: string;
  };
  assets: {
    logoLightUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
  };
  /**
   * Governs whether "Powered by Cuetronix" appears on public surfaces
   * (booking page, receipts, etc.). Pro/Enterprise plans may hide this.
   */
  hidePoweredBy: boolean;
}

/**
 * Default tenant brand — mirrors today's hardcoded Cuephoria look so that
 * applying it at runtime is a visual no-op.
 */
export const DEFAULT_TENANT_BRAND: TenantBrand = {
  id: "cuephoria",
  slug: "cuephoria",
  name: "Cuephoria",
  shortName: "Cue",
  tokens: {
    background: "258 65% 5%",
    foreground: "0 0% 100%",
    card: "260 40% 9%",
    cardForeground: "0 0% 100%",
    popover: "260 45% 8%",
    popoverForeground: "0 0% 100%",
    primary: "262 83% 64%",
    primaryForeground: "0 0% 98%",
    secondary: "25 95% 53%",
    secondaryForeground: "0 0% 98%",
    muted: "260 22% 14%",
    mutedForeground: "255 12% 72%",
    accent: "293 69% 55%",
    accentForeground: "0 0% 98%",
    destructive: "0 84.2% 60.2%",
    destructiveForeground: "0 0% 98%",
    border: "260 22% 20%",
    input: "260 22% 20%",
    ring: "262 83% 55%",
  },
  typography: {
    headingFamily: '"Poppins", system-ui, sans-serif',
    bodyFamily: '"Quicksand", system-ui, sans-serif',
  },
  assets: {},
  hidePoweredBy: true,
};
