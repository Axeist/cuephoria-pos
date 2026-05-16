/**
 * SubscriptionGate — gates the tenant app behind a valid Razorpay
 * subscription. Mounted INSIDE OnboardingGate so that:
 *
 *   - the auth + organization-resolution chain has already run, and
 *   - first-run users still get the onboarding wizard before being asked
 *     to pay.
 *
 * Policy (configurable below):
 *
 *   - Internal Cuephoria org is always allowed (billed offline).
 *   - Tenants whose `organizations.status === 'suspended'` are ALWAYS blocked,
 *     regardless of subscription state. This is set from the platform
 *     operator console (`/platform/organizations/:slug` → Suspend) and
 *     reflects an out-of-band decision (non-payment escalation, AUP
 *     violation, etc.). Owners are NOT redirected to /subscription for this
 *     reason — paying Razorpay won't unblock the workspace.
 *   - Tenants with `trialEndsAt` in the future are always allowed (free
 *     trial — they get the full app before paying).
 *   - Tenants with a subscription whose `razorpay_status` is in
 *     ALLOWED_RAZORPAY_STATUSES are allowed. Default set is intentionally
 *     LENIENT: ['active', 'authenticated', 'created']. Tighten to
 *     ['active', 'authenticated'] if you want to block users who created a
 *     subscription but never finished mandate authorisation. Both behaviours
 *     are valid SaaS patterns; pick based on your churn appetite.
 *   - Any tenant with `access_suspended === true` is ALWAYS blocked
 *     (overrides ALLOWED_RAZORPAY_STATUSES). This is set by the Razorpay
 *     webhook on halted / paused / cancelled / completed.
 *
 * Bypass paths — these never gate even for unpaid tenants so users can
 * always reach the screens that let them fix the problem:
 *   - /subscription (the billing page itself)
 *   - /account/* (security, password reset)
 *   - /onboarding/* (first-run wizard)
 *   - /login, /signup, /signup/google, /how-to-use, /receipt/*
 *   - Public marketing/legal pages (privacy, terms, refund-policy, etc.)
 *
 * Role-aware UX:
 *   - owner/admin → redirected to /subscription so they can renew/pay.
 *   - staff/manager/read_only → shown a full-screen "Subscription required"
 *     notice (they don't have permission to pay, so a redirect to /subscription
 *     would leave them stuck on a read-only page). The notice tells them who
 *     to contact.
 */

import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useOrganizationOptional,
  type ActiveOrganization,
  type ActiveSubscription,
} from "@/context/OrganizationContext";

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * Razorpay statuses that grant access to the app. Default = lenient (any
 * subscription that has been created and could still become active). To
 * tighten — e.g. require a paid mandate — drop `"created"` from this set:
 *
 *   const ALLOWED_RAZORPAY_STATUSES = new Set(["active", "authenticated"]);
 */
const ALLOWED_RAZORPAY_STATUSES = new Set<string>([
  "active",
  "authenticated",
  "created",
]);

/**
 * Paths that are NEVER gated. Compared as prefix matches (e.g. `/account/`
 * also matches `/account/change-password`).
 */
const BYPASS_PATH_PREFIXES = [
  "/subscription",
  "/account/",
  "/onboarding",
  "/login",
  "/signup",
  "/receipt",
  "/how-to-use",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/shipping-and-delivery",
  "/cancellation-and-refund",
  "/contact-us",
];

function isBypassPath(pathname: string): boolean {
  return BYPASS_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix === "/" ? prefix : `${prefix}`),
  );
}

export type AccessReason =
  | "internal"
  | "trial"
  | "active-sub"
  | "no-sub"
  | "suspended"
  | "platform-suspended"
  | "bad-status";

/**
 * Decide whether a tenant is allowed into the app based on org + subscription
 * state. Pure function so it's trivial to unit-test if we ever want to.
 *
 * Precedence: internal > platform suspension > razorpay suspension > trial > paid sub.
 * Platform suspension (set by the operator console flipping
 * `organizations.status` to 'suspended') trumps everything except the
 * "internal Cuephoria org always works" escape hatch.
 */
export function evaluateSubscriptionAccess(
  organization: ActiveOrganization | null,
  subscription: ActiveSubscription | null,
): {
  allowed: boolean;
  reason: AccessReason;
} {
  if (!organization) return { allowed: true, reason: "internal" }; // no org loaded yet, fail open
  if (organization.isInternal) return { allowed: true, reason: "internal" };

  if (organization.status === "suspended") {
    return { allowed: false, reason: "platform-suspended" };
  }

  // Free trial — overrides everything except `access_suspended`.
  const trialActive =
    organization.trialEndsAt && new Date(organization.trialEndsAt).getTime() > Date.now();
  if (subscription?.accessSuspended) return { allowed: false, reason: "suspended" };
  if (trialActive) return { allowed: true, reason: "trial" };

  if (!subscription || !subscription.hasSubscription) {
    return { allowed: false, reason: "no-sub" };
  }
  if (!subscription.razorpayStatus) return { allowed: false, reason: "bad-status" };
  if (ALLOWED_RAZORPAY_STATUSES.has(subscription.razorpayStatus)) {
    return { allowed: true, reason: "active-sub" };
  }
  return { allowed: false, reason: "bad-status" };
}

