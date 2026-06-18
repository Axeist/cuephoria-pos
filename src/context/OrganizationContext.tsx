/**
 * OrganizationContext — active-tenant state for the tenant admin console.
 *
 * Responsibilities:
 *   - Load the caller's active organization from `/api/admin/me`.
 *   - Expose a small, stable API (id, slug, role, isInternal, refresh).
 *   - Degrade gracefully. If the Slice 0 migration hasn't run yet, the
 *     endpoint returns `organization: null` and this context reports
 *     `status: 'no_org'` without ever throwing or blocking the UI.
 *
 * This context is always rendered inside AuthProvider. It owns no routing;
 * it only provides data.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";

export type ActiveOrganization = {
  id: string;
  slug: string;
  name?: string | null;
  isInternal: boolean;
  role: "owner" | "admin" | "manager" | "staff" | "read_only" | string;
  onboardingCompletedAt?: string | null;
  businessType?: string | null;
  branding?: Record<string, unknown>;
  trialEndsAt?: string | null;
  status?: string | null;
};

export type OrganizationStatus = "loading" | "ready" | "no_org" | "error";

type OrganizationContextValue = {
  organization: ActiveOrganization | null;
  status: OrganizationStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [status, setStatus] = useState<OrganizationStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setStatus("no_org");
      setError(null);
      return;
    }

    if (inFlight.current) return inFlight.current;

    const promise = (async () => {
      setStatus((prev) => (prev === "ready" ? prev : "loading"));
      setError(null);
      try {
        const res = await fetch("/api/admin/me", { credentials: "same-origin" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Failed to load org (${res.status})`);
        }
        const org = json.organization;
        if (!org) {
          setOrganization(null);
          setStatus("no_org");
          return;
        }
        setOrganization({
          id: String(org.id),
          slug: String(org.slug),
          name: org.name ?? null,
          isInternal: !!org.isInternal,
          role: org.role || "staff",
          onboardingCompletedAt: org.onboardingCompletedAt ?? null,
          businessType: org.businessType ?? null,
          branding: (org.branding as Record<string, unknown>) ?? {},
          trialEndsAt: org.trialEndsAt ?? null,
          status: org.status ?? null,
        });
        setStatus("ready");
      } catch (e) {
        setOrganization(null);
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    inFlight.current = promise;
    try {
      await promise;
    } finally {
      inFlight.current = null;
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organization,
      status,
      error,
      refresh: load,
    }),
    [organization, status, error, load],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}

/** Safe-outside variant for components that may mount before the provider. */
export function useOrganizationOptional(): OrganizationContextValue | null {
  return useContext(OrganizationContext) ?? null;
}
