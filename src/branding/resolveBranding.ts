/**
 * resolveBranding — merge a TenantBranding override into a base TenantBrand
 * and produce an applyTenantTheme-ready object.
 *
 * Inputs
 *   base: the DEFAULT_TENANT_BRAND (or another fallback) whose tokens are
 *         full HSL triplets compatible with shadcn/ui CSS variables.
 *   override: the subset of hex colors + string overrides from the API.
 *
 * Output
 *   A fully-populated TenantBrand where overridden primary/accent colors
 *   are converted to the same HSL triplet format. Unknown overrides are
 *   dropped silently — never throws.
 *
 * Why hex on the API and HSL in the CSS tokens
 *   The UI/platform editors talk in hex (familiar, pastable). The CSS
 *   system uses HSL triplets so shadcn utilities like `bg-primary/40` keep
 *   working. This module is the single bridge.
 */

import type { TenantBrand } from "./brand";

export type TenantBrandingOverride = {
  display_name?: string;
  tagline?: string;
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  icon_url?: string;
  hide_powered_by?: boolean;
};

/**
 * Parse "#rrggbb" into { h, s, l } (0..1, 0..100, 0..100).
 * Returns null on malformed input. Tolerates #RGB short form too.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (typeof hex !== "string") return null;
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(sat * 100),
    l: Math.round(l * 100),
  };
}

/** Format { h, s, l } as the CSS variable triplet that shadcn/ui expects. */
export function hslToTriplet(hsl: { h: number; s: number; l: number }): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Choose a legible foreground ("0 0% 100%" or "0 0% 10%") based on the
 * lightness of the passed HSL. Simple L-threshold is sufficient here —
 * WCAG-proper contrast would require channel-weighted luminance, which
 * is overkill for chrome surfaces.
 */
export function pickForeground(hsl: { h: number; s: number; l: number }): string {
  return hsl.l >= 55 ? "225 20% 13%" : "0 0% 100%";
}

export function resolveBrand(
  base: TenantBrand,
  override: TenantBrandingOverride | null | undefined,
): TenantBrand {
  if (!override) return base;

  const out: TenantBrand = {
    ...base,
    name: override.display_name?.trim() || base.name,
    assets: {
      ...base.assets,
      logoLightUrl: override.logo_url ?? base.assets.logoLightUrl,
      logoDarkUrl: override.logo_url ?? base.assets.logoDarkUrl,
      faviconUrl: override.icon_url ?? base.assets.faviconUrl,
    },
    hidePoweredBy:
      typeof override.hide_powered_by === "boolean"
        ? override.hide_powered_by
        : base.hidePoweredBy,
    tokens: { ...base.tokens },
  };

  if (override.primary_color) {
    const hsl = hexToHsl(override.primary_color);
    if (hsl) {
      out.tokens.primary = hslToTriplet(hsl);
      out.tokens.primaryForeground = pickForeground(hsl);
      out.tokens.ring = hslToTriplet({ ...hsl, l: Math.max(20, hsl.l - 25) });
    }
  }

  if (override.accent_color) {
    const hsl = hexToHsl(override.accent_color);
    if (hsl) {
      out.tokens.accent = hslToTriplet(hsl);
      out.tokens.accentForeground = pickForeground(hsl);
    }
  }

  return out;
}
