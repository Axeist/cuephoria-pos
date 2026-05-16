/**
 * SubscriptionGate — gates the tenant app behind a valid, paid subscription.
 *
 * Mounted INSIDE OnboardingGate so that the auth + organization-resolution
 * chain has already run and first-run users still get the onboarding wizard
 * before being asked to pay.
 *
 * Policy (precedence top → bottom):
 *
 *   1. Internal Cuephoria org → always allowed (billed offline).
 *   2. `organizations.status === 'suspended'` (platform operator turned the
 *      workspace off) → blocked with reason "platform-suspended". Paying
 *      Razorpay does NOT auto-unlock this; the operator has to reactivate.
 *      We still show a "Open billing" CTA in case the suspension is
 *      payment-related and the user wants to settle pre-emptively.
 *   3. `organizations.trial_ends_at` in the future → allowed (free trial).
 *   4. `subscriptions.access_suspended === true` (Razorpay halt / pause /
 *      cancel / complete) →
 *        - within the fleet-configured grace window anchored at
 *          `subscriptions.access_suspended_at` → allowed with reason "grace";
 *          sticky banner counts down (billing suspend).
 *        - past the grace window → blocked with reason "suspended".
 *   5. `subscriptions.razorpay_status === "created"` (mandate incomplete) —
 *        - Once checkout was dismissed (`checkout_abandoned_at`) and still
 *          within the same fleet grace → allowed with reason "grace" +
 *          mandate banner + Retry CTA.
 *        - No abandon stamp yet, or grace expired → "bad-status" lock.
 *   6a. `subscriptions.lifecycleStatus` active|trialing only when verbatim
 *       `razorpay_status` is NOT `created` (that state maps internally to
 *       trialing and must NOT bypass mandate completion).
 *   7. `subscriptions.razorpay_status` in ALLOWED_RAZORPAY_STATUSES → allowed:
 *      `active` and `authenticated` only.
 *   8. Otherwise → blocked.
 *
 * Bypass paths — render even for unpaid / suspended tenants so they can
 * always reach the screens that let them fix the problem:
 *   - /subscription           (the billing page itself)
 *   - /account/*              (security, password reset)
 *   - /onboarding/*           (first-run wizard)
 *   - /login, /signup, /signup/google, /how-to-use, /receipt/*
 *   - Public marketing/legal pages (privacy, terms, refund-policy, etc.)
 *
 * Role-aware UX:
 *   - For "no-sub" / "bad-status": owner/admin is redirected to
 *     /subscription so they can renew/pay. Staff sees a full-screen notice.
 *   - For "platform-suspended" and "suspended" (post-grace): EVERYONE gets
 *     the lock screen, regardless of role — owners can still click "Open
 *     billing" but the redirect is opt-in, not automatic.
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
  Timer,
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
 * Razorpay subscription statuses that count as "paid / active enough" to
 * grant access. Anything not in this set falls through to a "bad-status"
 * lock so the user lands on /subscription and can fix it.
 *
 * - `active`         — Razorpay has charged this subscription. Truly paid.
 * - `authenticated`  — mandate authorized, first charge pending. We allow
 *                      this because the user has completed payment intent;
 *                      Razorpay typically moves to `active` within minutes.
 *
 * Intentionally EXCLUDED:
 *   - `created`        (subscription registered but never authorized)
 *   - `pending` / `halted` (retry / dunning — show a CTA instead)
 *   - `paused` / `cancelled` / `completed` / `expired`
 */
const ALLOWED_RAZORPAY_STATUSES = new Set<string>(["active", "authenticated"]);

/**
 * Bucket from `subscriptions.status` (maintained alongside Razorpay). When we
 * are not in Razorpay access-suspended state and mandates are resolved
 * (`razorpay_status` is not still `created`), active|trialing here means an
 * in-good-standing subscription row even if `razorpay_status` was temporarily
 * null or out of sync (e.g. right after ops reactivated the org).
 */
const INTERNAL_SUBSCRIPTION_ALLOWED = new Set<string>(["active", "trialing"]);

export type EvaluateSubscriptionAccessOpts = {
  now?: number;
  billingAccessGraceMinutes?: number;
};

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
  | "grace"
  | "no-sub"
  | "suspended"
  | "platform-suspended"
  | "bad-status";

export type AccessVerdict = {
  allowed: boolean;
  reason: AccessReason;
  /**
   * Wall-clock timestamp (ms) at which the grace window expires. Only set
   * when `reason === "grace"`. Used by the GraceBanner to render a
   * countdown.
   */
  graceUntilMs?: number;
  /**
   * Present when `reason === "grace"`: distinguishes Razorpay billing suspend
   * vs abandoned mandate checkout while Razorpay is still `created`.
   */
  graceKind?: "billing-suspend" | "mandate-abandon";
};

