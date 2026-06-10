/**
 * /subscription (also routed at the legacy /settings/billing) — Razorpay
 * subscription management.
 *
 * Backend contract lives at /api/tenant/billing and supports the actions:
 *   create / renew / verify-payment / upgrade / cancel-scheduled-change /
 *   cancel / pause / resume / fetch-invoices
 *
 * Subscription mandate is created server-side, then the customer authorises
 * via Razorpay Standard Checkout (subscription_id flow). On success the
 * Checkout handler posts the signature to /api/tenant/billing verify-payment
 * for HMAC verification before access is granted. Webhooks keep the local
 * subscription state in sync after that.
 *
 * The page reads `razorpay_status` (verbatim) for badges so all 9 Razorpay
 * lifecycle states are visible. `subscriptions.status` (internal bucket) is
 * still maintained server-side for other surfaces.
 *
 * Visual contract:
 *   - Matches the rest of the app via .glass-card, brand-* CSS vars, and
 *     .btn-gradient. Razorpay branding (logo + "Secured by Razorpay") is
 *     surfaced prominently so customers know who is processing the mandate.
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import type { SubscriptionGateBillingState } from "@/components/SubscriptionGate";
import { useOrganizationOptional } from "@/context/OrganizationContext";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  FlaskConical,
  HelpCircle,
  Hourglass,
  ListChecks,
  Lock,
  Loader2,
  Pause,
  Play,
  Receipt,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Timer,
  XCircle,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import PaymentProviderBrand from "@/components/settings/PaymentProviderBrand";
import PlanRecommendationQuizDialog from "@/components/billing/PlanRecommendationQuizDialog";
import { PLAN_MARKETING, PLAN_FEATURE_MATRIX, yearlySavingsPercent } from "@/billing/planCatalog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types mirroring /api/tenant/billing response shapes
// ---------------------------------------------------------------------------

type BillingCycle = "month" | "year";
type PlanTier = "starter" | "growth" | "pro" | "test";

type RazorpayStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused";

interface Plan {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  is_active: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  razorpay_plan_id_month: string | null;
  razorpay_plan_id_year: string | null;
  sort_order: number;
}

interface ScheduledChange {
  plan_id?: string;
  plan_tier?: string;
  billing_cycle?: BillingCycle;
  razorpay_plan_id?: string;
  requested_at?: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  // All of the lifecycle columns are marked optional because the schema
  // migration that introduces them may not have been applied yet on a given
  // environment; the GET handler returns SELECT * and we defend against the
  // missing-field case throughout the UI.
  plan_tier?: PlanTier | null;
  billing_cycle?: BillingCycle | null;
  provider?: string;
  status?: string;
  razorpay_status?: RazorpayStatus | null;
  interval?: BillingCycle;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  cancel_at_period_end?: boolean;
  cancel_requested_at?: string | null;
  razorpay_subscription_id?: string | null;
  razorpay_customer_id?: string | null;
  total_count?: number | null;
  paid_count?: number;
  remaining_count?: number | null;
  charge_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  last_payment_id?: string | null;
  last_payment_amount?: number | null;
  scheduled_change?: ScheduledChange | null;
  access_suspended?: boolean;
  /** Set when Razorpay checkout is dismissed without mandate while status is created */
  checkout_abandoned_at?: string | null;
  created_at?: string | null;
}

interface Invoice {
  id: string;
  status: string;
  amount_inr: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  short_url: string | null;
  provider_invoice_id: string | null;
  provider_payment_id: string | null;
  provider_subscription_id: string | null;
  created_at: string;
}

interface BillingResponse {
  ok: true;
  role: string;
  canEdit: boolean;
  organization: {
    id: string;
    slug: string;
    name: string;
    currency: string;
    country: string;
    status: string;
    is_internal: boolean;
    is_sandbox?: boolean;
    trial_ends_at: string | null;
  };
  subscription: Subscription | null;
  currentPlan: { id: string; code: string; name: string } | null;
  plans: Plan[];
  invoices: Invoice[];
  razorpay: { mode: "live" | "test"; keyId: string };
  billingContactEmail: string | null;
  billingPrefillName: string | null;
  billingAccessGraceMinutes?: number;
  sandboxExpiresAt?: string | null;
}