// ---------------------------------------------------------------------------
// Gate component
// ---------------------------------------------------------------------------

export const SubscriptionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const orgCtx = useOrganizationOptional();
  const location = useLocation();

  // Fail-open if the context isn't mounted yet (shouldn't happen given
  // App.tsx mounts OrganizationProvider above us, but be defensive).
  if (!orgCtx) return <>{children}</>;

  const { organization, subscription, status } = orgCtx;

  // While we're still resolving, render children rather than flashing a
  // redirect or a blocking spinner. The OrganizationContext keeps `status`
  // === "loading" only on the very first hit; subsequent refreshes preserve
  // the previously-loaded org so the gate stays decisive.
  if (status === "loading") return <>{children}</>;

  // Bypass paths — always render.
  if (isBypassPath(location.pathname)) return <>{children}</>;

  const verdict = evaluateSubscriptionAccess(organization, subscription);
  if (verdict.allowed) return <>{children}</>;

  // Platform suspension can't be self-served from /subscription (the operator
  // turned the workspace off; paying Razorpay won't unblock it). Owners,
  // admins, and everyone else all get the same lock screen.
  const isPrivileged =
    organization?.role === "owner" || organization?.role === "admin";
  if (isPrivileged && verdict.reason !== "platform-suspended") {
    return (
      <Navigate
        to="/subscription"
        replace
        state={{ from: location.pathname + location.search, reason: verdict.reason }}
      />
    );
  }

  return (
    <SubscriptionRequiredScreen
      organization={organization}
      subscription={subscription}
      reason={verdict.reason}
      onRefresh={() => orgCtx.refresh()}
    />
  );
};

// ---------------------------------------------------------------------------
// Read-only notice (non-admins)
// ---------------------------------------------------------------------------

type CopyReason = "suspended" | "platform-suspended" | "no-sub" | "bad-status";

const REASON_COPY: Record<CopyReason, { eyebrow: string; title: string; body: string }> = {
  "platform-suspended": {
    eyebrow: "Workspace suspended",
    title: "Workspace suspended",
    body:
      "Your Cuetronix workspace has been suspended by the platform operator. Access is paused for everyone on the team. Reach out to your Cuetronix account contact to get it reinstated.",
  },
  suspended: {
    eyebrow: "Subscription required",
    title: "Access suspended",
    body:
      "Your workspace's Razorpay subscription was paused, cancelled, or had its retries exhausted. Ask your owner to restore the mandate.",
  },
  "no-sub": {
    eyebrow: "Subscription required",
    title: "Subscription required",
    body:
      "Your workspace doesn't have an active subscription yet. Ask your owner to choose a plan and activate it.",
  },
  "bad-status": {
    eyebrow: "Subscription required",
    title: "Subscription needs attention",
    body:
      "Razorpay is reporting an issue with your workspace's subscription. Ask your owner to open Billing and review.",
  },
};

const SubscriptionRequiredScreen: React.FC<{
  organization: ActiveOrganization | null;
  subscription: ActiveSubscription | null;
  reason: AccessReason;
  onRefresh: () => void;
}> = ({ organization, subscription, reason, onRefresh }) => {
  const copy = REASON_COPY[reason as CopyReason] ?? REASON_COPY["no-sub"];
  const isPlatformSuspended = reason === "platform-suspended";

  return (
    <div className="min-h-screen app-ambient text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="glass-card p-8 sm:p-10 space-y-7 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center shadow-[0_10px_30px_-10px_var(--brand-primary-hex)]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
            }}
          >
            <Lock className="h-6 w-6 text-white" />
          </div>

          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-white/55">
              {copy.eyebrow}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {copy.title}
              {organization?.name && (
                <>
                  {" · "}
                  <span className="gradient-text-brand">{organization.name}</span>
                </>
              )}
            </h1>
            <p className="text-sm sm:text-base text-white/65 max-w-xl mx-auto">
              {copy.body}
            </p>
          </div>

          {!isPlatformSuspended && subscription?.razorpayStatus && (
            <div className="theme-inset inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-white/55">Current status</span>
              <span className="font-mono font-semibold text-white capitalize">
                {subscription.razorpayStatus}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="outline" onClick={onRefresh} className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Button asChild className="btn-gradient text-white">
              <Link to="/account/security">
                Manage my account <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-white/10 text-[11px] text-white/45 flex flex-col items-center gap-1.5">
            {isPlatformSuspended ? (
              <>
                <div className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  This lock is set by Cuetronix, not by Razorpay.
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                  Need help? Email
                  {" "}
                  <a className="underline hover:text-white" href="mailto:support@cuetronix.com">
                    support@cuetronix.com
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Recurring billing handled by Razorpay
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Need help? Reach out to your workspace owner or
                  {" "}
                  <a className="underline hover:text-white" href="mailto:billing@cuetronix.com">
                    billing@cuetronix.com
                  </a>
                </div>
                {!!subscription?.currentPeriodEnd && (
                  <div className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                    Last paid period ended {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;