/**
 * Decide whether a tenant is allowed into the app. Pure function so it's
 * trivial to unit-test if we ever want to.
 *
 * `now` is passed in so the function is testable; in production callers
 * just pass `Date.now()`.
 */
export function evaluateSubscriptionAccess(
  organization: ActiveOrganization | null,
  subscription: ActiveSubscription | null,
  opts?: EvaluateSubscriptionAccessOpts,
): AccessVerdict {
  const now = opts?.now ?? Date.now();
  const graceMinutes = opts?.billingAccessGraceMinutes ?? 60;
  const graceMs = graceMinutes * 60 * 1000;

  if (!organization) return { allowed: true, reason: "internal" }; // no org loaded yet, fail open
  if (organization.isInternal) return { allowed: true, reason: "internal" };

  if (organization.status === "suspended") {
    return { allowed: false, reason: "platform-suspended" };
  }

  const trialActive =
    !!organization.trialEndsAt && new Date(organization.trialEndsAt).getTime() > now;
  if (trialActive) return { allowed: true, reason: "trial" };

  if (!subscription || !subscription.hasSubscription) {
    return { allowed: false, reason: "no-sub" };
  }

  if (subscription.accessSuspended) {
    const suspendedAtMs = subscription.accessSuspendedAt
      ? new Date(subscription.accessSuspendedAt).getTime()
      : null;
    if (suspendedAtMs && Number.isFinite(suspendedAtMs)) {
      const graceUntilMs = suspendedAtMs + graceMs;
      if (now < graceUntilMs) {
        return {
          allowed: true,
          reason: "grace",
          graceUntilMs,
          graceKind: "billing-suspend",
        };
      }
    }
    return { allowed: false, reason: "suspended" };
  }

  const rz = (subscription.razorpayStatus ?? "").trim().toLowerCase();
  if (rz === "created") {
    const abandonedRaw = subscription.checkoutAbandonedAt;
    if (abandonedRaw) {
      const abandonMs = new Date(abandonedRaw).getTime();
      if (Number.isFinite(abandonMs)) {
        const graceUntilMs = abandonMs + graceMs;
        if (now < graceUntilMs) {
          return {
            allowed: true,
            reason: "grace",
            graceUntilMs,
            graceKind: "mandate-abandon",
          };
        }
      }
    }
    return { allowed: false, reason: "bad-status" };
  }

  const lifecycle = (subscription.lifecycleStatus ?? "").trim().toLowerCase();
  if (lifecycle && INTERNAL_SUBSCRIPTION_ALLOWED.has(lifecycle)) {
    return { allowed: true, reason: "active-sub" };
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
  // Re-evaluate every 30s so the lock fires automatically the moment the
  // grace window expires, even if the user never navigates. We just need a
  // state change to retrigger render; `Date.now()` in the verdict picks up
  // the fresh time.
  const [, setRevalidateTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setRevalidateTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!orgCtx) return <>{children}</>;

  const { organization, subscription, status, billingAccessGraceMinutes } = orgCtx;

  // While we're still resolving, render children rather than flashing a
  // redirect or a blocking spinner. The OrganizationContext keeps `status`
  // === "loading" only on the very first hit; subsequent refreshes preserve
  // the previously-loaded org so the gate stays decisive.
  if (status === "loading") return <>{children}</>;

  // Bypass paths — always render.
  if (isBypassPath(location.pathname)) return <>{children}</>;

  const verdict = evaluateSubscriptionAccess(organization, subscription, {
    billingAccessGraceMinutes,
  });

  if (verdict.allowed) {
    if (verdict.reason === "grace" && verdict.graceUntilMs && verdict.graceKind) {
      return (
        <>
          <GraceBanner
            graceUntilMs={verdict.graceUntilMs}
            graceKind={verdict.graceKind}
            onRefresh={() => orgCtx.refresh()}
          />
          {children}
        </>
      );
    }
    return <>{children}</>;
  }

  // Platform suspension can't be self-served from /subscription (the operator
  // turned the workspace off; paying Razorpay won't unblock it). Owners,
  // admins, and everyone else all get the same lock screen.
  const isPrivileged =
    organization?.role === "owner" || organization?.role === "admin";
  const shouldAutoRedirect =
    isPrivileged && (verdict.reason === "no-sub" || verdict.reason === "bad-status");
  if (shouldAutoRedirect) {
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
// Grace banner (sticky, non-blocking)
// ---------------------------------------------------------------------------

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins >= 1) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

const GraceBanner: React.FC<{
  graceUntilMs: number;
  graceKind: "billing-suspend" | "mandate-abandon";
  onRefresh: () => void;
}> = ({ graceUntilMs, graceKind, onRefresh }) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, graceUntilMs - now);

  const headline =
    graceKind === "mandate-abandon" ? "Checkout closed." : "Payment issue.";
  const detail =
    graceKind === "mandate-abandon" ? (
      <>
        Complete payment within{" "}
        <span className="font-mono font-semibold text-white">{formatRemaining(remainingMs)}</span>{" "}
        to keep workspace access open.
      </>
    ) : (
      <>
        Workspace access locks in{" "}
        <span className="font-mono font-semibold text-white">{formatRemaining(remainingMs)}</span>
        . Retry billing to restore continuous access.
      </>
    );

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-rose-500/15 backdrop-blur supports-[backdrop-filter]:bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
          <div className="text-sm leading-snug">
            <span className="font-semibold text-white">{headline}</span> {detail}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.10]"
            onClick={onRefresh}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button asChild size="sm" className="h-8 btn-gradient text-white">
            <Link to="/subscription">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Retry payment
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Full-screen lock notice
// ---------------------------------------------------------------------------

