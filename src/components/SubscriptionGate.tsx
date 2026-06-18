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
 *   3. `organizations.status === 'trialing'` → allowed (trial), OR
 *      `organizations.trial_ends_at` in the future → allowed (free trial clock).
 *   4. `subscriptions.access_suspended === true` (Razorpay halt / pause /
 *      cancel / complete) →
 *        - within the fleet-configured grace window anchored at
 *          `subscriptions.access_suspended_at` → allowed with reason "grace";
 *          sticky banner counts down (billing suspend).
 *        - past the grace window → blocked with reason "suspended".
 *   5. `subscriptions.razorpay_status === "created"` (mandate incomplete) —
 *        - Fleet grace anchored at later of first `checkout_abandoned_at` stamp
 *          (checkout dismissed / failed attempt) OR `subscriptions.created_at`
 *          (fresh subscription API create) → allowed with mandate banner +
 *          Retry CTA until the later deadline.
 *        - No anchor timestamps, or grace expired → "bad-status" lock.
 *   6a. `subscriptions.lifecycleStatus` active|trialing only when verbatim
 *       `razorpay_status` is NOT `created` (that state maps internally to
 *       trialing and must NOT bypass mandate completion).
 *   7. `subscriptions.razorpay_status` in ALLOWED_RAZORPAY_STATUSES → allowed:
 *      `active`, `authenticated`, and `pending` (Razorpay automatic retry —
 *      same posture as webhook `subscription.pending`).
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
 *   - For "no-sub" / "bad-status": owners/admins see a full-screen interstitial
 *     that explains why other pages are blocked (with Razorpay context) and a
 *     clear CTA to Subscription — no silent redirect.
 *   - Staff see the same explanatory copy plus "ask a workspace owner" context.
 *   - For "platform-suspended" and "suspended" (post-grace): EVERYONE gets
 *     the lock screen, regardless of role — owners can still click "Open
 *     billing" but the redirect is opt-in, not automatic.
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
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
import { isInternalOrganization } from "@/types/tenancy";

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
 * - `pending`       — Razorpay is retrying a failed charge; internal row is
 *                      often `past_due`. We mirror the webhook: keep POS open
 *                      while Razorpay dunning runs (user can still fix in Billing).
 *
 * Intentionally EXCLUDED:
 *   - `created`        (subscription registered but never authorized)
 *   - `halted` / `paused` / `completed` / `expired` / `cancelled` (resolve in Billing)
 */
const ALLOWED_RAZORPAY_STATUSES = new Set<string>(["active", "authenticated", "pending"]);

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

export type SubscriptionGateBillingState = {
  subscriptionGateBanner?: {
    attemptedPath?: string;
    gateReason?: string;
    summary: string;
    detail: string;
  };
};

export type SubscriptionBarrierSnapshot = Pick<
  ActiveSubscription,
  "hasSubscription" | "razorpayStatus"
>;

/**
 * Human-readable blocking explanation for Billing + full-screen notices.
 */
export function explainSubscriptionBarrier(
  reason: "no-sub" | "bad-status",
  snapshot: SubscriptionBarrierSnapshot | null,
): { summary: string; detail: string } {
  if (reason === "no-sub") {
    return {
      summary: "No billable subscription on this workspace yet",
      detail:
        "Cuephoria needs an active Razorpay subscription row (plan + recurring mandate). Open Subscription below, pick Starter / Growth / Pro, and finish Razorpay checkout. After Razorpay shows Authenticated or Active, Dashboard and POS unlock for everyone—you can close this tab and use the sidebar normally.",
    };
  }

  const rz = (snapshot?.razorpayStatus ?? "").trim().toLowerCase() || null;
  if (rz === "created") {
    return {
      summary: "Payment mandate never finished—or the grace period ended",
      detail:
        "We created your plan in Razorpay, but the recurring mandate still shows as “Awaiting payment.” Either checkout was never completed, or the allowed setup window has expired. Use Subscription below to reopen Razorpay checkout and authorize the mandate. Until Razorpay moves past Created, POS and bookings stay locked by policy—not a bug.",
    };
  }
  if (rz === "halted" || rz === "paused") {
    const label = rz === "paused" ? "paused" : "halted";
    return {
      summary: `Razorpay has ${label} this subscription`,
      detail:
        "Charges are not succeeding under the current Razorpay state. Open Subscription to review status, resume if paused, or update payment methods. If Razorpay is healthy but this message persists after a refresh, webhooks may be delayed briefly.",
    };
  }
  if (rz === "pending") {
    return {
      summary: "Razorpay is retrying payment",
      detail:
        "If you still cannot open Dashboard or POS, open Subscription once to confirm Razorpay is not asking for manual action—or wait for the next automated retry—and press Refresh session after paying.",
    };
  }
  if (rz === "cancelled" || rz === "completed" || rz === "expired") {
    return {
      summary: "This paid subscription has ended",
      detail:
        "The billing cycle tied to Razorpay is no longer charging. Renew or pick a fresh plan from Subscription below to unlock the sidebar apps again.",
    };
  }
  if (!snapshot?.razorpayStatus) {
    return {
      summary: "Subscription status hasn’t synced from Razorpay yet",
      detail:
        "We don’t have a current Razorpay status on file. Finish any open step on Subscription, then use Refresh—or wait ~1 minute for webhooks. If billing still looks wrong after that, reopen checkout from Subscription.",
    };
  }
  return {
    summary: "Razorpay reports this workspace is not in a paid‑active state",
    detail:
      `Current Razorpay status: “${snapshot.razorpayStatus.replace(/_/g, " ")}”. Open Subscription below to resolve the failing step—after Razorpay is healthy again, Refresh or navigate away and modules unlock.`,
  };
}

