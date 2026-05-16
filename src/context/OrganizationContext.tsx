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

/**
 * Lightweight subscription snapshot for the SubscriptionGate. Surfaced from
 * /api/admin/me alongside `organization` so we don't pay a second roundtrip
 * to decide whether the current tenant should be redirected to /subscription.
 *
 * `razorpayStatus` is the verbatim Razorpay state (created / authenticated /
 * active / pending / halted / cancelled / completed / expired / paused);
 * see src/server/lib/razorpay-subscriptions.ts for the 9-state map.
 */
export type ActiveSubscription = {
  hasSubscription: boolean;
  razorpayStatus: string | null;
  accessSuspended: boolean;
  /**
   * Wall-clock time at which Razorpay first suspended access (halt / pause /
   * cancel / complete). Used by SubscriptionGate to compute the 1-hour
   * grace window before the workspace fully locks.
   */
  accessSuspendedAt: string | null;
  planTier: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type OrganizationStatus = "loading" | "ready" | "no_org" | "error";

type OrganizationContextValue = {
  organization: ActiveOrganization | null;
  subscription: ActiveSubscription | null;
  status: OrganizationStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [status, setStatus] = useState<OrganizationStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setSubscription(null);
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
          setSubscription(null);
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
        const sub = json.subscription;
        if (sub && typeof sub === "object") {
          setSubscription({
            hasSubscription: !!sub.hasSubscription,
            razorpayStatus:
              typeof sub.razorpayStatus === "string" ? sub.razorpayStatus : null,
            accessSuspended: !!sub.accessSuspended,
            accessSuspendedAt:
              typeof sub.accessSuspendedAt === "string" ? sub.accessSuspendedAt : null,
            planTier: typeof sub.planTier === "string" ? sub.planTier : null,
            currentPeriodEnd:
              typeof sub.currentPeriodEnd === "string" ? sub.currentPeriodEnd : null,
            cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
          });
        } else {
          // No subscription block came back (legacy server or
          // org-resolution failed). Default to "no subscription" so the
          // gate can prompt the user to subscribe rather than failing
          // open into the app silently.
          setSubscription({
            hasSubscription: false,
            razorpayStatus: null,
            accessSuspended: false,
            accessSuspendedAt: null,
            planTier: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          });
        }
        setStatus("ready");
      } catch (e) {
        setOrganization(null);
        setSubscription(null);
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
      subscription,
      status,
      error,
      refresh: load,
    }),
    [organization, subscription, status, error, load],
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
