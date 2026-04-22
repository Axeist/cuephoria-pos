/**
 * BrandingProvider — fetches the active tenant's branding and applies it
 * to the document (CSS variables + favicon + page title suffix).
 *
 * Boundaries
 *   - Completely optional. Anything that boots before the provider (splash
 *     screens, login page) keeps the default Cuephoria theme.
 *   - Never throws. A failed fetch leaves the DEFAULT_TENANT_BRAND in place.
 *   - Does not trigger re-renders unless the branding object actually
 *     changed — compared by stable JSON.
 *
 * Scope
 *   Wraps everything rendered inside ProtectedRoute (i.e. after auth).
 *   We intentionally do NOT wrap the platform console, which already
 *   renders Cuetronix chrome.
 */

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { applyTenantTheme } from "./applyTenantTheme";
import { DEFAULT_TENANT_BRAND, type TenantBrand } from "./brand";
import { resolveBrand, type TenantBrandingOverride } from "./resolveBranding";

type ApiResponse =
  | { ok: true; branding: TenantBrandingOverride; canEdit?: boolean; role?: string }
  | { ok: false; error: string };

type BrandingContextValue = {
  /** The actively applied brand (base + overrides). */
  brand: TenantBrand;
  /** Just the raw overrides pulled from the API, for edit UIs. */
  override: TenantBrandingOverride;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const BrandingContext = React.createContext<BrandingContextValue | null>(null);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [override, setOverride] = React.useState<TenantBrandingOverride>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const lastAppliedKey = React.useRef<string>("");

  const refresh = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/branding", { credentials: "same-origin" });
      const json = (await res.json()) as ApiResponse;
      if (json.ok === false) {
        throw new Error(json.error);
      }
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      setOverride(json.branding || {});
    } catch (e) {
      console.warn("BrandingProvider: non-fatal load error", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      void refresh();
    } else {
      setOverride({});
    }
  }, [user, refresh]);

  const brand = React.useMemo(
    () => resolveBrand(DEFAULT_TENANT_BRAND, override),
    [override],
  );

  React.useEffect(() => {
    const gradientHexes = {
      primary: override.primary_color,
      accent: override.accent_color,
    };
    const key = JSON.stringify({
      tokens: brand.tokens,
      assets: brand.assets,
      gradient: gradientHexes,
    });
    if (key === lastAppliedKey.current) return;
    lastAppliedKey.current = key;
    try {
      applyTenantTheme(brand, undefined, gradientHexes);
    } catch (err) {
      console.warn("BrandingProvider: applyTenantTheme failed", err);
    }

    if (brand.assets.faviconUrl) {
      const existing = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (existing) {
        existing.href = brand.assets.faviconUrl;
      } else {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = brand.assets.faviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [brand, override.primary_color, override.accent_color]);

  const value = React.useMemo<BrandingContextValue>(
    () => ({ brand, override, loading, error, refresh }),
    [brand, override, loading, error, refresh],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export function useTenantBranding(): BrandingContextValue {
  const ctx = React.useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useTenantBranding must be used within BrandingProvider");
  }
  return ctx;
}

/** Safe outside provider (returns null) — handy for optional hooks. */
export function useTenantBrandingOptional(): BrandingContextValue | null {
  return React.useContext(BrandingContext);
}
