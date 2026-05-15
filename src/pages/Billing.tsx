/**
 * /settings/billing — tenant SaaS subscriptions (Razorpay).
 *
 * Server creates a Razorpay subscription (plan-backed, recurring) per
 * https://razorpay.com/docs/api/payments/subscriptions/
 * Customer completes mandate via `short_url` (hosted Checkout, recommended)
 * https://razorpay.com/docs/payments/subscriptions/ or embedded Standard Checkout
 * with `subscription_id` + `customer_id`
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
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

type Interval = "month" | "year";

type PaymentInstrument =
  | { kind: "card"; last4: string; network: string | null; type: string | null; issuer: string | null }
  | { kind: "upi"; vpa: string }
  | { kind: "emandate"; bank: string | null }
  | { kind: "wallet"; provider: string | null }
  | { kind: "none" };

interface Plan {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  razorpay_plan_id_month: string | null;
  razorpay_plan_id_year: string | null;
  stripe_price_id_month?: string | null;
  stripe_price_id_year?: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  provider: string;
  status: string;
  interval: Interval;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  cancel_requested_at: string | null;
  razorpay_subscription_id: string | null;
  razorpay_customer_id: string | null;
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
  provider_payment_id?: string | null;
  provider_subscription_id?: string | null;
  created_at: string;
}

type BillingInstrumentOk = {
  ok: true;
  paymentInstrument: PaymentInstrument;
};

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
  /** Logged-in admin email for Razorpay Checkout prefill (when present). */
  billingContactEmail: string | null;
  /** Display name prefill / customer name hint (display_name → username). */
  billingPrefillName: string | null;
  paymentInstrument: PaymentInstrument;
}

