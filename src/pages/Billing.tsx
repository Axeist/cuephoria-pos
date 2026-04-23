/**
 * /settings/billing — tenant-side subscription + invoice management.
 *
 * Features:
 *   • Shows the current plan + status + next renewal date
 *   • Plan picker with month/year toggle + live price display
 *   • "Subscribe / switch" action redirects to the Razorpay-hosted checkout
 *     (short_url returned by subscription create)
 *   • Cancel-at-period-end and undo
 *   • Invoice history table with download links
 *
 * Internal orgs (is_internal=true) see a banner explaining that they're
 * managed manually — the checkout / cancel controls are hidden so the
 * Cuephoria Main/Lite lounges can never accidentally be billed.
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Crown,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
}

const STATUS_PILL: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  trialing: { label: "Trial", tone: "bg-sky-500/20 text-sky-200 border-sky-500/40" },
  past_due: { label: "Past due", tone: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
  paused: { label: "Paused", tone: "bg-zinc-500/20 text-zinc-200 border-zinc-500/40" },
  canceled: { label: "Canceled", tone: "bg-rose-500/20 text-rose-200 border-rose-500/40" },
  internal: { label: "Internal", tone: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40" },
};

const PLAN_GRADIENTS: Record<string, string> = {
  starter: "from-cyan-500/20 via-cyan-500/10 to-transparent",
  growth: "from-violet-500/25 via-violet-500/10 to-transparent",
  pro: "from-amber-500/25 via-orange-500/10 to-transparent",
  internal: "from-fuchsia-500/25 via-fuchsia-500/10 to-transparent",
};

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

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [interval, setInterval] = React.useState<Interval>("month");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [billingProvider] = React.useState<"razorpay" | "stripe">("razorpay");

  const billingQ = useQuery<BillingResponse>({
    queryKey: ["tenant-billing"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/billing", { credentials: "include" });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Failed to load billing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json;
    },
    staleTime: 15_000,
  });

  const subscribeM = useMutation({
    mutationFn: async ({ planCode }: { planCode: string }) => {
      const res = await fetch("/api/tenant/billing", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "subscribe", planCode, interval, provider: billingProvider }),
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Subscribe failed");
      return json as { shortUrl: string | null };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tenant-billing"] });
      if (data.shortUrl) {
        toast({ title: "Redirecting to checkout", description: "Opening secure Razorpay page…" });
        window.open(data.shortUrl, "_blank", "noopener,noreferrer");
      } else {
        toast({ title: "Subscription ready", description: "Your plan is now active." });
      }
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
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Cancel failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-billing"] });
      toast({ title: "Cancel scheduled", description: "Your plan stays active until period end." });
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
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Resume failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-billing"] });
      toast({ title: "Welcome back", description: "Your subscription will continue renewing." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Resume failed", description: err.message });
    },
  });

  if (billingQ.isLoading) return <BillingSkeleton />;
  if (billingQ.isError || !billingQ.data) {
    return (
      <div className="min-h-screen bg-[#0a0b14] text-zinc-100 p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardContent className="py-8 text-center">
              <XCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
              <div className="text-lg font-semibold">Couldn't load billing</div>
              <div className="text-sm text-rose-200 mt-1">
                {(billingQ.error as Error | undefined)?.message || "Please try again."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const data = billingQ.data;
  const { subscription, currentPlan, plans, invoices, organization, canEdit } = data;
  const status = subscription?.status || organization.status;
  const statusPill = STATUS_PILL[status] ?? STATUS_PILL.active;
  const isInternal = organization.is_internal;

  return (
    <div className="min-h-screen bg-[#0a0b14] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-4 text-sm text-zinc-400">
          <Link to="/settings/organization" className="hover:text-zinc-100 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to organization
          </Link>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0b18] via-[#11122a] to-[#0b0a14] p-6 sm:p-8 mb-6">
          <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full blur-[120px] bg-violet-500/25" />
          <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full blur-[120px] bg-fuchsia-500/20" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              <CreditCard className="h-3.5 w-3.5" />
              Billing
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
              {isInternal ? "Internal workspace" : "Your plan"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-xl">
              {isInternal
                ? "This workspace is managed by the Cuetronix team. Billing is handled offline — no Razorpay charges will ever be issued."
                : "Pick the plan that fits your lounge. Upgrade, downgrade, or cancel anytime — changes apply at the end of the current period."}
            </p>
            {!isInternal && (
              <p className="mt-2 text-xs text-zinc-500">
                Billing provider: <span className="text-zinc-300 font-medium">{billingProvider}</span> (Stripe scaffolded, activation pending)
              </p>
            )}

            {!isInternal && (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${statusPill.tone}`}>
                    {statusPill.label}
                  </span>
                  {currentPlan && (
                    <span className="inline-flex items-center gap-1 text-sm text-zinc-300">
                      <Crown className="h-4 w-4 text-amber-400" />
                      {currentPlan.name}
                    </span>
                  )}
                </div>
                {subscription?.current_period_end && (
                  <div className="text-sm text-zinc-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {subscription.cancel_at_period_end ? "Cancels on" : "Renews on"}{" "}
                    <span className="text-zinc-200 font-medium">{formatDate(subscription.current_period_end)}</span>
                  </div>
                )}
                {subscription?.cancel_at_period_end && canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20"
                    disabled={resumeM.isPending}
                    onClick={() => resumeM.mutate()}
                  >
                    {resumeM.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Undo cancel
                  </Button>
                )}
                {!subscription?.cancel_at_period_end && subscription?.razorpay_subscription_id && canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-zinc-200 hover:bg-white/5"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel plan
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {!canEdit && !isInternal && (
          <Card className="mb-6 border-sky-500/30 bg-sky-500/5">
            <CardContent className="py-3 px-4 text-sm text-sky-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Only owners and admins can change billing. Contact your workspace owner if you'd like a different plan.
            </CardContent>
          </Card>
        )}

        {/* Interval toggle */}
        {!isInternal && canEdit && (
          <div className="mb-4 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 w-fit">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                interval === "month" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                interval === "year" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              Yearly{" "}
              <span className="ml-1 text-[10px] text-emerald-500 font-bold">SAVE ~17%</span>
            </button>
          </div>
        )}

        {/* Plan picker */}
        {!isInternal && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {plans
              .filter((p) => p.is_public && p.is_active)
              .map((plan) => {
                const price = interval === "year" ? plan.price_inr_year : plan.price_inr_month;
                const rzpId = interval === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
                const stripeId = interval === "year" ? plan.stripe_price_id_year : plan.stripe_price_id_month;
                const mapped =
                  billingProvider === "razorpay"
                    ? !!rzpId || (typeof price === "number" && price > 0)
                    : !!stripeId;
                const isCurrent =
                  subscription?.interval === interval && currentPlan?.code === plan.code && status === "active";
                const gradient = PLAN_GRADIENTS[plan.code] ?? PLAN_GRADIENTS.growth;

                return (
                  <div
                    key={plan.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                      isCurrent
                        ? "border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                        : "border-white/10 bg-[#0f1020] hover:border-white/20"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">{plan.code}</div>
                          <div className="text-xl font-bold mt-0.5">{plan.name}</div>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-extrabold tracking-tight">{formatINR(price)}</span>
                          <span className="text-xs text-zinc-500 mb-1">/ {interval}</span>
                        </div>
                      </div>
                      <Separator className="my-4 bg-white/10" />
                      <div className="mt-4">
                        <Button
                          className="w-full"
                          disabled={!canEdit || subscribeM.isPending || isCurrent || !mapped}
                          onClick={() => subscribeM.mutate({ planCode: plan.code })}
                          title={!mapped ? "This plan isn't live yet — ask the Cuetronix team." : undefined}
                        >
                          {subscribeM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                          {isCurrent
                            ? "Current plan"
                            : !mapped
                              ? "Coming soon"
                              : !rzpId && billingProvider === "razorpay"
                                ? "Start " + plan.name + " (auto-setup)"
                              : subscription?.razorpay_subscription_id
                                ? "Switch to " + plan.name
                                : "Start " + plan.name}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Invoices */}
        <Card className="border-white/10 bg-[#0d0e1c]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Receipt className="h-5 w-5 text-zinc-400" />
              Invoice history
            </CardTitle>
            <CardDescription>Every Razorpay invoice issued for this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                No invoices yet. Once your first billing cycle runs you'll see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-white/5">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Invoice</th>
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 pr-4 text-zinc-200">{formatDate(inv.paid_at || inv.created_at)}</td>
                        <td className="py-3 pr-4 text-zinc-300">
                          <div className="font-mono text-xs">{inv.provider_invoice_id || inv.id}</div>
                          {inv.provider_payment_id ? (
                            <div className="text-[10px] text-zinc-500">pay: {inv.provider_payment_id}</div>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">
                          {inv.period_start && inv.period_end ? (
                            <span>
                              {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-zinc-100">{formatINR(inv.amount_inr)}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            className={
                              inv.status === "paid"
                                ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                                : inv.status === "issued"
                                  ? "bg-sky-500/20 text-sky-200 border-sky-500/40"
                                  : "bg-rose-500/20 text-rose-200 border-rose-500/40"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {inv.short_url ? (
                            <a
                              href={inv.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Receipt
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
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
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="border-white/10 bg-[#0d0e1c] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your plan will stay active until{" "}
              <span className="text-zinc-100 font-semibold">
                {formatDate(subscription?.current_period_end)}
              </span>
              . No refund is issued for the current period, but you won't be charged again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-zinc-200">Keep plan</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(e) => {
                e.preventDefault();
                cancelM.mutate();
              }}
              disabled={cancelM.isPending}
            >
              {cancelM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0b14] text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 bg-white/5" />
        <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-2xl bg-white/5" />
          <Skeleton className="h-64 rounded-2xl bg-white/5" />
          <Skeleton className="h-64 rounded-2xl bg-white/5" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