interface CreateSuccess {
  ok: true;
  reused?: boolean;
  subscriptionId: string;
  shortUrl: string | null;
  checkout: {
    keyId: string;
    subscriptionId: string;
    customerId?: string | null;
    shortUrl?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Razorpay branding (official assets via PaymentProviderBrand)
// ---------------------------------------------------------------------------

function RazorpayTrustBadge({
  mode,
  size = "md",
}: {
  mode?: string;
  size?: "sm" | "md" | "lg";
}) {
  const brandSize = size === "lg" ? "md" : "sm";
  const pad = size === "lg" ? "px-4 py-2.5" : size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl border border-[#3395FF]/25",
        "bg-white/[0.04] backdrop-blur-sm shadow-[0_8px_28px_-12px_rgba(51,149,255,0.35)]",
        pad,
      )}
    >
      <ShieldCheck
        className={cn(
          "shrink-0 text-emerald-400",
          size === "lg" ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      <span
        className={cn(
          "font-medium text-white/60",
          size === "lg" ? "text-sm" : "text-xs",
        )}
      >
        Secured by
      </span>
      <PaymentProviderBrand provider="razorpay" size={brandSize} variant="logo" padded />
      {mode ? (
        <span
          className={cn(
            "rounded-md bg-[#3395FF]/15 font-bold uppercase tracking-wider text-sky-200 border border-[#3395FF]/30",
            size === "lg" ? "px-2 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]",
          )}
        >
          {mode}
        </span>
      ) : null}
    </div>
  );
}

function RazorpayPoweredBy({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 text-xs text-white/60 ${className}`}>
      <span>Payments powered by</span>
      <PaymentProviderBrand provider="razorpay" size="sm" variant="logo" padded={false} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status metadata — single source of truth for badges + copy
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "Cuephoria POS";
const RAZORPAY_THEME = "#3399cc";

const STATUS_META: Record<
  RazorpayStatus,
  { label: string; description: string; badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  created: {
    label: "Awaiting payment",
    description: "Subscription created. Complete the mandate to activate.",
    badge: "bg-sky-500/15 text-sky-200 border-sky-500/40",
    icon: Hourglass,
  },
  authenticated: {
    label: "Authentication complete",
    description: "First payment authorised. Activating shortly…",
    badge: "bg-sky-500/15 text-sky-200 border-sky-500/40",
    icon: Hourglass,
  },
  active: {
    label: "Active",
    description: "Auto-renews on schedule.",
    badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
    icon: CheckCircle2,
  },
  pending: {
    label: "Payment retrying",
    description: "A charge failed. Razorpay is retrying automatically over the next 24h.",
    badge: "bg-amber-500/15 text-amber-200 border-amber-500/40",
    icon: AlertTriangle,
  },
  halted: {
    label: "Payment failed",
    description: "All retries exhausted. Update your payment method to restore access.",
    badge: "bg-rose-500/15 text-rose-200 border-rose-500/40",
    icon: AlertTriangle,
  },
  paused: {
    label: "Paused",
    description: "Billing paused. POS access is suspended until you resume.",
    badge: "bg-zinc-500/20 text-zinc-200 border-zinc-500/40",
    icon: Pause,
  },
  cancelled: {
    label: "Cancelled",
    description: "Subscription cancelled. Renew anytime to continue using the platform.",
    badge: "bg-zinc-500/20 text-zinc-200 border-zinc-500/40",
    icon: XCircle,
  },
  completed: {
    label: "All cycles complete",
    description: "Every billing cycle has been charged. Renew to keep using the platform.",
    badge: "bg-zinc-500/20 text-zinc-200 border-zinc-500/40",
    icon: CheckCircle2,
  },
  expired: {
    label: "Mandate expired",
    description: "Customer authentication was not completed in time. Start a new subscription.",
    badge: "bg-zinc-500/20 text-zinc-200 border-zinc-500/40",
    icon: XCircle,
  },
};

const TERMINAL_STATUSES: RazorpayStatus[] = ["cancelled", "completed", "expired"];
const REUSABLE_STATUSES: RazorpayStatus[] = ["created", "authenticated", "active"];

// ---------------------------------------------------------------------------
// Razorpay Checkout script loader
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (evt: string, fn: (...args: unknown[]) => void) => void;
    };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Razorpay script failed")), {
          once: true,
        });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Razorpay script failed"));
      document.body.appendChild(s);
    });
  }
  return razorpayScriptPromise;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function tierLabel(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function formatGraceCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins >= 1) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

/**
 * Error subtype that carries the raw HTTP status and body snippet from a
 * failed /api/tenant/billing call. The error card surfaces these so a stuck
 * page is never a black box for QA.
 */
export class BillingApiError extends Error {
  status: number;
  bodySnippet: string;
  url: string;
  constructor(message: string, opts: { status: number; bodySnippet: string; url: string }) {
    super(message);
    this.name = "BillingApiError";
    this.status = opts.status;
    this.bodySnippet = opts.bodySnippet;
    this.url = opts.url;
  }
}

async function parseBillingJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trim();
  const snippet = trimmed.replace(/\s+/g, " ").slice(0, 220);
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksJson) {
    throw new BillingApiError(
      snippet || `Billing request failed (HTTP ${res.status}).`,
      { status: res.status, bodySnippet: snippet, url: res.url },
    );
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new BillingApiError(snippet, { status: res.status, bodySnippet: snippet, url: res.url });
  }
}

async function postBillingAction<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T> {
  console.log("[Billing] POST /api/tenant/billing", body);
  const res = await fetch("/api/tenant/billing", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`[Billing] POST response: HTTP ${res.status}`);
  const json = await parseBillingJson(res);
  if (json.ok === false) {
    throw new BillingApiError(String(json.error || "Request failed"), {
      status: res.status,
      bodySnippet: JSON.stringify(json).slice(0, 220),
      url: res.url,
    });
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const subscriptionGateBanner = (location.state as SubscriptionGateBillingState | null)
    ?.subscriptionGateBanner;
  const dismissSubscriptionGateBanner = React.useCallback(() => {
    navigate(".", { replace: true, state: {} });
  }, [navigate]);
  const orgCtx = useOrganizationOptional();
  const [cycle, setCycle] = React.useState<BillingCycle>("month");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [pendingTier, setPendingTier] = React.useState<PlanTier | null>(null);
  const [billingNow, setBillingNow] = React.useState(Date.now());
  const [planQuizOpen, setPlanQuizOpen] = React.useState(false);
  const [comparePlansOpen, setComparePlansOpen] = React.useState(false);
  const [highlightedPlan, setHighlightedPlan] = React.useState<PlanTier | null>(null);
  const planQuizAutoOpened = React.useRef(false);

  React.useEffect(() => {
    const id = window.setInterval(() => setBillingNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Mount-time diagnostics. If you ever look at /settings/billing and the
  // page is stuck on the skeleton, the very first thing to check is whether
  // this line appears in the browser console. If it does NOT, the route
  // never mounted (likely OnboardingGate or auth redirect intercepted).
  React.useEffect(() => {
    console.log("[Billing] mounted at", location.pathname, location.search);
    return () => {
      console.log("[Billing] unmounted");
    };
  }, [location.pathname, location.search]);

  const refreshBilling = React.useCallback(() => {
    console.log("[Billing] invalidate cache");
    void qc.invalidateQueries({ queryKey: ["tenant-billing"] });
    // Refresh OrganizationContext too — the SubscriptionGate reads its
    // verdict from there, so anything that changes the subscription state
    // (subscribe, cancel, pause, resume, verify-payment, …) must trigger a
    // re-resolve or the user stays on the wrong screen until the next nav.
    if (orgCtx) void orgCtx.refresh();
  }, [qc, orgCtx]);

  const recordDismissAndRefresh = React.useCallback(async () => {
    try {
      await postBillingAction<{ ok: boolean }>({ action: "record-checkout-dismiss" });
    } catch {
      // Non-fatal: user can still settle from Razorpay; gate only needs best-effort.
    } finally {
      refreshBilling();
    }
  }, [refreshBilling]);

  const billingQ = useQuery<BillingResponse, BillingApiError | Error>({
    queryKey: ["tenant-billing"],
    queryFn: async ({ signal }) => {
      console.log("[Billing] GET /api/tenant/billing — start");
      const controller = new AbortController();
      const onMainAbort = () => controller.abort();
      signal.addEventListener("abort", onMainAbort);
      const t0 = performance.now();
      const t = window.setTimeout(() => controller.abort(), 20_000);
      try {
        const res = await fetch("/api/tenant/billing", {
          credentials: "include",
          signal: controller.signal,
        });
        const elapsed = Math.round(performance.now() - t0);
        console.log(`[Billing] GET response: HTTP ${res.status} in ${elapsed}ms`);
        const json = await parseBillingJson(res);
        if (json.ok === false) {
          throw new BillingApiError(String(json.error || "Failed to load billing"), {
            status: res.status,
            bodySnippet: JSON.stringify(json).slice(0, 220),
            url: res.url,
          });
        }
        if (!res.ok) {
          throw new BillingApiError(`Billing request failed (HTTP ${res.status}).`, {
            status: res.status,
            bodySnippet: JSON.stringify(json).slice(0, 220),
            url: res.url,
          });
        }
        console.log("[Billing] GET ok — plans:", (json as BillingResponse).plans?.length ?? 0);
        return json as BillingResponse;
      } catch (e: unknown) {
        const name = e && typeof e === "object" && "name" in e ? (e as { name?: string }).name : "";
        if (name === "AbortError") {
          const timeoutErr = new BillingApiError(
            "Billing request timed out after 20s. Check the API deployment / network.",
            { status: 0, bodySnippet: "client abort", url: "/api/tenant/billing" },
          );
          console.error("[Billing] aborted", timeoutErr);
          throw timeoutErr;
        }
        console.error("[Billing] GET failed", e);
        throw e instanceof Error ? e : new Error(String(e));
      } finally {
        window.clearTimeout(t);
        signal.removeEventListener("abort", onMainAbort);
      }
    },
    refetchOnMount: true,
    retry: 1,
    retryDelay: 800,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });

  React.useEffect(() => {
    console.log(
      `[Billing] query state — status=${billingQ.status} fetchStatus=${billingQ.fetchStatus} ` +
        `isLoading=${billingQ.isLoading} isError=${billingQ.isError} hasData=${!!billingQ.data}`,
    );
  }, [billingQ.status, billingQ.fetchStatus, billingQ.isLoading, billingQ.isError, billingQ.data]);

  React.useEffect(() => {
    if (!billingQ.data || billingQ.data.organization.is_internal || planQuizAutoOpened.current) return;
    planQuizAutoOpened.current = true;
    const t = window.setTimeout(() => setPlanQuizOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [billingQ.data]);

  const focusRecommendedPlan = React.useCallback((tier: PlanTier) => {
    setHighlightedPlan(tier);
    window.setTimeout(() => {
      document.getElementById(`billing-plan-${tier}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    window.setTimeout(() => setHighlightedPlan(null), 4000);
  }, []);

  // Hosted checkout completes in another tab — poll + refetch on return so mandate
  // state catches up when webhooks are delayed or missed.
  React.useEffect(() => {
    if (billingQ.data?.organization.is_internal) return;
    const rs = billingQ.data?.subscription?.razorpay_status;
    if (rs !== "created" && rs !== "authenticated") return;
    const id = window.setInterval(() => {
      refreshBilling();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [
    billingQ.data?.organization.is_internal,
    billingQ.data?.subscription?.razorpay_status,
    refreshBilling,
  ]);

  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const rs = billingQ.data?.subscription?.razorpay_status;
      if (rs === "created" || rs === "authenticated") {
        refreshBilling();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [billingQ.data?.subscription?.razorpay_status, refreshBilling]);

  // Mutations -------------------------------------------------------------

  const createM = useMutation({
    mutationFn: async (args: { planTier: PlanTier; billingCycle: BillingCycle; renew?: boolean }) => {
      return postBillingAction<CreateSuccess>({
        action: args.renew ? "renew" : "create",
        planTier: args.planTier,
        billingCycle: args.billingCycle,
      });
    },
    onSuccess: async (data, args) => {
      const snap = qc.getQueryData<BillingResponse>(["tenant-billing"]);
      const orgName = snap?.organization.name ?? "Workspace";
      const email = snap?.billingContactEmail ?? "";
      const prefillName = snap?.billingPrefillName ?? "";
      const plan = snap?.plans.find((p) => p.code === args.planTier);
      const planName = plan?.name ?? tierLabel(args.planTier);
      await launchCheckout(data, {
        orgName,
        prefilledEmail: email,
        prefilledName: prefillName,
        planDescription: `${planName} (${args.billingCycle === "year" ? "Yearly" : "Monthly"}) Subscription`,
      });
      refreshBilling();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Subscription failed", description: err.message });
      setPendingTier(null);
    },
  });

  const upgradeM = useMutation({
    mutationFn: async (args: { planTier: PlanTier; billingCycle: BillingCycle }) =>
      postBillingAction({
        action: "upgrade",
        planTier: args.planTier,
        billingCycle: args.billingCycle,
      }),
    onSuccess: (_d, args) => {
      refreshBilling();
      toast({
        title: "Plan change scheduled",
        description: `${tierLabel(args.planTier)} (${
          args.billingCycle === "year" ? "Yearly" : "Monthly"
        }) takes effect at your next renewal.`,
      });
      setPendingTier(null);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Plan change failed", description: err.message });
      setPendingTier(null);
    },
  });

  const sandboxSwitchM = useMutation({
    mutationFn: async (args: { planCode: PlanTier; confirm?: boolean }) =>
      postBillingAction<{ ok: true; warnings?: string[] }>({
        action: "sandbox-switch-plan",
        planCode: args.planCode,
        planTier: args.planCode,
        confirm: args.confirm,
      }),
    onSuccess: (_d, args) => {
      refreshBilling();
      toast({
        title: "Demo plan switched",
        description: `You're now previewing ${tierLabel(args.planCode)} restrictions.`,
      });
      setPendingTier(null);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Plan switch failed", description: err.message });
      setPendingTier(null);
    },
  });

  const cancelScheduledM = useMutation({
    mutationFn: async () => postBillingAction({ action: "cancel-scheduled-change" }),
    onSuccess: () => {
      refreshBilling();
      toast({ title: "Scheduled change cancelled", description: "Your current plan continues as-is." });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Could not cancel change", description: err.message }),
  });

  const cancelM = useMutation({
    mutationFn: async () => postBillingAction({ action: "cancel" }),
    onSuccess: () => {
      refreshBilling();
      toast({
        title: "Cancellation scheduled",
        description: "Access continues until the end of the current paid period.",
      });
      setCancelOpen(false);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Cancel failed", description: err.message }),
  });

  const pauseM = useMutation({
    mutationFn: async () => postBillingAction({ action: "pause" }),
    onSuccess: () => {
      refreshBilling();
      toast({ title: "Subscription paused", description: "POS access is suspended until you resume." });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Pause failed", description: err.message }),
  });

  const resumeM = useMutation({
    mutationFn: async () => postBillingAction({ action: "resume" }),
    onSuccess: () => {
      refreshBilling();
      toast({ title: "Subscription resumed", description: "Auto-renewal is back on." });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Resume failed", description: err.message }),
  });

  const fetchInvoicesM = useMutation({
    mutationFn: async () =>
      postBillingAction<{
        ok: true;
        invoices: Invoice[];
        subscription?: Subscription | null;
        subscriptionSynced?: boolean;
      }>({ action: "fetch-invoices" }),
    onSuccess: (data) => {
      qc.setQueryData<BillingResponse | undefined>(["tenant-billing"], (prev) =>
        prev
          ? {
              ...prev,
              invoices: data.invoices,
              ...(data.subscription ? { subscription: data.subscription as Subscription } : {}),
            }
          : prev,
      );
      if (data.subscriptionSynced) {
        refreshBilling();
      } else {
        void orgCtx?.refresh();
      }
      toast({
        title: data.subscriptionSynced ? "Billing synced from Razorpay" : "Invoices refreshed from Razorpay",
      });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Could not refresh from Razorpay", description: err.message }),
  });

  // Checkout launcher -----------------------------------------------------

  const launchCheckout = async (
    payload: CreateSuccess,
    opts: { orgName: string; prefilledEmail: string; prefilledName: string; planDescription: string },
  ) => {
    const ch = payload.checkout;
    const hosted = ch?.shortUrl ?? payload.shortUrl ?? null;

    // Try Standard Checkout first (best UX); fall back to hosted short_url
    // if the script is blocked or the customer's browser refuses to load it.
    try {
      await loadRazorpayCheckoutScript();
    } catch {
      if (hosted) {
        toast({ title: "Opening Razorpay", description: "Loading the secure hosted page…" });
        window.open(hosted, "_blank", "noopener,noreferrer");
        return;
      }
      toast({
        variant: "destructive",
        title: "Checkout script blocked",
        description: "Allow scripts for this site and try again.",
      });
      return;
    }

    if (!window.Razorpay) {
      if (hosted) {
        window.open(hosted, "_blank", "noopener,noreferrer");
        return;
      }
      toast({ variant: "destructive", title: "Checkout unavailable", description: "Razorpay script did not load." });
      return;
    }

    const checkoutOpts: Record<string, unknown> = {
      key: ch.keyId,
      subscription_id: ch.subscriptionId,
      name: PLATFORM_NAME,
      description: opts.planDescription,
      prefill: {
        name: opts.prefilledName || undefined,
        email: opts.prefilledEmail || undefined,
      },
      ...(ch.customerId ? { customer_id: ch.customerId } : {}),
      subscription_card_change: true,
      theme: { color: RAZORPAY_THEME },
      handler: async (resp: Record<string, unknown>) => {
        const payId = String(resp.razorpay_payment_id ?? "");
        const subId = String(resp.razorpay_subscription_id ?? "");
        const sig = String(resp.razorpay_signature ?? "");
        if (payId && subId && sig) {
          try {
            await postBillingAction({
              action: "verify-payment",
              razorpay_payment_id: payId,
              razorpay_subscription_id: subId,
              razorpay_signature: sig,
            });
            toast({ title: "Payment verified", description: "Your subscription is being activated." });
          } catch (err) {
            toast({
              variant: "destructive",
              title: "Could not verify payment",
              description:
                (err as Error).message || "Webhooks will catch up shortly — refresh in a moment.",
            });
          }
        } else {
          toast({ title: "Payment recorded", description: "Refreshing billing status…" });
        }
        refreshBilling();
        setPendingTier(null);
      },
      modal: {
        ondismiss: () => {
          setPendingTier(null);
          void recordDismissAndRefresh();
        },
      },
    };

    try {
      const rzp = new window.Razorpay!(checkoutOpts);
      rzp.on?.("payment.failed", (payload: unknown) => {
        const errPayload =
          payload && typeof payload === "object" ? (payload as { error?: { description?: string } }) : {};
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: errPayload.error?.description ?? "Try again.",
        });
        void recordDismissAndRefresh();
        setPendingTier(null);
      });
      rzp.open();
    } catch {
      toast({ variant: "destructive", title: "Checkout error", description: "Reload and try again." });
      setPendingTier(null);
    }
  };

  // Render guards ---------------------------------------------------------

  const showInitialSkeleton = !billingQ.data && billingQ.isFetching;
  const orgDisplayName =
    billingQ.data?.organization.name ??
    orgCtx?.organization?.name ??
    orgCtx?.organization?.slug ??
    "Workspace";

  if (showInitialSkeleton) {
    return (
      <BillingSkeleton
        orgName={orgDisplayName}
        prepend={
          subscriptionGateBanner ? (
            <SubscriptionGateRecapBanner
              banner={subscriptionGateBanner}
              onDismiss={dismissSubscriptionGateBanner}
            />
          ) : null
        }
      />
    );
  }
  if (billingQ.isError || !billingQ.data) {
    const err = billingQ.error;
    const apiErr = err instanceof BillingApiError ? err : null;
    return (
      <div className="min-h-screen app-ambient text-white p-6 flex items-center justify-center">
        <div className="glass-card max-w-xl w-full p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full grid place-items-center bg-rose-500/15 border border-rose-500/40 mb-4">
            <XCircle className="h-6 w-6 text-rose-300" />
          </div>
          <h1 className="text-xl font-bold">Billing unavailable</h1>
          <p className="text-sm text-white/70 mt-2">{err?.message ?? "Unknown error."}</p>
          <details className="mt-6 text-left text-xs text-white/60 bg-black/40 rounded-xl p-3 border border-white/10">
            <summary className="cursor-pointer text-white/80 font-semibold">Developer details</summary>
            <div className="mt-2 space-y-1 font-mono break-all">
              <div><span className="text-white/40">URL:</span> {apiErr?.url ?? "/api/tenant/billing"}</div>
              <div><span className="text-white/40">HTTP status:</span> {apiErr?.status ?? "—"}</div>
              <div><span className="text-white/40">Body:</span> {apiErr?.bodySnippet ?? "(none)"}</div>
              <div><span className="text-white/40">Path:</span> {location.pathname}</div>
            </div>
          </details>
          <Button
            className="btn-gradient text-white mt-6"
            onClick={() => refreshBilling()}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  const data = billingQ.data;
  const { subscription, currentPlan, plans, invoices, organization, canEdit, razorpay } = data;
  const internal = organization.is_internal;
  const isSandbox = !!organization.is_sandbox;

  const razorpayStatus = (subscription?.razorpay_status ?? null) as RazorpayStatus | null;
  const statusUi = razorpayStatus ? STATUS_META[razorpayStatus] : null;
  const isTerminal = razorpayStatus ? TERMINAL_STATUSES.includes(razorpayStatus) : false;
  const isReusable = razorpayStatus ? REUSABLE_STATUSES.includes(razorpayStatus) : false;
  const isPaused = razorpayStatus === "paused";
  const isActive = razorpayStatus === "active";

  const visiblePlans = plans.filter((p) => p.is_public && p.is_active && (isSandbox ? ["starter", "growth", "pro"].includes(p.code) : true));

  const billingGraceMinutes =
    typeof data.billingAccessGraceMinutes === "number" &&
    Number.isFinite(data.billingAccessGraceMinutes)
      ? Math.max(1, Math.floor(data.billingAccessGraceMinutes))
      : 60;

  const mandateGraceMs = billingGraceMinutes * 60_000;
  const mandateDeadlineEnds: number[] = [];
  if (
    razorpayStatus === "created" &&
    typeof subscription?.created_at === "string" &&
    subscription.created_at.trim().length > 0
  ) {
    const t = new Date(subscription.created_at).getTime();
    if (Number.isFinite(t)) mandateDeadlineEnds.push(t + mandateGraceMs);
  }
  if (
    razorpayStatus === "created" &&
    typeof subscription?.checkout_abandoned_at === "string" &&
    subscription.checkout_abandoned_at.trim().length > 0
  ) {
    const t = new Date(subscription.checkout_abandoned_at).getTime();
    if (Number.isFinite(t)) mandateDeadlineEnds.push(t + mandateGraceMs);
  }
  const mandateGraceDeadline =
    mandateDeadlineEnds.length > 0 ? Math.max(...mandateDeadlineEnds) : null;
  const mandateGraceRemainingMs =
    mandateGraceDeadline != null ? Math.max(0, mandateGraceDeadline - billingNow) : null;

  const retryTier: PlanTier =
    subscription?.plan_tier === "starter" ||
    subscription?.plan_tier === "growth" ||
    subscription?.plan_tier === "pro" ||
    subscription?.plan_tier === "test"
      ? subscription.plan_tier
      : (visiblePlans[0]?.code as PlanTier | undefined) ?? "starter";

  const handlePlanClick = (planCode: PlanTier) => {
    setPendingTier(planCode);
    if (isSandbox) {
      sandboxSwitchM.mutate({ planCode });
      return;
    }
    if (!subscription?.razorpay_subscription_id || isTerminal) {
      createM.mutate({
        planTier: planCode,
        billingCycle: cycle,
        renew: !!subscription?.razorpay_subscription_id,
      });
      return;
    }
    const samePlan = subscription.plan_tier === planCode;
    const sameCycle = (subscription.billing_cycle ?? subscription.interval) === cycle;
    if (samePlan && sameCycle && isReusable) {
      createM.mutate({ planTier: planCode, billingCycle: cycle });
      return;
    }
    upgradeM.mutate({ planTier: planCode, billingCycle: cycle });
  };

  // Render ----------------------------------------------------------------

  const showSubscriptionSidebar =
    !internal && !!subscription?.razorpay_subscription_id;

  return (
    <div className="min-h-screen app-ambient text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 space-y-8">
        {subscriptionGateBanner ? (
          <SubscriptionGateRecapBanner
            banner={subscriptionGateBanner}
            onDismiss={dismissSubscriptionGateBanner}
          />
        ) : null}
        {isSandbox ? (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div className="flex items-start gap-2 text-amber-100">
              <FlaskConical className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Demo workspace</p>
                <p className="text-xs text-amber-200/80">
                  Switch plans below to preview tier restrictions live — no payment required.
                  {data.sandboxExpiresAt ? ` Access expires ${new Date(data.sandboxExpiresAt).toLocaleString()}.` : null}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-9"
          style={{
            background:
              'radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--brand-primary-hex) 28%, transparent) 0%, transparent 60%), radial-gradient(80% 60% at 100% 100%, color-mix(in oklab, var(--brand-accent-hex) 22%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(10,6,22,0.7) 0%, rgba(7,3,15,0.85) 100%)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              mixBlendMode: 'overlay',
            }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded-xl grid place-items-center shadow-[0_8px_24px_-10px_var(--brand-primary-hex)]"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))',
                  }}
                >
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/55">
                  Subscription
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Your{" "}
                <span className="gradient-text-brand">{organization.name}</span>{" "}
                plan
              </h1>
              <p className="text-sm sm:text-base text-white/65 max-w-xl">
                {internal
                  ? "This workspace is invoiced internally — no Razorpay charges happen here."
                  : isSandbox
                    ? "Demo workspace — switch Starter, Growth, or Pro to preview tier restrictions live."
                    : "Pick the plan that matches your venue. Pro unlocks multi-branch, HR, and advanced analytics — most scaling lounges choose it."}
              </p>
              {!internal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPlanQuizOpen(true)}
                  className="mt-1 border-white/20 bg-white/[0.04] text-white/90 hover:bg-white/[0.08] gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Help me choose a plan
                </Button>
              )}
            </div>

              <div className="flex flex-col items-start lg:items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {statusUi && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${statusUi.badge}`}
                  >
                    <statusUi.icon className="h-3.5 w-3.5" />
                    {statusUi.label}
                  </span>
                )}
                {subscription?.access_suspended && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/45 text-rose-100">
                    <Lock className="h-3 w-3" /> Access suspended
                  </span>
                )}
              </div>
              {!internal && !isSandbox && (
                <RazorpayTrustBadge mode={razorpay.mode} size="lg" />
              )}
            </div>
          </div>
        </section>

        {/* Permissions notice */}
        {!canEdit && !internal && (
          <div className="glass-card flex items-start gap-3 px-4 py-3 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-sky-300" />
            <div>
              <div className="font-semibold text-white">Read-only access</div>
              <div className="text-white/60 text-xs mt-0.5">
                Only owners and admins can manage billing. Ask a workspace owner to make changes.
              </div>
            </div>
          </div>
        )}

        {/* CURRENT SUB + PLAN PICKER */}
        <div className="space-y-8">
          <div
            className={cn(
              "grid gap-6 lg:gap-8",
              showSubscriptionSidebar && "xl:grid-cols-12",
            )}
          >
          {/* Current subscription */}
          <section
            className={cn(
              "glass-card p-6 space-y-5",
              showSubscriptionSidebar && "xl:col-span-4 2xl:col-span-3",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/45 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Current subscription
                </div>
                <div className="mt-0.5 text-xs text-white/50 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>State mirrored from Razorpay webhooks.</span>
                  {!internal && !isSandbox && (
                    <>
                      <span className="text-white/25">·</span>
                      <RazorpayPoweredBy />
                    </>
                  )}
                </div>
              </div>
              {subscription?.razorpay_subscription_id && (
                <a
                  href={`https://dashboard.razorpay.com/app/subscriptions/${subscription.razorpay_subscription_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-white/80 transition"
                  title="Open in Razorpay dashboard"
                >
                  Razorpay <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {internal ? (
              <div className="theme-inset p-4 text-sm text-white/65">
                Internal tenancy — billing is settled offline.
              </div>
            ) : !subscription || !subscription.razorpay_subscription_id ? (
              <div className="theme-inset p-5 text-sm text-white/70">
                <div className="flex items-center gap-2 text-white font-semibold mb-1">
                  <Zap className="h-4 w-4 text-amber-300" />
                  No active subscription
                </div>
                <p className="text-xs text-white/60">
                  Choose a plan below to activate POS, bookings, and AI features.
                </p>
              </div>
            ) : (
              <>
                {statusUi && (
                  <p className="text-xs text-white/55 -mt-2">{statusUi.description}</p>
                )}

                {mandateGraceDeadline != null &&
                  mandateGraceRemainingMs != null &&
                  razorpayStatus === "created" && (
                    <div
                      className={
                        mandateGraceRemainingMs <= 0
                          ? "rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100"
                          : "rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100"
                      }
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-2">
                          <Timer className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-semibold text-white">Pay within the grace window</div>
                            {mandateGraceRemainingMs <= 0 ? (
                              <p className="mt-0 text-[11px] text-white/80 leading-relaxed">
                                Time is up — complete payment on your existing Razorpay subscription below. We reuse
                                the same order (no duplicate plans) unless you switch tier or billing cycle.
                              </p>
                            ) : (
                              <p className="mt-0 text-[11px] text-white/80 leading-relaxed">
                                Complete the Razorpay mandate from{" "}
                                <strong className="text-white font-semibold">Retry payment</strong>. You still have{" "}
                                <span className="font-mono font-semibold text-white">
                                  {formatGraceCountdown(mandateGraceRemainingMs)}
                                </span>{" "}
                                under fleet grace (
                                <span className="font-semibold text-white">{billingGraceMinutes}</span>
                                minute{billingGraceMinutes === 1 ? "" : "s"} configured in Platform Overview).
                              </p>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                            <Button
                              type="button"
                              size="sm"
                              className="btn-gradient text-white gap-1.5 w-full sm:flex-1 sm:min-w-[12rem]"
                              disabled={
                                pauseM.isPending ||
                                resumeM.isPending ||
                                (createM.isPending && pendingTier === retryTier)
                              }
                              onClick={() => handlePlanClick(retryTier)}
                            >
                              {createM.isPending && pendingTier === retryTier ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCw className="h-3.5 w-3.5" />
                              )}
                              Retry payment
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                            {subscription.short_url ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full sm:flex-1 sm:min-w-[12rem] border-white/25 bg-transparent text-white/90 hover:bg-white/[0.08]"
                                asChild
                              >
                                <a href={subscription.short_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  Hosted checkout
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {razorpayStatus === "created" &&
                  canEdit &&
                  subscription?.razorpay_subscription_id &&
                  mandateGraceDeadline == null && (
                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 space-y-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-semibold text-white">Awaiting mandate — finish this subscription</div>
                          <p className="mt-0 text-[11px] text-white/80 leading-relaxed">
                            Razorpay still shows this plan as unpaid. Retry opens checkout for your current
                            subscription id (existing order · no duplicate row).
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          className="btn-gradient text-white gap-1.5 w-full sm:flex-1 sm:min-w-[12rem]"
                          disabled={
                            pauseM.isPending ||
                            resumeM.isPending ||
                            (createM.isPending && pendingTier === retryTier)
                          }
                          onClick={() => handlePlanClick(retryTier)}
                        >
                          {createM.isPending && pendingTier === retryTier ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                          Retry payment
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        {subscription.short_url ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full sm:flex-1 sm:min-w-[12rem] border-white/25 bg-transparent text-white/90 hover:bg-white/[0.08]"
                            asChild
                          >
                            <a href={subscription.short_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              Hosted checkout
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}

                <div className="theme-inset p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Plan</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className="text-2xl font-extrabold">
                      {currentPlan?.name ?? tierLabel(subscription.plan_tier ?? "—")}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
                      {(subscription.billing_cycle ?? subscription.interval) === "year"
                        ? "Yearly"
                        : "Monthly"}
                    </div>
                  </div>
                  <div className="text-xs text-white/55 mt-1">
                    {(subscription.billing_cycle ?? subscription.interval) === "year"
                      ? "Billed annually · 1 cycle"
                      : "Billed monthly · auto-renew up to 12 cycles"}
                  </div>
                </div>

                {subscription.scheduled_change && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 space-y-2">
                    <div className="flex items-start gap-2">
                      <CalendarClock className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        Plan switches to{" "}
                        <strong className="font-semibold capitalize">
                          {subscription.scheduled_change.plan_tier}{" "}
                          ({subscription.scheduled_change.billing_cycle === "year" ? "Yearly" : "Monthly"})
                        </strong>{" "}
                        at next renewal.
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelScheduledM.isPending}
                        onClick={() => cancelScheduledM.mutate()}
                        className="border-amber-500/45 bg-transparent text-amber-100 hover:bg-amber-500/15"
                      >
                        {cancelScheduledM.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Cancel scheduled change
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label="Next charge" value={formatDate(subscription.charge_at)} icon={Clock} />
                  <Stat
                    label="Cycles paid"
                    value={
                      subscription.total_count != null
                        ? `${subscription.paid_count ?? 0} / ${subscription.total_count}`
                        : `${subscription.paid_count ?? 0}`
                    }
                    icon={CheckCircle2}
                  />
                </div>

                {subscription.cancel_at_period_end && subscription.current_period_end && (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                    Cancellation scheduled. Access continues until{" "}
                    <strong>{formatDate(subscription.current_period_end)}</strong>.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {isReusable && !isTerminal && canEdit && !subscription.cancel_at_period_end && (
                    <>
                      {!isPaused && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pauseM.isPending}
                          onClick={() => pauseM.mutate()}
                          className="border-amber-500/40 bg-transparent text-amber-100 hover:bg-amber-500/10"
                        >
                          {pauseM.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Pause className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Pause
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                        onClick={() => setCancelOpen(true)}
                      >
                        Cancel at period end
                      </Button>
                    </>
                  )}
                  {isPaused && canEdit && (
                    <Button
                      size="sm"
                      disabled={resumeM.isPending}
                      onClick={() => resumeM.mutate()}
                      className="btn-gradient text-white"
                    >
                      {resumeM.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Resume
                    </Button>
                  )}
                  {subscription.cancel_at_period_end && !isTerminal && canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resumeM.isPending}
                      onClick={() => resumeM.mutate()}
                      className="border-emerald-500/40 bg-transparent text-emerald-200 hover:bg-emerald-500/10"
                    >
                      {resumeM.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      Keep subscription
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Plan picker */}
          <section
            className={cn(
              "glass-card p-6 space-y-5 min-w-0",
              showSubscriptionSidebar && "xl:col-span-8 2xl:col-span-9",
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/45 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  {isTerminal || !subscription?.razorpay_subscription_id ? "Choose a plan" : "Switch plan"}
                </div>
                <div className="mt-0.5 text-xs text-white/55">
                  {isTerminal
                    ? "Renew to continue using the platform."
                    : isActive
                      ? "Plan changes apply at your next renewal."
                      : "Pick the plan that fits your venue."}
                </div>
              </div>
              {!internal && (
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPlanQuizOpen(true)}
                    className="border-white/15 bg-white/[0.03] hover:bg-white/[0.07] text-white gap-1.5"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Plan quiz
                  </Button>
                  {!isSandbox && (
                  <div className="flex rounded-full border border-white/10 bg-black/40 backdrop-blur p-0.5 w-fit">
                  <button
                    type="button"
                    onClick={() => setCycle("month")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      cycle === "month"
                        ? "bg-white text-zinc-950 shadow-[0_4px_14px_-4px_rgba(255,255,255,0.4)]"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("year")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      cycle === "year"
                        ? "bg-white text-zinc-950 shadow-[0_4px_14px_-4px_rgba(255,255,255,0.4)]"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    Yearly{" "}
                    <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[9px] uppercase tracking-wider font-bold">
                      Save 20%
                    </span>
                  </button>
                </div>
                  )}
                </div>
              )}
            </div>

            {!internal && !isSandbox && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <RazorpayPoweredBy className="text-white/55" />
                <span className="text-[11px] text-white/45">
                  Checkout opens on Razorpay&apos;s hosted page — UPI, cards &amp; netbanking
                </span>
              </div>
            )}

            {internal ? (
              <p className="text-white/55 text-sm py-10 text-center">
                Internal tenancy — no self-serve billing here.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
                {visiblePlans
                  .filter((p) => p.code === "starter" || p.code === "growth" || p.code === "pro")
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((plan) => {
                  const planTier = plan.code as PlanTier;
                  const marketing =
                    plan.code === "starter" || plan.code === "growth" || plan.code === "pro"
                      ? PLAN_MARKETING[plan.code]
                      : null;
                  const price = cycle === "year" ? plan.price_inr_year : plan.price_inr_month;
                  const rzpId =
                    cycle === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
                  const mapped = !!rzpId;
                  const isCurrent = isSandbox
                    ? subscription?.plan_tier === planTier
                    : subscription?.plan_tier === planTier &&
                      (subscription?.billing_cycle ?? subscription?.interval) === cycle &&
                      isReusable;
                  const isPending =
                    (createM.isPending || upgradeM.isPending || sandboxSwitchM.isPending) &&
                    pendingTier === planTier;
                  const isFeatured = marketing?.highlight === true;
                  const savings = yearlySavingsPercent(plan.price_inr_month, plan.price_inr_year);
                  const discountedMonthly =
                    cycle === "year" &&
                    plan.price_inr_month != null &&
                    plan.price_inr_month > 0 &&
                    savings != null
                      ? Math.max(0, Math.round(plan.price_inr_month * (1 - savings / 100)))
                      : cycle === "year" && price != null && price > 0
                        ? Math.round(price / 12)
                        : null;

                  const defaultButtonLabel = isSandbox
                    ? isCurrent
                      ? "Current demo plan"
                      : "Switch demo plan"
                    : !subscription?.razorpay_subscription_id || isTerminal
                      ? subscription?.razorpay_subscription_id
                        ? "Renew"
                        : "Subscribe"
                      : isCurrent
                        ? "Current plan"
                        : "Switch plan";

                  const buttonLabel =
                    !isCurrent && marketing?.ctaLabel && (defaultButtonLabel === "Subscribe" || defaultButtonLabel === "Switch plan")
                      ? marketing.ctaLabel
                      : defaultButtonLabel;

                  const ButtonIcon =
                    buttonLabel === "Renew"
                      ? RotateCw
                      : buttonLabel.includes("Switch") || buttonLabel.includes("Go Pro")
                        ? ArrowRight
                        : isCurrent
                          ? Check
                          : ArrowRight;

                  const PlanIcon =
                    plan.code === "test"
                      ? FlaskConical
                      : plan.code === "starter"
                        ? Zap
                        : plan.code === "growth"
                          ? TrendingUp
                          : Crown;

                  return (
                    <div
                      key={plan.id}
                      id={`billing-plan-${planTier}`}
                      className={cn(
                        "relative rounded-2xl border p-5 sm:p-6 flex flex-col transition-all duration-300 scroll-mt-24",
                        highlightedPlan === planTier &&
                          "ring-2 ring-[color:var(--brand-accent-hex)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-accent-hex)_25%,transparent)]",
                        isFeatured && "z-10 shadow-[0_28px_80px_-32px_color-mix(in_oklab,var(--brand-accent-hex)_55%,transparent)] ring-1 ring-[color:var(--brand-accent-hex)]/30",
                        isCurrent
                          ? "ring-1"
                          : isFeatured
                            ? "border-[color:var(--brand-accent-hex)]/50 hover:border-[color:var(--brand-accent-hex)]/70"
                            : "border-white/10 hover:border-white/25 hover:-translate-y-0.5",
                      )}
                      style={
                        isCurrent
                          ? {
                              background:
                                "linear-gradient(160deg, color-mix(in oklab, var(--brand-primary-hex) 22%, rgba(255,255,255,0.04)) 0%, color-mix(in oklab, var(--brand-primary-hex) 8%, rgba(255,255,255,0.015)) 60%, rgba(5,3,14,0.85) 100%)",
                              boxShadow:
                                "0 22px 60px -28px color-mix(in oklab, var(--brand-primary-hex) 60%, rgba(0,0,0,0.6)), inset 0 1px 0 rgba(255,255,255,0.08)",
                              borderColor: "color-mix(in oklab, var(--brand-primary-hex) 55%, transparent)",
                            }
                          : isFeatured
                            ? {
                                background:
                                  "linear-gradient(165deg, color-mix(in oklab, var(--brand-accent-hex) 18%, rgba(255,255,255,0.05)) 0%, color-mix(in oklab, var(--brand-primary-hex) 10%, rgba(6,4,14,0.75)) 45%, rgba(4,2,12,0.92) 100%)",
                              }
                            : {
                                background:
                                  "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(6,4,14,0.55) 100%)",
                              }
                      }
                    >
                      {marketing?.badge && !isCurrent && (
                        <div
                          className={cn(
                            "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-lg whitespace-nowrap",
                            isFeatured ? "text-zinc-950" : "text-white",
                          )}
                          style={
                            isFeatured
                              ? {
                                  background:
                                    "linear-gradient(90deg, var(--brand-accent-hex), color-mix(in oklab, var(--brand-primary-hex) 70%, white))",
                                }
                              : {
                                  background:
                                    "linear-gradient(90deg, var(--brand-primary-hex), var(--brand-accent-hex))",
                                }
                          }
                        >
                          {marketing.badge}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 shadow">
                          Current plan
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                              isFeatured && "shadow-[0_8px_24px_-8px_var(--brand-accent-hex)]",
                            )}
                            style={{
                              background: isFeatured
                                ? "linear-gradient(135deg, var(--brand-accent-hex), var(--brand-primary-hex))"
                                : "linear-gradient(135deg, color-mix(in oklab, var(--brand-primary-hex) 30%, transparent), color-mix(in oklab, var(--brand-accent-hex) 20%, transparent))",
                              border: "1px solid color-mix(in oklab, var(--brand-primary-hex) 35%, transparent)",
                            }}
                          >
                            <PlanIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-lg text-white leading-tight">{plan.name}</div>
                            {marketing?.tagline && (
                              <p className="text-[11px] text-white/55 mt-0.5 leading-snug">
                                {marketing.tagline}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            {formatINR(price)}
                          </span>
                          <span className="text-xs text-white/55 font-medium">
                            /{cycle === "month" ? "mo" : "yr"}
                          </span>
                        </div>
                        {cycle === "year" && discountedMonthly != null && (
                          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            {plan.price_inr_month != null && savings != null && (
                              <span className="text-sm text-white/35 line-through">
                                {formatINR(plan.price_inr_month)}/mo
                              </span>
                            )}
                            <span className="text-lg font-bold text-emerald-300">
                              {formatINR(discountedMonthly)}
                              <span className="text-xs font-semibold text-emerald-300/80">/mo</span>
                            </span>
                            {savings != null && (
                              <span className="text-xs text-white/55">after {savings}% off</span>
                            )}
                          </div>
                        )}
                        {cycle === "month" && plan.price_inr_year != null && plan.price_inr_year > 0 && (
                          <p className="text-xs text-white/45 mt-1.5">
                            {formatINR(plan.price_inr_year)}/yr on yearly billing
                            {savings != null && (
                              <span className="text-emerald-300/90 font-medium"> · save {savings}%</span>
                            )}
                          </p>
                        )}
                        <div className="text-[11px] text-white/45 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          <span>GST as applicable</span>
                          {savings != null && cycle === "year" && (
                            <span className="text-emerald-300/90 font-semibold">Save {savings}% vs monthly</span>
                          )}
                        </div>
                      </div>

                      {marketing && (
                        <ul className="mt-5 space-y-2 flex-1">
                          {marketing.features.map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-[11px] sm:text-xs text-white/80 leading-snug">
                              <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                              <span>{feat}</span>
                            </li>
                          ))}
                          {marketing.missing?.map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-[11px] text-white/35 leading-snug">
                              <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {!mapped && (
                        <Badge className="mt-3 w-fit bg-rose-900/60 text-[10px] border border-rose-700/60">
                          Map plan in platform admin
                        </Badge>
                      )}

                      <Button
                        className={cn(
                          "w-full mt-5 font-semibold h-11",
                          isCurrent
                            ? "bg-white/10 hover:bg-white/15 text-white"
                            : isFeatured
                              ? "btn-gradient text-white shadow-[0_12px_32px_-12px_var(--brand-accent-hex)]"
                              : "btn-gradient text-white",
                        )}
                        disabled={!canEdit || isPending || !mapped || isCurrent}
                        onClick={() => handlePlanClick(planTier)}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <ButtonIcon className="h-4 w-4 mr-1.5" />
                        )}
                        {buttonLabel}
                      </Button>
                      {isFeatured && !isCurrent && (
                        <p className="mt-2 text-[10px] text-center text-white/50">
                          Most venues outgrow Growth — Pro unlocks HR & multi-branch
                        </p>
                      )}
                      {isCurrent && (
                        <div className="mt-2 text-[10px] text-center text-emerald-300 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active for renewals
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </div>

          {!internal && !isSandbox && visiblePlans.some((p) => ["starter", "growth", "pro"].includes(p.code)) && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComparePlansOpen(true)}
                className="border-white/15 bg-white/[0.03] hover:bg-white/[0.07] text-white/85 gap-1.5"
              >
                <ListChecks className="h-3.5 w-3.5" />
                Compare plans in detail
              </Button>
            </div>
          )}
        </div>

        {/* INVOICES */}
        {!isSandbox ? (
        <section className="glass-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/45 flex items-center gap-1.5">
                <Receipt className="h-3 w-3" /> Payment history
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                Charges and subscription status synced from Razorpay. Refresh after hosted checkout.
              </div>
            </div>
            {!internal && subscription?.razorpay_subscription_id && canEdit && (
              <Button
                variant="outline"
                size="sm"
                disabled={fetchInvoicesM.isPending}
                onClick={() => fetchInvoicesM.mutate()}
                className="border-white/15 bg-white/[0.03] hover:bg-white/[0.07] text-white"
              >
                {fetchInvoicesM.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Refresh from Razorpay
              </Button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="py-14 text-center text-sm text-white/55">
              <Receipt className="h-7 w-7 mx-auto mb-2 text-white/25" />
              No charges yet. Successful payments will appear here automatically.
            </div>
          ) : (
            <>
              {/* Desktop: dense table. */}
              <div className="hidden sm:block overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                      <th className="pb-3 pr-3 pl-1 font-semibold">Date</th>
                      <th className="pb-3 pr-3 font-semibold">Invoice</th>
                      <th className="pb-3 pr-3 font-semibold">Amount</th>
                      <th className="pb-3 pr-3 font-semibold">Status</th>
                      <th className="pb-3 pr-1 text-right font-semibold">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition"
                      >
                        <td className="py-3 pr-3 pl-1 text-white/85">
                          {formatDate(inv.paid_at || inv.created_at)}
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-white/65">
                          {inv.provider_invoice_id || inv.id}
                        </td>
                        <td className="py-3 pr-3 font-semibold text-white">{formatINR(inv.amount_inr)}</td>
                        <td className="py-3 pr-3 capitalize">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 pr-1 text-right">
                          {inv.short_url ? (
                            <a
                              href={inv.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition"
                            >
                              <Download className="h-3.5 w-3.5" /> PDF
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile: card-style stack so columns don't get squeezed. */}
              <div className="sm:hidden flex flex-col gap-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
                          {formatDate(inv.paid_at || inv.created_at)}
                        </div>
                        <div className="font-mono text-[11px] text-white/65 truncate mt-0.5">
                          {inv.provider_invoice_id || inv.id}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-white">{formatINR(inv.amount_inr)}</div>
                        <div className="mt-1">
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                      </div>
                    </div>
                    {inv.short_url ? (
                      <a
                        href={inv.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition"
                      >
                        <Download className="h-3.5 w-3.5" /> Receipt PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        ) : null}

        {/* TRUST STRIP */}
        {!isSandbox && !internal ? (
        <section
          className="rounded-2xl border border-[#3395FF]/20 px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, #3395FF 10%, rgba(255,255,255,0.03)) 0%, rgba(255,255,255,0.02) 50%, color-mix(in oklab, var(--brand-primary-hex) 8%, rgba(255,255,255,0.02)) 100%)",
            boxShadow: "0 12px 40px -20px rgba(51,149,255,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-start sm:items-center gap-4">
            <RazorpayTrustBadge mode={razorpay.mode} size="lg" />
            <div className="text-sm text-white/70 max-w-xl">
              <div className="font-semibold text-white/90">
                Recurring billing &amp; mandates handled by Razorpay
              </div>
              <div className="text-xs mt-1 text-white/55">
                PCI-DSS Level 1 · 256-bit TLS · cards tokenised by Razorpay (your card never touches our
                servers).
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
            <a
              href="https://razorpay.com/docs/payments/subscriptions/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#3395FF] transition inline-flex items-center gap-1 font-medium text-white/65"
            >
              Razorpay Subscriptions <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <span className="text-white/20">·</span>
            <a
              href="https://razorpay.com/docs/api/payments/subscriptions/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#3395FF] transition inline-flex items-center gap-1 font-medium text-white/65"
            >
              API docs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>
        ) : null}
      </div>

      {!internal && (
        <>
          <PlanRecommendationQuizDialog
            open={planQuizOpen}
            onOpenChange={setPlanQuizOpen}
            organizationName={organization.name}
            onSelectPlan={(tier) => focusRecommendedPlan(tier as PlanTier)}
          />
          <PlanFeatureComparisonDialog open={comparePlansOpen} onOpenChange={setComparePlansOpen} />
        </>
      )}

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent
          className="border-white/10 text-white"
          style={{
            background:
              'linear-gradient(165deg, color-mix(in oklab, var(--brand-primary-hex) 18%, rgba(255,255,255,0.045)) 0%, rgba(8,5,18,0.96) 100%)',
            backdropFilter: 'blur(20px) saturate(140%)',
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              Cancel subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/65">
              You&apos;ll keep access until{" "}
              <span className="text-white font-semibold">
                {formatDate(subscription?.current_period_end)}
              </span>
              . Charges stop after that. No refunds for time already prepaid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/5">
              Keep subscribing
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500 text-white border-0"
              disabled={cancelM.isPending}
              onClick={(e) => {
                e.preventDefault();
                cancelM.mutate();
              }}
            >
              {cancelM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small subcomponents
// ---------------------------------------------------------------------------

function PlanFeatureComparisonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-white/10 text-white sm:max-w-3xl p-0 gap-0 overflow-hidden"
        style={{
          background:
            "linear-gradient(165deg, color-mix(in oklab, var(--brand-primary-hex) 14%, rgba(255,255,255,0.04)) 0%, rgba(8,5,18,0.98) 100%)",
          backdropFilter: "blur(20px) saturate(140%)",
        }}
      >
        <DialogHeader className="px-5 sm:px-6 py-4 border-b border-white/10 text-left pr-12">
          <DialogTitle className="text-lg text-white">Compare plans</DialogTitle>
          <DialogDescription className="text-white/55 text-xs">
            Full feature breakdown — Pro is built for venues scaling beyond a single floor.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto max-h-[min(70vh,640px)] overflow-y-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left py-3 pl-5 pr-3 text-[10px] uppercase tracking-wider text-white/40 font-semibold w-[38%]">
                Feature
              </th>
              <th className="py-3 px-3 text-center text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                Starter
              </th>
              <th className="py-3 px-3 text-center text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                Growth
              </th>
              <th
                className="py-3 pr-5 pl-3 text-center text-[10px] uppercase tracking-wider font-bold"
                style={{ color: "var(--brand-accent-hex)" }}
              >
                Pro ★
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURE_MATRIX.map((row) => (
              <tr key={row.label} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="py-2.5 pl-5 pr-3 text-white/80 text-xs">{row.label}</td>
                {(["starter", "growth", "pro"] as const).map((tier) => {
                  const val = row[tier];
                  const isPro = tier === "pro";
                  return (
                    <td
                      key={tier}
                      className={cn(
                        "py-2.5 px-3 text-center text-xs",
                        isPro && "bg-[color:var(--brand-accent-hex)]/[0.06]",
                      )}
                    >
                      {typeof val === "boolean" ? (
                        val ? (
                          <Check className={cn("h-4 w-4 mx-auto", isPro ? "text-emerald-300" : "text-emerald-400/80")} />
                        ) : (
                          <X className="h-4 w-4 mx-auto text-white/20" />
                        )
                      ) : (
                        <span className={cn("font-medium", isPro ? "text-white" : "text-white/70")}>{val}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="theme-inset p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45 flex items-center gap-1.5 font-semibold">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  );
}

/** Pill for invoice status — paid / issued / partially_paid / cancelled / expired. */
function InvoiceStatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const meta: { label: string; cls: string } = (() => {
    if (s === "paid")
      return { label: "Paid", cls: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40" };
    if (s === "partially_paid")
      return { label: "Partial", cls: "bg-amber-500/15 text-amber-200 border-amber-500/40" };
    if (s === "issued" || s === "due" || s === "pending")
      return { label: status || "Pending", cls: "bg-sky-500/15 text-sky-200 border-sky-500/40" };
    if (s === "cancelled" || s === "expired" || s === "failed")
      return { label: status || "—", cls: "bg-rose-500/15 text-rose-200 border-rose-500/40" };
    return { label: status || "—", cls: "bg-white/5 text-white/65 border-white/15" };
  })();
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function subscriptionGateBannerReasonLabel(gateReason?: string): string {
  if (gateReason === "no-sub") return "No subscription yet";
  if (gateReason === "bad-status") return "Subscription needs attention";
  return gateReason ? gateReason.replace(/-/g, " ") : "";
}

function SubscriptionGateRecapBanner({
  banner,
  onDismiss,
}: {
  banner: NonNullable<SubscriptionGateBillingState["subscriptionGateBanner"]>;
  onDismiss: () => void;
}) {
  return (
    <div className="glass-card flex gap-4 p-4 border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.12] via-white/[0.03] to-transparent">
      <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-sky-300" />
      <div className="min-w-0 flex-1 space-y-2 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Why you landed here
            </div>
            {banner.gateReason ? (
              <div className="text-xs font-medium text-white/65 mt-0.5">
                {subscriptionGateBannerReasonLabel(banner.gateReason)}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.08] hover:text-white shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm font-semibold text-white">{banner.summary}</div>
        <p className="text-xs text-white/72 leading-relaxed">{banner.detail}</p>
        {banner.attemptedPath ? (
          <p className="text-[11px] text-white/45">
            Earlier route blocked:{" "}
            <span className="font-mono text-white/60 break-all">{banner.attemptedPath}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BillingSkeleton({ orgName, prepend }: { orgName?: string; prepend?: React.ReactNode }) {
  return (
    <div className="min-h-screen app-ambient text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 space-y-6">
        {prepend}
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-white/40">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading plans for{" "}
          <span className="normal-case text-white/70">{orgName ?? "your workspace"}</span>
          <span className="text-white/25">·</span>
          <PaymentProviderBrand provider="razorpay" size="sm" variant="logo" padded={false} />
        </div>
        <Skeleton className="h-44 w-full rounded-3xl bg-white/[0.04]" />
        <Skeleton className="h-96 w-full rounded-2xl bg-white/[0.04]" />
        <Skeleton className="h-56 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