type CopyReason = "suspended" | "platform-suspended" | "no-sub" | "bad-status";

type LockCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: { label: string; to: string };
  showSupportFooter: boolean;
  showBillingFooter: boolean;
};

const REASON_COPY: Record<CopyReason, LockCopy> = {
  "platform-suspended": {
    eyebrow: "Workspace suspended",
    title: "Workspace access paused",
    body:
      "Your Cuetronix workspace has been suspended by the platform operator. Access is paused for everyone on the team. If you believe this is a payment issue, opening Billing will let you retry. Otherwise, reach out to your Cuetronix account contact to get it reinstated.",
    primaryCta: { label: "Open billing", to: "/subscription" },
    showSupportFooter: true,
    showBillingFooter: false,
  },
  suspended: {
    eyebrow: "Payment required",
    title: "Subscription suspended",
    body:
      "Razorpay was unable to keep your subscription in good standing through the billing grace window. Retry payment now to restore access — your team can be back in the app in under a minute.",
    primaryCta: { label: "Retry payment", to: "/subscription" },
    showSupportFooter: false,
    showBillingFooter: true,
  },
  "no-sub": {
    eyebrow: "Subscription required",
    title: "Choose a plan",
    body:
      "Your workspace doesn't have an active subscription yet. Pick a plan and authorise the Razorpay mandate to unlock the app for everyone on your team.",
    primaryCta: { label: "Open billing", to: "/subscription" },
    showSupportFooter: false,
    showBillingFooter: true,
  },
  "bad-status": {
    eyebrow: "Subscription needs attention",
    title: "Action needed on your subscription",
    body:
      "Razorpay is reporting an issue with your workspace's subscription. Open Billing to review the status and complete the next required step.",
    primaryCta: { label: "Open billing", to: "/subscription" },
    showSupportFooter: false,
    showBillingFooter: true,
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
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="w-full glass-card p-8 sm:p-10 space-y-7 text-center">
          <div
            className="mx-auto h-16 w-16 rounded-2xl grid place-items-center shadow-[0_18px_40px_-14px_var(--brand-primary-hex)]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
            }}
          >
            <Lock className="h-7 w-7 text-white" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
              <Sparkles className="h-3 w-3 text-amber-300" />
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
            <p className="text-sm sm:text-base text-white/65 max-w-xl mx-auto leading-relaxed">
              {copy.body}
            </p>
          </div>

          {!isPlatformSuspended && subscription?.razorpayStatus && (
            <div className="theme-inset inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full">
              <Timer className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-white/55">Razorpay status</span>
              <span className="font-mono font-semibold text-white capitalize">
                {subscription.razorpayStatus.replace(/_/g, " ")}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={onRefresh}
              className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Button asChild className="btn-gradient text-white">
              <Link to={copy.primaryCta.to}>
                <CreditCard className="h-4 w-4 mr-1.5" />
                {copy.primaryCta.label}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-white/10 text-[11px] text-white/45 flex flex-col items-center gap-1.5">
            {copy.showSupportFooter && (
              <>
                <div className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  This lock was set by Cuetronix, not by Razorpay.
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                  Need help? Email{" "}
                  <a className="underline hover:text-white" href="mailto:support@cuetronix.com">
                    support@cuetronix.com
                  </a>
                </div>
              </>
            )}
            {copy.showBillingFooter && (
              <>
                <div className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Recurring billing handled by Razorpay
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Need help? Email{" "}
                  <a className="underline hover:text-white" href="mailto:billing@cuetronix.com">
                    billing@cuetronix.com
                  </a>
                </div>
                {!!subscription?.currentPeriodEnd && (
                  <div className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                    Last paid period ended{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
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
