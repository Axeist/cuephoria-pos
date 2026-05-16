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
import { useLocation } from "react-router-dom";
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
  Hourglass,
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
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// ---------------------------------------------------------------------------
// Types mirroring /api/tenant/billing response shapes
// ---------------------------------------------------------------------------

type BillingCycle = "month" | "year";
type PlanTier = "starter" | "growth" | "pro";

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
    trial_ends_at: string | null;
  };
  subscription: Subscription | null;
  currentPlan: { id: string; code: string; name: string } | null;
  plans: Plan[];
  invoices: Invoice[];
  razorpay: { mode: "live" | "test"; keyId: string };
  billingContactEmail: string | null;
  billingPrefillName: string | null;
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
// Razorpay branding
// ---------------------------------------------------------------------------

/** Razorpay official wordmark. Inlined as SVG so it picks up brand colour. */
function RazorpayWordmark({ className = "h-4 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 105 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Razorpay"
    >
      <path
        d="M16.7 0 11.2 8.6 8.6 17.2 14.2 0H8.5L0 13.5h3.6L1.5 22l15.2-22Z"
        fill="#3395FF"
      />
      <path
        fill="currentColor"
        d="M27.7 17.4h-3.1l-2.2-4.6h-1.6v4.6h-2.5V5.7h4.4c2.7 0 4.3 1.4 4.3 3.6 0 1.7-.9 2.9-2.5 3.4l2.7 4.7h.5Zm-4.9-9.5h-2v3h2c1.2 0 1.9-.5 1.9-1.5s-.7-1.5-1.9-1.5Zm7 9.5V5.7h7.7v2.1h-5.2v2.6h4.5V12h-4.5v3.3h5.4v2.1h-7.9Zm12.8 0V5.7h5c2.4 0 3.7 1.1 3.7 3 0 1.2-.6 2.1-1.6 2.6 1.4.4 2.2 1.4 2.2 2.8 0 2.1-1.5 3.3-4.1 3.3h-5.2Zm2.5-7v2.4h2.2c1 0 1.6-.4 1.6-1.2s-.6-1.2-1.6-1.2h-2.2Zm0 4.4v2.5h2.4c1.1 0 1.7-.5 1.7-1.3s-.6-1.2-1.7-1.2h-2.4Zm10 2.6V5.7h2.5v11.7h-2.5Zm5.9 0V5.7h2.5l4.6 7.3V5.7H66v11.7h-2.4l-4.7-7.4v7.4h-2.5Zm12.9 0V5.7h2.5l4.6 7.3V5.7h2.4v11.7h-2.4l-4.7-7.4v7.4H73Z"
      />
    </svg>
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
  const location = useLocation();
  const orgCtx = useOrganizationOptional();
  const [cycle, setCycle] = React.useState<BillingCycle>("month");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [pendingTier, setPendingTier] = React.useState<PlanTier | null>(null);

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
    // Defensive: refetch every mount because the global queryClient has
    // refetchOnMount=false and any stale failure from an earlier session
    // would otherwise keep the page in error state with no retry.
    refetchOnMount: "always",
    retry: 1,
    retryDelay: 1500,
    staleTime: 15_000,
  });

  React.useEffect(() => {
    console.log(
      `[Billing] query state — status=${billingQ.status} fetchStatus=${billingQ.fetchStatus} ` +
        `isLoading=${billingQ.isLoading} isError=${billingQ.isError} hasData=${!!billingQ.data}`,
    );
  }, [billingQ.status, billingQ.fetchStatus, billingQ.isLoading, billingQ.isError, billingQ.data]);

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
    mutationFn: async () => postBillingAction<{ ok: true; invoices: Invoice[] }>({ action: "fetch-invoices" }),
    onSuccess: (data) => {
      qc.setQueryData<BillingResponse | undefined>(["tenant-billing"], (prev) =>
        prev ? { ...prev, invoices: data.invoices } : prev,
      );
      toast({ title: "Invoices refreshed from Razorpay" });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Could not refresh invoices", description: err.message }),
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
          refreshBilling();
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
        setPendingTier(null);
      });
      rzp.open();
    } catch {
      toast({ variant: "destructive", title: "Checkout error", description: "Reload and try again." });
      setPendingTier(null);
    }
  };

  // Render guards ---------------------------------------------------------

  if (billingQ.isLoading) return <BillingSkeleton path={location.pathname} />;
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

  const razorpayStatus = (subscription?.razorpay_status ?? null) as RazorpayStatus | null;
  const statusUi = razorpayStatus ? STATUS_META[razorpayStatus] : null;
  const isTerminal = razorpayStatus ? TERMINAL_STATUSES.includes(razorpayStatus) : false;
  const isReusable = razorpayStatus ? REUSABLE_STATUSES.includes(razorpayStatus) : false;
  const isPaused = razorpayStatus === "paused";
  const isActive = razorpayStatus === "active";

  const visiblePlans = plans.filter((p) => p.is_public && p.is_active);

  const handlePlanClick = (planCode: PlanTier) => {
    setPendingTier(planCode);
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

  return (
    <div className="min-h-screen app-ambient text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
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
                  : "Manage your Cuephoria POS plan, payment cycle, and invoices. Secure recurring mandates are powered by Razorpay; your card stays on file across cycles."}
              </p>
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-[11px] text-white/70">Secured by</span>
                <RazorpayWordmark className="h-3.5 w-auto text-white" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-white/45">
                  {razorpay.mode}
                </span>
              </div>
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
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Current subscription */}
          <section className="glass-card lg:col-span-2 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/45 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Current subscription
                </div>
                <div className="mt-0.5 text-xs text-white/50">State mirrored from Razorpay webhooks.</div>
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
                  Choose a plan on the right to activate POS, bookings, and AI features.
                </p>
              </div>
            ) : (
              <>
                {statusUi && (
                  <p className="text-xs text-white/55 -mt-2">{statusUi.description}</p>
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
          <section className="glass-card lg:col-span-3 p-6 space-y-5">
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

            {internal ? (
              <p className="text-white/55 text-sm py-10 text-center">
                Internal tenancy — no self-serve billing here.
              </p>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                {visiblePlans.map((plan) => {
                  const planTier = plan.code as PlanTier;
                  const price = cycle === "year" ? plan.price_inr_year : plan.price_inr_month;
                  const rzpId =
                    cycle === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
                  const mapped = !!rzpId;
                  const isCurrent =
                    subscription?.plan_tier === planTier &&
                    (subscription?.billing_cycle ?? subscription?.interval) === cycle &&
                    isReusable;
                  const isPending =
                    (createM.isPending || upgradeM.isPending) && pendingTier === planTier;
                  const isMostPopular = plan.code === "growth";

                  const buttonLabel =
                    !subscription?.razorpay_subscription_id || isTerminal
                      ? subscription?.razorpay_subscription_id
                        ? "Renew"
                        : "Subscribe"
                      : isCurrent
                        ? "Current plan"
                        : "Switch plan";

                  const ButtonIcon =
                    buttonLabel === "Renew"
                      ? RotateCw
                      : buttonLabel === "Switch plan"
                        ? ArrowRight
                        : isCurrent
                          ? Check
                          : ArrowRight;

                  const PlanIcon =
                    plan.code === "starter"
                      ? Zap
                      : plan.code === "growth"
                        ? TrendingUp
                        : Crown;

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl border p-5 flex flex-col transition-all duration-200 ${
                        isCurrent
                          ? "border-transparent ring-1"
                          : isMostPopular
                            ? "border-white/15 hover:border-white/30 hover:-translate-y-0.5"
                            : "border-white/10 hover:border-white/20 hover:-translate-y-0.5"
                      }`}
                      style={
                        isCurrent
                          ? {
                              background:
                                'linear-gradient(160deg, color-mix(in oklab, var(--brand-primary-hex) 22%, rgba(255,255,255,0.04)) 0%, color-mix(in oklab, var(--brand-primary-hex) 8%, rgba(255,255,255,0.015)) 60%, rgba(5,3,14,0.85) 100%)',
                              boxShadow:
                                '0 22px 60px -28px color-mix(in oklab, var(--brand-primary-hex) 60%, rgba(0,0,0,0.6)), inset 0 1px 0 rgba(255,255,255,0.08)',
                              borderColor:
                                'color-mix(in oklab, var(--brand-primary-hex) 55%, transparent)',
                            }
                          : isMostPopular
                            ? {
                                background:
                                  'linear-gradient(170deg, color-mix(in oklab, var(--brand-accent-hex) 12%, rgba(255,255,255,0.03)) 0%, rgba(6,4,14,0.72) 100%)',
                              }
                            : {
                                background:
                                  'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(6,4,14,0.55) 100%)',
                              }
                      }
                    >
                      {isMostPopular && !isCurrent && (
                        <div
                          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow"
                          style={{
                            background:
                              'linear-gradient(90deg, var(--brand-primary-hex), var(--brand-accent-hex))',
                            color: '#fff',
                          }}
                        >
                          Most popular
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 shadow">
                          Current
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-lg grid place-items-center"
                          style={{
                            background:
                              'linear-gradient(135deg, color-mix(in oklab, var(--brand-primary-hex) 30%, transparent), color-mix(in oklab, var(--brand-accent-hex) 20%, transparent))',
                            border:
                              '1px solid color-mix(in oklab, var(--brand-primary-hex) 35%, transparent)',
                          }}
                        >
                          <PlanIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-[0.16em] text-white/55">
                            {plan.code}
                          </div>
                          <div className="font-bold text-base text-white">{plan.name}</div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tracking-tight">
                            {formatINR(price)}
                          </span>
                          <span className="text-xs text-white/55 font-medium">
                            /{cycle === "month" ? "mo" : "yr"}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/45 mt-1">
                          GST as applicable · auto-renew via Razorpay
                        </div>
                      </div>

                      {!mapped && (
                        <Badge className="mt-3 w-fit bg-rose-900/60 text-[10px] border border-rose-700/60">
                          Map plan_XXXX in platform
                        </Badge>
                      )}

                      <div className="flex-1" />

                      <Button
                        className={`w-full mt-5 font-semibold ${
                          isCurrent
                            ? 'bg-white/10 hover:bg-white/15 text-white'
                            : 'btn-gradient text-white'
                        }`}
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
                      {isCurrent && (
                        <div className="mt-2 text-[10px] text-center text-emerald-300 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> On file for renewals
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* INVOICES */}
        <section className="glass-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/45 flex items-center gap-1.5">
                <Receipt className="h-3 w-3" /> Payment history
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                Charges synced from Razorpay invoices. Refresh to pull the latest.
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
            <div className="overflow-x-auto -mx-1">
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
          )}
        </section>

        {/* TRUST STRIP */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-white/65">
            <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
            <div>
              <div className="text-white font-semibold text-[13px]">
                Secured by{" "}
                <RazorpayWordmark className="inline-block h-3.5 w-auto -mt-0.5 text-white" />
              </div>
              <div className="text-white/55 text-[11px]">
                PCI-DSS Level 1 · 256-bit TLS · cards tokenised by Razorpay (your card never touches our servers).
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/45">
            <a
              href="https://razorpay.com/docs/payments/subscriptions/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition inline-flex items-center gap-1"
            >
              Razorpay Subscriptions <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-white/20">·</span>
            <a
              href="https://razorpay.com/docs/api/payments/subscriptions/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition inline-flex items-center gap-1"
            >
              API <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>
      </div>

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

function BillingSkeleton({ path }: { path?: string }) {
  return (
    <div className="min-h-screen app-ambient">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-white/40">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading subscription…{" "}
          {path ? <span className="font-mono normal-case text-white/30">({path})</span> : null}
        </div>
        <Skeleton className="h-44 w-full rounded-3xl bg-white/[0.04]" />
        <div className="grid lg:grid-cols-5 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl bg-white/[0.04]" />
          <Skeleton className="h-96 lg:col-span-3 rounded-2xl bg-white/[0.04]" />
        </div>
        <Skeleton className="h-56 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