function subscriptionBarrierSnapshotFromActive(
  subscription: ActiveSubscription | null,
): SubscriptionBarrierSnapshot | null {
  if (!subscription) return { hasSubscription: false, razorpayStatus: null };
  return {
    hasSubscription: subscription.hasSubscription,
    razorpayStatus: subscription.razorpayStatus,
  };
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
   * Present when `reason === "grace"`: billing suspend anchor vs mandate
   * grace while Razorpay is still `created` (anchored on row `created_at` and/or abandon).
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
  if (isInternalOrganization(organization.slug, organization.isInternal)) return { allowed: true, reason: "internal" };
  if (organization.isSandbox) return { allowed: true, reason: "internal" };

  if (organization.status === "suspended") {
    return { allowed: false, reason: "platform-suspended" };
  }

  const trialByClock =
    !!organization.trialEndsAt && new Date(organization.trialEndsAt).getTime() > now;
  /** Fleet lifecycle row sometimes stays `trialing` before `trial_ends_at` is stamped. */
  const orgMarkedTrialing = (organization.status ?? "").trim().toLowerCase() === "trialing";
  if (trialByClock || orgMarkedTrialing) return { allowed: true, reason: "trial" };

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
    const anchors: number[] = [];
    const createdRaw = subscription.subscriptionCreatedAt;
    if (createdRaw) {
      const tMs = new Date(createdRaw).getTime();
      if (Number.isFinite(tMs)) anchors.push(tMs + graceMs);
    }
    const abandonedRaw = subscription.checkoutAbandonedAt;
    if (abandonedRaw) {
      const aMs = new Date(abandonedRaw).getTime();
      if (Number.isFinite(aMs)) anchors.push(aMs + graceMs);
    }
    const graceUntilMs = anchors.length ? Math.max(...anchors) : null;
    if (graceUntilMs != null && now < graceUntilMs) {
      return {
        allowed: true,
        reason: "grace",
        graceUntilMs,
        graceKind: "mandate-abandon",
      };
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

/**
 * Owners/admins: explain why gated routes refuse to render, then explicit CTA
 * to Subscription (with location state consumed by Billing for a recap banner).
 */
const SubscriptionBillingInterstitial: React.FC<{
  organization: ActiveOrganization | null;
  subscription: ActiveSubscription | null;
  reason: "no-sub" | "bad-status";
  attemptedPath: string;
  onRefresh: () => void;
}> = ({ organization, subscription, reason, attemptedPath, onRefresh }) => {
  const snap = subscriptionBarrierSnapshotFromActive(subscription);
  const copy = explainSubscriptionBarrier(reason, snap);
  const billingLinkState = {
    subscriptionGateBanner: {
      attemptedPath,
      gateReason: reason,
      summary: copy.summary,
      detail: copy.detail,
    },
  };

  const pathLabel =
    attemptedPath && attemptedPath !== "/" ? attemptedPath : "this workspace";

  const rzChip =
    !subscription?.hasSubscription
      ? "No subscription on file yet"
      : subscription.razorpayStatus
        ? subscription.razorpayStatus.replace(/_/g, " ")
        : "Not synced from Razorpay";

  return (
    <div className="min-h-screen app-ambient text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="w-full glass-card p-8 sm:p-10 space-y-6 text-left">
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 shrink-0 rounded-2xl grid place-items-center"
              style={{
                background: "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
              }}
            >
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                Billing gate (owners &amp; admins)
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                This workspace can&apos;t open{" "}
                <span className="text-white font-mono text-[0.92em] break-all">{pathLabel}</span>
                {organization?.name ? (
                  <>
                    {" "}
                    for{" "}
                    <span className="gradient-text-brand whitespace-nowrap">{organization.name}</span>
                  </>
                ) : null}
              </h1>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 space-y-2">
            <div className="text-sm font-semibold text-white flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
              Why you&apos;re seeing this
            </div>
            <p className="text-[13px] font-semibold text-white/90">{copy.summary}</p>
            <p className="text-sm text-white/70 leading-relaxed">{copy.detail}</p>
          </div>

          <div className="theme-inset flex flex-wrap items-center gap-2 text-xs px-3 py-2 rounded-lg">
            <span className="text-white/50">Razorpay live status:</span>
            <span className="font-mono font-semibold text-white capitalize">{rzChip}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onRefresh}
              className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] sm:flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
              Refresh session
            </Button>
            <Button asChild className="btn-gradient text-white sm:flex-[1.3]">
              <Link to="/subscription" replace state={billingLinkState} className="inline-flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0" />
                Open Subscription &amp; Billing
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>

          <p className="text-[11px] text-white/45 leading-relaxed border-t border-white/10 pt-4">
            Cuephoria only unlocks Dashboard, POS, stations, bookings, etc. when billing is healthy. Complete the
            step on Subscription; when Razorpay shows <strong className="text-white/65">authenticated</strong> or{" "}
            <strong className="text-white/65">active</strong>, use Refresh session or revisit from the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
};

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
  const shouldExplainBillingBarrier =
    isPrivileged && (verdict.reason === "no-sub" || verdict.reason === "bad-status");
  if (shouldExplainBillingBarrier) {
    const reason = verdict.reason as "no-sub" | "bad-status";
    const attemptedPath = `${location.pathname}${location.search}`;
    return (
      <SubscriptionBillingInterstitial
        organization={organization}
        reason={reason}
        attemptedPath={attemptedPath}
        subscription={subscription}
        onRefresh={() => orgCtx.refresh()}
      />
    );
  }

  const attemptedPathFull = `${location.pathname}${location.search}`;
  const snap = subscriptionBarrierSnapshotFromActive(subscription);
  const barrierExplain =
    verdict.reason === "no-sub" || verdict.reason === "bad-status"
      ? explainSubscriptionBarrier(verdict.reason, snap)
      : null;

  return (
    <SubscriptionRequiredScreen
      organization={organization}
      subscription={subscription}
      reason={verdict.reason}
      attemptedPath={attemptedPathFull}
      barrierExplain={barrierExplain}
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
    graceKind === "mandate-abandon" ? "Mandate not complete yet." : "Payment issue.";
  const detail =
    graceKind === "mandate-abandon" ? (
      <>
        Finish Razorpay checkout within{" "}
        <span className="font-mono font-semibold text-white">{formatRemaining(remainingMs)}</span>{" "}
        to keep POS and bookings fully open — or open Billing to retry now.
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

function pathWithoutSearch(fullPath: string): string {
  const q = fullPath.indexOf("?");
  return q === -1 ? fullPath : fullPath.slice(0, q);
}

function isBillingOrSubscriptionAttempt(fullPath: string): boolean {
  const pathname = pathWithoutSearch(fullPath);
  return (
    pathname === "/subscription" ||
    pathname.startsWith("/subscription/") ||
    pathname === "/settings/billing" ||
    pathname.startsWith("/settings/billing/")
  );
}

const SubscriptionRequiredScreen: React.FC<{
  organization: ActiveOrganization | null;
  subscription: ActiveSubscription | null;
  reason: AccessReason;
  attemptedPath?: string;
  barrierExplain?: { summary: string; detail: string } | null;
  onRefresh: () => void;
}> = ({ organization, subscription, reason, attemptedPath, barrierExplain, onRefresh }) => {
  const copy = REASON_COPY[reason as CopyReason] ?? REASON_COPY["no-sub"];
  const isPlatformSuspended = reason === "platform-suspended";
  const billingBarrier =
    barrierExplain &&
    (reason === "no-sub" || reason === "bad-status")
      ? ({
          subscriptionGateBanner: {
            attemptedPath,
            gateReason: reason,
            summary: barrierExplain.summary,
            detail: barrierExplain.detail,
          },
        } satisfies SubscriptionGateBillingState)
      : undefined;

  const showStaffBillingHint =
    !!organization &&
    organization.role !== "owner" &&
    organization.role !== "admin" &&
    (reason === "no-sub" || reason === "bad-status");

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
            {attemptedPath && !isBillingOrSubscriptionAttempt(attemptedPath) && (
              <p className="text-[13px] text-white/50 max-w-xl mx-auto leading-relaxed pt-2">
                We blocked <span className="font-mono text-white/65 break-all">{attemptedPath}</span>{" "}
                because billing for this workspace is not passing the Subscription gate yet. Use Subscription below
                to finish the step; then reopen that page from the sidebar.
              </p>
            )}
            {billingBarrier?.subscriptionGateBanner && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-left max-w-xl mx-auto space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                  Why access is paused
                </div>
                <div className="text-sm font-semibold text-white">
                  {billingBarrier.subscriptionGateBanner.summary}
                </div>
                <p className="text-xs text-white/75 leading-relaxed">
                  {billingBarrier.subscriptionGateBanner.detail}
                </p>
              </div>
            )}
            {showStaffBillingHint && (
              <p className="text-xs text-sky-100/85 max-w-lg mx-auto leading-relaxed">
                Billing changes require owner or admin permissions. Ask a workspace owner to open Subscription and
                complete Razorpay for this tenancy — once they do, Dashboard and POS unlock for everyone.
              </p>
            )}
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
              <Link to={copy.primaryCta.to} replace={!!billingBarrier} state={billingBarrier}>
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