type SubscribeSuccess = {
  ok: true;
  reused?: boolean;
  shortUrl?: string | null;
  checkout?: {
    keyId: string;
    subscriptionId: string;
    customerId?: string | null;
    shortUrl?: string | null;
  };
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: "Active — auto‑renews monthly", badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  trialing: { label: "Complete payment to activate mandate", badge: "bg-sky-500/20 text-sky-200 border-sky-500/40" },
  past_due: { label: "Payment failed — Razorpay will retry", badge: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
  paused: { label: "Paused", badge: "bg-zinc-500/20 text-zinc-200 border-zinc-500/40" },
  canceled: { label: "Canceled", badge: "bg-rose-500/20 text-rose-200 border-rose-500/40" },
};

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
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Razorpay script failed")), { once: true });
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

function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

async function parseTenantBillingJson(res: Response): Promise<Record<string, unknown>> {
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

function instrumentLabel(p: PaymentInstrument): string {
  if (p.kind === "card") {
    const net = p.network ? `${p.network} ` : "";
    return `${net}···· ${p.last4}`;
  }
  if (p.kind === "upi") return `UPI ${p.vpa}`;
  if (p.kind === "emandate") return p.bank ? `eMandate · ${p.bank}` : "eMandate linked";
  if (p.kind === "wallet") return `Wallet · ${p.provider ?? "—"}`;
  return "Payment method captured after Checkout";
}

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [interval, setInterval] = React.useState<Interval>("month");
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const refreshBilling = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["tenant-billing"] });
    void qc.invalidateQueries({ queryKey: ["tenant-billing-instrument"] });
  }, [qc]);

  const billingQ = useQuery<BillingResponse>({
    queryKey: ["tenant-billing"],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const onMainAbort = () => controller.abort();
      signal.addEventListener("abort", onMainAbort);

      const t = window.setTimeout(() => controller.abort(), 55_000);
      try {
        const res = await fetch("/api/tenant/billing", {
          credentials: "include",
          signal: controller.signal,
        });
        const json = await parseTenantBillingJson(res);
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
    staleTime: 15_000,
  });

  const billingInstrumentQ = useQuery<BillingInstrumentOk>({
    queryKey: ["tenant-billing-instrument"],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const onMainAbort = () => controller.abort();
      signal.addEventListener("abort", onMainAbort);
      const t = window.setTimeout(() => controller.abort(), 25_000);
      try {
        const res = await fetch("/api/tenant/billing-payment-instrument", {
          credentials: "include",
          signal: controller.signal,
        });
        const json = await parseTenantBillingJson(res);
        if (json.ok === false) throw new Error(String(json.error || "Failed to load payment method"));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return json as BillingInstrumentOk;
      } catch (e: unknown) {
        const name = e && typeof e === "object" && "name" in e ? (e as { name?: string }).name : "";
        if (name === "AbortError") {
          throw new Error("Payment method lookup timed out.");
        }
        throw e;
      } finally {
        window.clearTimeout(t);
        signal.removeEventListener("abort", onMainAbort);
      }
    },
    staleTime: 60_000,
    enabled:
      billingQ.isSuccess &&
      !!billingQ.data?.subscription?.razorpay_customer_id &&
      !!billingQ.data?.subscription?.razorpay_subscription_id &&
      !billingQ.data.organization.is_internal &&
      (billingQ.data.subscription.status === "active" || billingQ.data.subscription.status === "trialing"),
  });

  const launchCheckout = async (
    payload: SubscribeSuccess,
    opts: { orgName: string; prefilledEmail: string; prefilledName: string },
  ) => {
    const ch = payload.checkout;
    const hosted = ch?.shortUrl ?? payload.shortUrl ?? null;
    if (hosted) {
      toast({ title: "Complete payment on Razorpay", description: "Opening the secure Razorpay page…" });
      window.open(hosted, "_blank", "noopener,noreferrer");
      return;
    }

    if (!ch?.keyId || !ch.subscriptionId) {
      toast({
        variant: "destructive",
        title: "Checkout unavailable",
        description: "No Razorpay subscription link returned from server.",
      });
      return;
    }

    try {
      await loadRazorpayCheckoutScript();
    } catch {
      toast({ variant: "destructive", title: "Checkout script blocked", description: "Allow scripts for this site and try again." });
      return;
    }
    if (!window.Razorpay) return;

    const checkoutOpts: Record<string, unknown> = {
      key: ch.keyId,
      subscription_id: ch.subscriptionId,
      name: opts.orgName,
      description: "Workspace subscription · recurring mandate",
      prefill: {
        name: opts.prefilledName || undefined,
        email: opts.prefilledEmail || undefined,
      },
      ...(ch.customerId ? { customer_id: ch.customerId } : {}),
      subscription_card_change: true,
      theme: { color: "#6366f1" },
      handler: async (resp: Record<string, unknown>) => {
        const payId = String(resp.razorpay_payment_id ?? "");
        const subId = String(resp.razorpay_subscription_id ?? "");
        const sig = String(resp.razorpay_signature ?? "");
        if (payId && subId && sig) {
          try {
            const vr = await fetch("/api/tenant/billing", {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                action: "verify-payment",
                razorpay_payment_id: payId,
                razorpay_subscription_id: subId,
                razorpay_signature: sig,
              }),
            });
            const vjson = await parseTenantBillingJson(vr);
            if (vjson.ok !== true) throw new Error(String(vjson.error || "Verification failed"));
          } catch (e) {
            toast({
              variant: "destructive",
              title: "Could not verify payment",
              description: (e as Error).message || "Webhooks may still update billing shortly.",
            });
          }
        }
        toast({ title: "Payment recorded", description: "Refreshing billing status…" });
        refreshBilling();
      },
    };

    try {
      const rzp = new window.Razorpay!(checkoutOpts);
      rzp.on?.("payment.failed", (_r: Record<string, unknown>) => {
        const inner =
          _r?.error && typeof _r.error === "object"
            ? (_r.error as { description?: string })
            : ({} as { description?: string });
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: inner.description ?? "Try again.",
        });
      });
      rzp.open();
    } catch {
      toast({ variant: "destructive", title: "Checkout error", description: "Reload and try again." });
    }
  };

  const subscribeM = useMutation({
    mutationFn: async ({ planCode }: { planCode: string }) => {
      const res = await fetch("/api/tenant/billing", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          planCode,
          interval,
          provider: "razorpay",
          contactEmail:
            qc.getQueryData<BillingResponse>(["tenant-billing"])?.billingContactEmail ?? undefined,
          displayName:
            qc.getQueryData<BillingResponse>(["tenant-billing"])?.billingPrefillName ?? undefined,
        }),
      });
      const json = await parseTenantBillingJson(res);
      if (json.ok === false) throw new Error(String(json.error || "Subscribe failed"));
      return json as SubscribeSuccess;
    },
    onSuccess: async (data) => {
      const snap = qc.getQueryData<BillingResponse>(["tenant-billing"]);
      const orgName = snap?.organization.name ?? billingQ.data?.organization.name ?? "Workspace";
      const email = snap?.billingContactEmail ?? billingQ.data?.billingContactEmail ?? "";
      const prefName = snap?.billingPrefillName ?? billingQ.data?.billingPrefillName ?? "";
      await launchCheckout(data, { orgName, prefilledEmail: email, prefilledName: prefName });
      refreshBilling();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Subscription failed", description: err.message });
    },
  });

  const cancelM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/billing", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await parseTenantBillingJson(res);
      if (json.ok === false) throw new Error(String(json.error || "Cancel failed"));
      return json;
    },
    onSuccess: () => {
      refreshBilling();
      toast({ title: "Cancel scheduled", description: "Access continues until the end of the paid period." });
      setCancelOpen(false);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Cancel failed", description: err.message });
    },
  });

  const resumeM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/billing", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
      const json = await parseTenantBillingJson(res);
      if (json.ok === false) throw new Error(String(json.error || "Resume failed"));
      return json;
    },
    onSuccess: () => {
      refreshBilling();
      toast({ title: "Subscription continues", description: "Auto‑renewals are back on." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Resume failed", description: err.message });
    },
  });

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
  const {
    subscription,
    currentPlan,
    plans,
    invoices,
    organization,
    canEdit,
    paymentInstrument: paymentInstrumentBase,
    razorpay,
  } = data;
  const paymentInstrument =
    billingInstrumentQ.data?.ok === true ? billingInstrumentQ.data.paymentInstrument : paymentInstrumentBase;

  const internal = organization.is_internal;

  const showPaymentInstrumentPending =
    billingInstrumentQ.isPending &&
    !internal &&
    !!subscription?.razorpay_customer_id &&
    !!subscription?.razorpay_subscription_id &&
    (subscription.status === "active" || subscription.status === "trialing");
  const statusKey = subscription?.status ?? "trialing";
  const statusUi = STATUS_META[statusKey] ?? STATUS_META.active;

  return (
    <div className="min-h-screen bg-[#070815] text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/settings/organization" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-4 w-4" /> Organization
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Billing & subscription</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              {internal
                ? "This workspace is invoiced internally by Cuetronix — nothing is charged on card here."
                : "Pricing is pulled from Platform → Plans (Razorpay). Subscribe once — your card stays on file and renews automatically each billing cycle."}
            </p>
          </div>
          <Badge variant="outline" className="border-white/15 text-[10px] uppercase tracking-wide w-fit">
            Razorpay {razorpay.mode}
          </Badge>
        </div>

        {!canEdit && !internal && (
          <Card className="border-sky-500/30 bg-sky-950/20">
            <CardContent className="py-4 flex gap-3 text-sm text-sky-100">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
              Only owners and admins can change billing. Ask a workspace owner to upgrade/downgrade plans.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2 border-white/10 bg-zinc-900/40 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-400" />
                Current subscription
              </CardTitle>
              <CardDescription>Status synced from Razorpay webhooks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {internal ? (
                <p className="text-sm text-zinc-400">Internal tenancy — billing is settled offline.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusUi.badge}`}>{statusUi.label}</span>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-500">Plan</div>
                    <div className="text-xl font-semibold">{currentPlan?.name ?? "No plan yet"}</div>
                    {subscription?.interval && (
                      <div className="text-xs text-zinc-500 mt-1">
                        Billing: {subscription.interval === "year" ? "Yearly (12 mo)" : "Monthly"}
                      </div>
                    )}
                  </div>
                  {subscription?.current_period_end && (
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="h-4 w-4 text-zinc-500 mt-0.5" />
                      <div>
                        {subscription.cancel_at_period_end ? "Access until" : "Next renewal"}
                        <div className="font-medium">{formatDate(subscription.current_period_end)}</div>
                      </div>
                    </div>
                  )}
                  <Separator className="bg-white/10" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Payment method</div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 bg-black/25 text-sm font-mono">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                      {showPaymentInstrumentPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-500 shrink-0" aria-hidden />
                      )}
                      <span>{instrumentLabel(paymentInstrument)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {subscription?.cancel_at_period_end && canEdit && (
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
                    {!subscription?.cancel_at_period_end && subscription?.razorpay_subscription_id && canEdit && (
                      <Button variant="ghost" size="sm" className="text-rose-300 hover:text-rose-200" onClick={() => setCancelOpen(true)}>
                        Cancel at period end
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-white/10 bg-zinc-900/30">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-400" />
                    Choose a plan
                  </CardTitle>
                  <CardDescription>IDs and amounts mirror Platform Plans + Razorpay catalog.</CardDescription>
                </div>
                {!internal && canEdit && (
                  <div className="flex rounded-full border border-white/10 bg-black/40 p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setInterval("month")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        interval === "month" ? "bg-white text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterval("year")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        interval === "year" ? "bg-white text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {internal ? (
                <p className="text-zinc-500 text-sm py-8 text-center">No self‑serve billing for internal orgs.</p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-3">
                  {plans
                    .filter((p) => p.is_public && p.is_active)
                    .map((plan) => {
                      const price = interval === "year" ? plan.price_inr_year : plan.price_inr_month;
                      const rzpId = interval === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
                      const mapped = !!rzpId;
                      const isCurrent =
                        subscription?.interval === interval && currentPlan?.code === plan.code && (subscription?.status === "active" || subscription?.status === "trialing");
                      return (
                        <div
                          key={plan.id}
                          className={`relative rounded-2xl border p-4 flex flex-col ${
                            isCurrent ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 bg-black/20"
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{plan.code}</div>
                          <div className="font-bold text-lg">{plan.name}</div>
                          <div className="mt-4 text-3xl font-extrabold">{formatINR(price)}</div>
                          <div className="text-xs text-zinc-500 mb-2">/{interval === "month" ? "mo" : "yr"} GST as applicable</div>
                          {!mapped && <Badge className="w-fit mb-3 bg-rose-900/60 text-[10px]">Map plan_XXXX in platform</Badge>}
                          <div className="flex-1" />
                          <Button
                            className="w-full mt-4"
                            disabled={!canEdit || subscribeM.isPending || !mapped || isCurrent}
                            onClick={() => subscribeM.mutate({ planCode: plan.code })}
                          >
                            {subscribeM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                            {isCurrent ? "Active" : "Pay & subscribe"}
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

        <Card className="border-white/10 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Payment history
            </CardTitle>
            <CardDescription>Successful charges synced from Razorpay invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">No charges yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-zinc-500 border-b border-white/5">
                      <th className="pb-2 pr-3">Paid</th>
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
                        <td className="py-3 pr-3 font-mono text-xs">{inv.provider_invoice_id || inv.id}</td>
                        <td className="py-3 pr-3 font-semibold">{formatINR(inv.amount_inr)}</td>
                        <td className="py-3 pr-3 capitalize">{inv.status}</td>
                        <td className="py-3 text-right">
                          {inv.short_url ? (
                            <a href={inv.short_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 inline-flex gap-1 text-xs items-center hover:underline">
                              <Download className="h-3.5 w-3.5" /> PDF <ExternalLink className="h-3 w-3" />
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
          <a href="https://razorpay.com/docs/payments/subscriptions/" className="text-indigo-400 hover:underline">
            Razorpay Subscriptions
          </a>{" "}
          ·{" "}
          <a href="https://razorpay.com/docs/api/payments/subscriptions/" className="text-indigo-400 hover:underline">
            Subscriptions API
          </a>
        </p>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You&apos;ll retain access until <span className="text-white font-semibold">{formatDate(subscription?.current_period_end)}</span>.
              Charges stop after that — no refunds for time already prepaid.
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
              {cancelM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-[#070815] p-6 space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-10 w-64 bg-white/10" />
      <div className="grid lg:grid-cols-5 gap-6">
        <Skeleton className="h-72 lg:col-span-2 rounded-xl bg-white/10" />
        <Skeleton className="h-72 lg:col-span-3 rounded-xl bg-white/10" />
      </div>
      <Skeleton className="h-52 rounded-xl bg-white/10" />
    </div>
  );
}
