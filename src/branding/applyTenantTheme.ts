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

/**
 * Default landing-gradient hexes. Kept in sync with `:root` in index.css so
 * that applying the default brand is a visual no-op when a tenant has no
 * custom palette.
 */
const DEFAULT_BRAND_PRIMARY_HEX = "#7c3aed";
const DEFAULT_BRAND_ACCENT_HEX = "#ec4899";
const DEFAULT_BRAND_TERTIARY_HEX = "#3b82f6";

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

export type BrandGradientHexes = {
  primary?: string;
  accent?: string;
  tertiary?: string;
};

/**
 * Apply CSS tokens for a tenant. Also sets the `--brand-primary-hex` /
 * `--brand-accent-hex` / `--brand-tertiary-hex` variables that power the
 * ambient background, glass hover borders, and the `.btn-gradient` CTA.
 */
export function applyTenantTheme(
  brand: TenantBrand,
  target?: HTMLElement,
  gradientHexes?: BrandGradientHexes,
) {
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

  root.style.setProperty(
    "--brand-primary-hex",
    gradientHexes?.primary || DEFAULT_BRAND_PRIMARY_HEX,
  );
  root.style.setProperty(
    "--brand-accent-hex",
    gradientHexes?.accent || DEFAULT_BRAND_ACCENT_HEX,
  );
  root.style.setProperty(
    "--brand-tertiary-hex",
    gradientHexes?.tertiary || DEFAULT_BRAND_TERTIARY_HEX,
  );

  root.setAttribute("data-tenant", brand.slug);
  root.setAttribute("data-tenant-ready", "true");
}

const FAVICON_LINK_SELECTOR =
  "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']";

/**
 * Swap document favicon(s) for a tenant (public booking, branded login, etc.).
 * Returns a restore function that puts prior hrefs back on unmount.
 */
export function applyDocumentFavicon(url: string | undefined | null): () => void {
  if (typeof document === "undefined") return () => {};

  const trimmed = url?.trim() ?? "";
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>(FAVICON_LINK_SELECTOR),
  );
  const snapshot = links.map((el) => ({
    el,
    href: el.getAttribute("href") ?? el.href,
    type: el.getAttribute("type"),
  }));

  const restore = () => {
    for (const { el, href, type } of snapshot) {
      if (href) el.setAttribute("href", href);
      else el.removeAttribute("href");
      if (type) el.setAttribute("type", type);
      else el.removeAttribute("type");
    }
  };

  if (!trimmed) return restore;

  const targets =
    links.length > 0
      ? links
      : (() => {
          const link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
          return [link];
        })();

  const mime = trimmed.endsWith(".svg")
    ? "image/svg+xml"
    : trimmed.match(/\.(png|jpe?g|webp|gif)$/i)
      ? "image/png"
      : null;

  for (const el of targets) {
    el.href = trimmed;
    if (mime) el.type = mime;
    else el.removeAttribute("type");
  }

  return restore;
}

export function resetTenantTheme(target?: HTMLElement) {
  if (typeof document === "undefined") return;
  const root = target ?? document.documentElement;
  for (const cssVar of Object.values(TOKEN_TO_CSS_VAR)) {
    root.style.removeProperty(cssVar);
  }
  root.style.removeProperty("--font-heading");
  root.style.removeProperty("--font-body");
  root.style.removeProperty("--brand-primary-hex");
  root.style.removeProperty("--brand-accent-hex");
  root.style.removeProperty("--brand-tertiary-hex");
  root.removeAttribute("data-tenant");
  root.removeAttribute("data-tenant-ready");
}
