/**
 * /settings/billing — Razorpay subscription management.
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
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Hourglass,
  Loader2,
  Pause,
  Play,
  Receipt,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

async function parseBillingJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trim();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksJson) {
    const snippet = trimmed.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(snippet || `Billing request failed (HTTP ${res.status}).`);
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error(trimmed.replace(/\s+/g, " ").slice(0, 160));
  }
}

async function postBillingAction<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/api/tenant/billing", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await parseBillingJson(res);
  if (json.ok === false) throw new Error(String(json.error || "Request failed"));
  return json as T;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cycle, setCycle] = React.useState<BillingCycle>("month");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [pendingTier, setPendingTier] = React.useState<PlanTier | null>(null);

  const refreshBilling = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["tenant-billing"] });
  }, [qc]);

  const billingQ = useQuery<BillingResponse>({
    queryKey: ["tenant-billing"],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const onMainAbort = () => controller.abort();
      signal.addEventListener("abort", onMainAbort);
      const t = window.setTimeout(() => controller.abort(), 20_000);
      try {
        const res = await fetch("/api/tenant/billing", {
          credentials: "include",
          signal: controller.signal,
        });
        const json = await parseBillingJson(res);
        if (json.ok === false) throw new Error(String(json.error || "Failed to load billing"));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return json as BillingResponse;
      } catch (e: unknown) {
        const name = e && typeof e === "object" && "name" in e ? (e as { name?: string }).name : "";
        if (name === "AbortError") {
          throw new Error("Billing request timed out. Check your connection and try again.");
        }
        throw e;
      } finally {
        window.clearTimeout(t);
        signal.removeEventListener("abort", onMainAbort);
      }
    },
    // Fail fast (one retry) so a real backend error surfaces in a few seconds
    // instead of holding the skeleton through three slow retries.
    retry: 1,
    retryDelay: 1500,
    staleTime: 15_000,
  });

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

  if (billingQ.isLoading) return <BillingSkeleton />;
  if (billingQ.isError || !billingQ.data) {
    return (
      <div className="min-h-screen bg-[#070815] text-zinc-100 p-6 flex items-center justify-center">
        <Card className="max-w-lg w-full border-rose-500/30 bg-rose-950/20">
          <CardContent className="py-10 text-center">
            <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
            <h1 className="text-lg font-semibold">Billing unavailable</h1>
            <p className="text-sm text-zinc-400 mt-2">{(billingQ.error as Error | undefined)?.message}</p>
            <Button variant="outline" className="mt-6 border-white/20" onClick={() => refreshBilling()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Try again
            </Button>
          </CardContent>
        </Card>
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
    // No active sub OR sub is in a terminal state → create/renew flow.
    if (!subscription?.razorpay_subscription_id || isTerminal) {
      createM.mutate({
        planTier: planCode,
        billingCycle: cycle,
        renew: !!subscription?.razorpay_subscription_id,
      });
      return;
    }
    // Same plan/cycle as active → reuse existing mandate (open Checkout again).
    const samePlan = subscription.plan_tier === planCode;
    const sameCycle = (subscription.billing_cycle ?? subscription.interval) === cycle;
    if (samePlan && sameCycle && isReusable) {
      createM.mutate({ planTier: planCode, billingCycle: cycle });
      return;
    }
    // Different plan/cycle on a live sub → PATCH at cycle_end.
    upgradeM.mutate({ planTier: planCode, billingCycle: cycle });
  };

  // Render ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#070815] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/settings/organization"
              className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-200"
            >
              <ArrowLeft className="h-4 w-4" /> Organization
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Billing & subscription</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              {internal
                ? "This workspace is invoiced internally. No Razorpay charges happen here."
                : "Manage your Cuephoria POS subscription. Mandates and recurring charges run on Razorpay; your card stays on file across cycles."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/15 text-[10px] uppercase tracking-wide">
              Razorpay {razorpay.mode}
            </Badge>
            {subscription?.access_suspended && (
              <Badge className="bg-rose-600/20 border border-rose-500/50 text-rose-200 text-[10px] uppercase tracking-wide">
                Access suspended
              </Badge>
            )}
          </div>
        </div>

        {!canEdit && !internal && (
          <Card className="border-sky-500/30 bg-sky-950/20">
            <CardContent className="py-4 flex gap-3 text-sm text-sky-100">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
              Only owners and admins can manage billing. Ask a workspace owner to make changes.
            </CardContent>
          </Card>
        )}

        {/* Current subscription panel */}
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2 border-white/10 bg-zinc-900/40 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-400" />
                Current subscription
              </CardTitle>
              <CardDescription>State mirrored from Razorpay webhooks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {internal ? (
                <p className="text-sm text-zinc-400">Internal tenancy — billing is settled offline.</p>
              ) : !subscription || !subscription.razorpay_subscription_id ? (
                <p className="text-sm text-zinc-400">
                  No active subscription. Choose a plan on the right to get started.
                </p>
              ) : (
                <>
                  {statusUi && (
                    <div className="flex flex-wrap items-start gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusUi.badge}`}
                      >
                        <statusUi.icon className="h-3.5 w-3.5" />
                        {statusUi.label}
                      </span>
                    </div>
                  )}
                  {statusUi && <p className="text-xs text-zinc-500">{statusUi.description}</p>}

                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-500">Plan</div>
                    <div className="text-xl font-semibold">
                      {currentPlan?.name ?? tierLabel(subscription.plan_tier ?? "—")}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {(subscription.billing_cycle ?? subscription.interval) === "year"
                        ? "Yearly billing · 1 cycle"
                        : "Monthly billing · 12 cycles"}
                    </div>
                  </div>

                  {subscription.scheduled_change && (
                    <Card className="border-amber-500/30 bg-amber-950/20">
                      <CardContent className="py-3 text-xs text-amber-100 space-y-2">
                        <div className="flex items-start gap-2">
                          <CalendarClock className="h-4 w-4 mt-0.5" />
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
                            className="border-amber-500/40 text-amber-100 hover:bg-amber-500/10"
                          >
                            {cancelScheduledM.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                            Cancel scheduled change
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Next charge" value={formatDate(subscription.charge_at)} icon={Clock} />
                    <Stat
                      label="Cycles done"
                      value={
                        subscription.total_count != null
                          ? `${subscription.paid_count ?? 0} / ${subscription.total_count}`
                          : `${subscription.paid_count ?? 0}`
                      }
                      icon={CheckCircle2}
                    />
                  </div>

                  {subscription.cancel_at_period_end && subscription.current_period_end && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
                      Cancellation scheduled. Access continues until{" "}
                      <strong>{formatDate(subscription.current_period_end)}</strong>.
                    </div>
                  )}

                  <Separator className="bg-white/10" />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {isReusable && !isTerminal && canEdit && !subscription.cancel_at_period_end && (
                      <>
                        {!isPaused && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pauseM.isPending}
                            onClick={() => pauseM.mutate()}
                            className="border-amber-500/40 text-amber-100 hover:bg-amber-500/10"
                          >
                            {pauseM.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Pause className="h-3.5 w-3.5 mr-1" />
                            )}
                            Pause
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300 hover:text-rose-200"
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
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        {resumeM.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Play className="h-3.5 w-3.5 mr-1" />
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
                        className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
                      >
                        {resumeM.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Keep subscription
                      </Button>
                    )}
                    {subscription.razorpay_subscription_id && (
                      <a
                        href={`https://dashboard.razorpay.com/app/subscriptions/${subscription.razorpay_subscription_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 ml-auto"
                      >
                        Razorpay <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Plan picker */}
          <Card className="lg:col-span-3 border-white/10 bg-zinc-900/30">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    {isTerminal || !subscription?.razorpay_subscription_id ? "Choose a plan" : "Switch plan"}
                  </CardTitle>
                  <CardDescription>
                    {isTerminal
                      ? "Renew to continue using the platform."
                      : isActive
                        ? "Plan changes apply at your next renewal."
                        : "Pick the plan that fits your venue."}
                  </CardDescription>
                </div>
                {!internal && (
                  <div className="flex rounded-full border border-white/10 bg-black/40 p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setCycle("month")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        cycle === "month" ? "bg-white text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycle("year")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        cycle === "year" ? "bg-white text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      Yearly{" "}
                      <span className="ml-1 text-[9px] uppercase opacity-70">save 20%</span>
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {internal ? (
                <p className="text-zinc-500 text-sm py-8 text-center">
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

                    const buttonLabel =
                      !subscription?.razorpay_subscription_id || isTerminal
                        ? subscription?.razorpay_subscription_id
                          ? "Renew"
                          : "Subscribe"
                        : isCurrent
                          ? "Active"
                          : "Switch plan";

                    const ButtonIcon =
                      buttonLabel === "Renew"
                        ? RotateCw
                        : buttonLabel === "Switch plan"
                          ? ArrowRight
                          : isCurrent
                            ? Check
                            : ArrowRight;

                    return (
                      <div
                        key={plan.id}
                        className={`relative rounded-2xl border p-4 flex flex-col transition ${
                          isCurrent
                            ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                            : "border-white/10 bg-black/20 hover:border-white/20"
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          {plan.code}
                        </div>
                        <div className="font-bold text-lg">{plan.name}</div>
                        <div className="mt-4 text-3xl font-extrabold">{formatINR(price)}</div>
                        <div className="text-xs text-zinc-500 mb-2">
                          /{cycle === "month" ? "mo" : "yr"} · GST as applicable
                        </div>
                        {!mapped && (
                          <Badge className="w-fit mb-3 bg-rose-900/60 text-[10px]">
                            Map plan_XXXX in platform
                          </Badge>
                        )}
                        <div className="flex-1" />
                        <Button
                          className="w-full mt-4"
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
                          <div className="mt-2 text-[11px] text-center text-emerald-400 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> On file for renewals
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card className="border-white/10 bg-zinc-900/30">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5" />
                  Payment history
                </CardTitle>
                <CardDescription>
                  Charges synced from Razorpay invoices. Refresh to pull the latest.
                </CardDescription>
              </div>
              {!internal && subscription?.razorpay_subscription_id && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={fetchInvoicesM.isPending}
                  onClick={() => fetchInvoicesM.mutate()}
                  className="border-white/15"
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
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">
                No charges yet. Successful payments will appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-zinc-500 border-b border-white/5">
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Invoice</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 pr-3">{formatDate(inv.paid_at || inv.created_at)}</td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {inv.provider_invoice_id || inv.id}
                        </td>
                        <td className="py-3 pr-3 font-semibold">{formatINR(inv.amount_inr)}</td>
                        <td className="py-3 pr-3 capitalize">{inv.status}</td>
                        <td className="py-3 text-right">
                          {inv.short_url ? (
                            <a
                              href={inv.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 inline-flex gap-1 text-xs items-center hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" /> PDF{" "}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-zinc-600 pb-2">
          Recurring billing uses{" "}
          <a
            href="https://razorpay.com/docs/payments/subscriptions/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Razorpay Subscriptions
          </a>
          {" · "}
          <a
            href="https://razorpay.com/docs/api/payments/subscriptions/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Subscriptions API
          </a>
        </p>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You&apos;ll keep access until{" "}
              <span className="text-white font-semibold">
                {formatDate(subscription?.current_period_end)}
              </span>
              . Charges stop after that. No refunds for time already prepaid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Keep subscribing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600"
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
    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-[#070815] p-6 space-y-6 max-w-6xl mx-auto">
      <Skeleton className="h-10 w-64 bg-white/10" />
      <div className="grid lg:grid-cols-5 gap-6">
        <Skeleton className="h-80 lg:col-span-2 rounded-xl bg-white/10" />
        <Skeleton className="h-80 lg:col-span-3 rounded-xl bg-white/10" />
      </div>
      <Skeleton className="h-52 rounded-xl bg-white/10" />
    </div>
  );
}
