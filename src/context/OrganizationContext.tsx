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
import { setAdminCsrfToken } from "@/services/adminFetch";
import { fetchAdminMe } from "@/services/adminMeClient";
import { type WorkspaceMembershipBrief, parseWorkspaceMembershipsPayload } from "@/lib/tenantPortalLabels";
import { isInternalOrganization } from "@/types/tenancy";

export type ActiveOrganization = {
  id: string;
  slug: string;
  name?: string | null;
  isInternal: boolean;
  isSandbox?: boolean;
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
  /**
   * Internal bucket from `subscriptions.status` (trialing / active /
   * past_due / canceled / paused …). Mirrors Razorpay but can stay consistent
   * when `razorpay_status` is null or stale; SubscriptionGate trusts
   * active|trialing here when Razorpay is inconclusive (after ops reactivate).
   */
  lifecycleStatus: string | null;
  accessSuspended: boolean;
  /** Anchor for billing-suspend grace (Razorpay halt / pause / cancel / completed). */
  accessSuspendedAt: string | null;
  /**
   * First Razorpay checkout dismiss without mandate while `razorpay_status`
   * is still `created`. Anchors the fleet-configured billing grace countdown.
   */
  checkoutAbandonedAt: string | null;
  /** DB `subscriptions.created_at` — anchors mandate grace when Razorpay is still `created`. */
  subscriptionCreatedAt: string | null;
  planTier: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type ClientEntitlements = {
  planCode: string;
  planTier: string;
  isInternal: boolean;
  isSandbox: boolean;
  features: Record<string, boolean | number>;
};

export type OrganizationStatus = "loading" | "ready" | "no_org" | "error";

type OrganizationContextValue = {
  organization: ActiveOrganization | null;
  subscription: ActiveSubscription | null;
  entitlements: ClientEntitlements | null;
  /** Fleet-wide minutes; used by SubscriptionGate grace windows */
  billingAccessGraceMinutes: number;
  /** All workspaces this account belongs to (sign-in clarity for multi-org operators). */
  workspaceMemberships: WorkspaceMembershipBrief[];
  status: OrganizationStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<ClientEntitlements | null>(null);
  const [workspaceMemberships, setWorkspaceMemberships] = useState<WorkspaceMembershipBrief[]>([]);
  const [billingAccessGraceMinutes, setBillingAccessGraceMinutes] = useState(60);
  const [status, setStatus] = useState<OrganizationStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastFocusLoadAt = useRef(0);
  const FOCUS_REFETCH_MIN_MS = 5 * 60 * 1000;

  const load = useCallback(async (options?: { force?: boolean }) => {
    if (!user) {
      setOrganization(null);
      setSubscription(null);
      setEntitlements(null);
      setWorkspaceMemberships([]);
      setBillingAccessGraceMinutes(60);
      setStatus("no_org");
      setError(null);
      return;
    }

    if (inFlight.current) return inFlight.current;

    const promise = (async () => {
      setStatus((prev) => (prev === "ready" ? prev : "loading"));
      setError(null);
      try {
        const { res, json } = await fetchAdminMe({ force: options?.force });
        if (typeof json?.csrfToken === "string") setAdminCsrfToken(json.csrfToken);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Failed to load org (${res.status})`);
        }
        const gm = json.billingAccessGraceMinutes;
        if (typeof gm === "number" && Number.isFinite(gm) && gm > 0) {
          setBillingAccessGraceMinutes(Math.floor(gm));
        }
        const org = json.organization;
        if (!org) {
          setOrganization(null);
          setSubscription(null);
      setEntitlements(null);
          setWorkspaceMemberships(parseWorkspaceMembershipsPayload(json.workspaceMemberships));
          setBillingAccessGraceMinutes(60);
          setStatus("no_org");
          return;
        }
        setOrganization({
          id: String(org.id),
          slug: String(org.slug),
          name: org.name ?? null,
          isInternal: isInternalOrganization(String(org.slug), org.isInternal),
          isSandbox: !!org.isSandbox,
          role: org.role || "staff",
          onboardingCompletedAt: org.onboardingCompletedAt ?? null,
          businessType: org.businessType ?? null,
          branding: (org.branding as Record<string, unknown>) ?? {},
          trialEndsAt: org.trialEndsAt ?? null,
          status: org.status ?? null,
        });
        setWorkspaceMemberships(parseWorkspaceMembershipsPayload(json.workspaceMemberships));
        const ent = json.entitlements;
        const orgIsInternal = isInternalOrganization(String(org.slug), org.isInternal);
        if (ent && typeof ent === "object" && ent.features) {
          setEntitlements({
            planCode: String(ent.planCode ?? "starter"),
            planTier: String(ent.planTier ?? "starter"),
            isInternal: orgIsInternal || !!ent.isInternal,
            isSandbox: !!ent.isSandbox,
            features: ent.features as Record<string, boolean | number>,
          });
        } else if (orgIsInternal) {
          const features = Object.fromEntries(
            ["bookings_enabled", "staff_hr_enabled", "premium_modules_enabled", "max_branches", "max_stations", "max_admin_seats"].map((k) => [
              k,
              k.startsWith("max_") ? 999 : true,
            ]),
          );
          setEntitlements({
            planCode: "internal",
            planTier: "internal",
            isInternal: true,
            isSandbox: false,
            features,
          });
        } else {
          setEntitlements(null);
        }
        const sub = json.subscription;
        if (sub && typeof sub === "object") {
          setSubscription({
            hasSubscription: !!sub.hasSubscription,
            razorpayStatus:
              typeof sub.razorpayStatus === "string" ? sub.razorpayStatus : null,
            lifecycleStatus:
              typeof sub.lifecycleStatus === "string" ? sub.lifecycleStatus : null,
            accessSuspended: !!sub.accessSuspended,
            accessSuspendedAt:
              typeof sub.accessSuspendedAt === "string" ? sub.accessSuspendedAt : null,
            checkoutAbandonedAt:
              typeof sub.checkoutAbandonedAt === "string" ? sub.checkoutAbandonedAt : null,
            subscriptionCreatedAt:
              typeof sub.subscriptionCreatedAt === "string" ? sub.subscriptionCreatedAt : null,
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
            lifecycleStatus: null,
            accessSuspended: false,
            accessSuspendedAt: null,
            checkoutAbandonedAt: null,
            subscriptionCreatedAt: null,
            planTier: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          });
        }
        setStatus("ready");
      } catch (e) {
        setOrganization(null);
        setSubscription(null);
      setEntitlements(null);
        setWorkspaceMemberships([]);
        setBillingAccessGraceMinutes(60);
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

  // Initial load when the signed-in user changes. Avoid re-fetching on every
  // route change — that duplicated /api/admin/me before pages like /subscription
  // could load their own data. Call `refresh()` after billing mutations; refetch
  // on window focus so operator suspend/reactivate still propagates.
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      if (!user) return;
      const now = Date.now();
      if (now - lastFocusLoadAt.current < FOCUS_REFETCH_MIN_MS) return;
      lastFocusLoadAt.current = now;
      void load({ force: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load, user]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organization,
      subscription,
      entitlements,
      billingAccessGraceMinutes,
      workspaceMemberships,
      status,
      error,
      refresh: () => load({ force: true }),
    }),
    [organization, subscription, entitlements, billingAccessGraceMinutes, workspaceMemberships, status, error, load],
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
