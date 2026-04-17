/**
 * applyTenantTheme — swap CSS variables at :root for the active tenant.
 *
 * The app's existing `src/index.css` hardcodes Cuephoria's values. When we
 * boot into multi-tenant mode, the Slice 2 bootstrap will call this on
 * mount with the resolved TenantBrand. Because DEFAULT_TENANT_BRAND in
 * `brand.ts` mirrors those hardcoded values exactly, calling this with the
 * default today is a visual no-op.
 *
 * Deliberately dependency-free (no React, no imports from the rest of the
 * app) so it can also be invoked from server-rendered contexts, tests, and
 * from the Storybook preview config.
 */

import type { TenantBrand } from "./brand";

type TokenKey = keyof TenantBrand["tokens"];

const TOKEN_TO_CSS_VAR: Record<TokenKey, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
};

export function applyTenantTheme(brand: TenantBrand, target?: HTMLElement) {
  if (typeof document === "undefined") return;
  const root = target ?? document.documentElement;

  for (const key of Object.keys(TOKEN_TO_CSS_VAR) as TokenKey[]) {
    const cssVar = TOKEN_TO_CSS_VAR[key];
    const value = brand.tokens[key];
    if (value) root.style.setProperty(cssVar, value);
  }

  if (brand.typography.headingFamily) {
    root.style.setProperty("--font-heading", brand.typography.headingFamily);
  }
  if (brand.typography.bodyFamily) {
    root.style.setProperty("--font-body", brand.typography.bodyFamily);
  }

  root.setAttribute("data-tenant", brand.slug);
  root.setAttribute("data-tenant-ready", "true");
}

export function resetTenantTheme(target?: HTMLElement) {
  if (typeof document === "undefined") return;
  const root = target ?? document.documentElement;
  for (const cssVar of Object.values(TOKEN_TO_CSS_VAR)) {
    root.style.removeProperty(cssVar);
  }
  root.style.removeProperty("--font-heading");
  root.style.removeProperty("--font-body");
  root.removeAttribute("data-tenant");
  root.removeAttribute("data-tenant-ready");
}
