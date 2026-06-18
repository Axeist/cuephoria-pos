/**
 * /platform/plans — simplified Razorpay plan sync for operators.
 *
 * - Test plan: one toggle to enable/disable ₹1 billing for QA.
 * - Production plans: compact table to paste Razorpay plan IDs and save.
 */

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Save,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_public: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  razorpay_plan_id_month: string | null;
  razorpay_plan_id_year: string | null;
  sort_order: number;
};

type PlansResponse = { ok: true; plans: Plan[] };

type PlanUpdatePayload = {
  is_active?: boolean;
  is_public?: boolean;
  price_inr_month?: number | null;
  price_inr_year?: number | null;
  razorpay_plan_id_month?: string | null;
  razorpay_plan_id_year?: string | null;
};

const PRODUCTION_CODES = ["starter", "growth", "pro"] as const;
const PLAN_ID_RE = /^plan_[A-Za-z0-9]{4,32}$/;

const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json();
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json as T;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

async function savePlan(planCode: string, updates: PlanUpdatePayload) {
  return fetcher<{ ok: true; plan: Plan }>("/api/platform/plan-update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planCode, updates }),
  });
}

function syncStatus(plan: Plan): "ready" | "partial" | "missing" {
  const hasMo = Boolean(plan.razorpay_plan_id_month);
  const hasYr = Boolean(plan.razorpay_plan_id_year);
  if (hasMo && hasYr) return "ready";
  if (hasMo || hasYr) return "partial";
  return "missing";
}

const PlatformPlans: React.FC = () => {
  const query = useQuery({
    queryKey: ["platform", "plans", "editor"],
    queryFn: () => fetcher<PlansResponse>("/api/platform/plans"),
    staleTime: 30_000,
  });

  const plans = query.data?.plans ?? [];
  const testPlan = plans.find((p) => p.code === "test");
  const productionPlans = plans.filter((p) =>
    PRODUCTION_CODES.includes(p.code as (typeof PRODUCTION_CODES)[number]),
  );

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#120a2e] via-[#180f3d] to-[#0b061e] p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
      >
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase font-bold tracking-[0.18em] text-zinc-300">
              <Wallet className="h-3.5 w-3.5 text-indigo-300 animate-pulse" />
              Razorpay Sync
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-50 font-quicksand">Billing plans</h1>
            <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">
              Map Razorpay subscription plan IDs here. Charges use the Razorpay plan amount — not the
              display prices below.
            </p>
          </div>
          <a
            href="https://dashboard.razorpay.com/app/subscriptions/plans"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-white/10 transition-all shadow-md"
          >
            <Wallet className="h-3.5 w-3.5" />
            Razorpay plans dashboard
          </a>
        </div>
      </motion.header>

      {query.isLoading ? (
        <Skeleton className="h-40 w-full bg-white/5 rounded-xl" />
      ) : query.isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200 text-sm">
          {(query.error as Error).message}
        </div>
      ) : (
        <>
          {testPlan ? (
            <TestPlanPanel plan={testPlan} />
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Test plan row not found. Run migration{" "}
              <code className="text-xs bg-black/30 px-1 rounded">20260622140000_add_test_billing_plan</code>.
            </div>
          )}

          <ProductionPlansTable plans={productionPlans} />
        </>
      )}
    </div>
  );
};

export default PlatformPlans;

const TestPlanPanel: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const enabled = plan.is_active && plan.is_public;
  const [planId, setPlanId] = React.useState(plan.razorpay_plan_id_month ?? "");
  const idDirty = planId.trim() !== (plan.razorpay_plan_id_month ?? "");

  React.useEffect(() => {
    setPlanId(plan.razorpay_plan_id_month ?? "");
  }, [plan.razorpay_plan_id_month]);

  const mutation = useMutation({
    mutationFn: (updates: PlanUpdatePayload) => savePlan("test", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "plans", "editor"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update test plan", description: err.message, variant: "destructive" });
    },
  });

  const toggleEnabled = (next: boolean) => {
    mutation.mutate(
      { is_active: next, is_public: next },
      {
        onSuccess: () => {
          toast({
            title: next ? "Test plan enabled" : "Test plan disabled",
            description: next
              ? "Tenants can subscribe to the ₹1 test plan on /subscription."
              : "Test plan hidden from tenant billing.",
          });
        },
      },
    );
  };

  const savePlanId = () => {
    const trimmed = planId.trim();
    if (trimmed && !PLAN_ID_RE.test(trimmed)) {
      toast({
        title: "Invalid plan ID",
        description: "Must look like plan_XXXX.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(
      { razorpay_plan_id_month: trimmed || null },
      {
        onSuccess: () => toast({ title: "Test Razorpay plan ID saved" }),
      },
    );
  };

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-lg shadow-amber-950/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between font-quicksand">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-1.5 border border-amber-500/20">
              <FlaskConical className="h-4.5 w-4.5 text-amber-300 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-zinc-50">Test billing plan</h2>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase font-bold tracking-wider",
                enabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
              )}
            >
              {enabled ? "Enabled for tenants" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">
            Use this to verify checkout, webhooks, and access unlock with a{" "}
            <span className="text-amber-200 font-semibold">
              {plan.price_inr_month != null ? inr.format(plan.price_inr_month) : "₹1"}/mo
            </span>{" "}
            Razorpay test plan. Disable when you are done testing.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b061c]/50 px-4 py-2.5">
          <div className="text-right">
            <div className="text-sm font-semibold text-zinc-200">Show on tenant billing</div>
            <div className="text-[11px] text-zinc-500 font-medium">Toggle off to hide instantly</div>
          </div>
          <Switch
            checked={enabled}
            disabled={mutation.isPending}
            onCheckedChange={toggleEnabled}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <Input
          value={planId}
          onChange={(e) => setPlanId(e.target.value.trim())}
          placeholder="plan_XXXXXXXXXXXX"
          className="font-mono text-sm bg-[#0b061c]/60 border-white/10 flex-1 focus:border-indigo-500/40 focus:ring-indigo-500/20"
        />
        <Button
          size="sm"
          disabled={!idDirty || mutation.isPending}
          onClick={savePlanId}
          className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 transition-all font-semibold"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save plan ID
            </>
          )}
        </Button>
      </div>
    </section>
  );
};

type RowDraft = {
  price_inr_month: string;
  price_inr_year: string;
  razorpay_plan_id_month: string;
  razorpay_plan_id_year: string;
};

const ProductionPlansTable: React.FC<{ plans: Plan[] }> = ({ plans }) => {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#130b2c]/30 backdrop-blur-md overflow-hidden shadow-xl">
      <div className="border-b border-white/5 px-5 py-4 bg-white/[0.01]">
        <h2 className="text-sm font-bold text-zinc-100">Production plans</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Paste monthly and yearly Razorpay plan IDs for each tier. Display prices are shown to tenants only.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Monthly ₹</th>
              <th className="px-3 py-3 font-medium">Yearly ₹</th>
              <th className="px-3 py-3 font-medium">Razorpay monthly</th>
              <th className="px-3 py-3 font-medium">Razorpay yearly</th>
              <th className="px-3 py-3 font-medium">Sync</th>
              <th className="px-5 py-3 font-medium text-right">Save</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <PlanRow key={plan.id} plan={plan} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const PlanRow: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toDraft = (p: Plan): RowDraft => ({
    price_inr_month: p.price_inr_month != null ? String(p.price_inr_month) : "",
    price_inr_year: p.price_inr_year != null ? String(p.price_inr_year) : "",
    razorpay_plan_id_month: p.razorpay_plan_id_month ?? "",
    razorpay_plan_id_year: p.razorpay_plan_id_year ?? "",
  });

  const [draft, setDraft] = React.useState<RowDraft>(() => toDraft(plan));

  React.useEffect(() => {
    setDraft(toDraft(plan));
  }, [plan]);

  const buildPayload = (): PlanUpdatePayload | null => {
    const payload: PlanUpdatePayload = {};
    const numOrNull = (raw: string) => {
      const t = raw.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const idOrNull = (raw: string) => {
      const t = raw.trim();
      return t || null;
    };

    const nextMo = numOrNull(draft.price_inr_month);
    const nextYr = numOrNull(draft.price_inr_year);
    const nextIdMo = idOrNull(draft.razorpay_plan_id_month);
    const nextIdYr = idOrNull(draft.razorpay_plan_id_year);

    if (nextMo !== (plan.price_inr_month ?? null)) payload.price_inr_month = nextMo;
    if (nextYr !== (plan.price_inr_year ?? null)) payload.price_inr_year = nextYr;
    if (nextIdMo !== (plan.razorpay_plan_id_month ?? null)) {
      payload.razorpay_plan_id_month = nextIdMo;
    }
    if (nextIdYr !== (plan.razorpay_plan_id_year ?? null)) {
      payload.razorpay_plan_id_year = nextIdYr;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  };

  const payload = buildPayload();
  const dirty = payload !== null;

  const mutation = useMutation({
    mutationFn: () => savePlan(plan.code, payload!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "plans", "editor"] });
      toast({ title: "Plan saved", description: `${plan.name} Razorpay mapping updated.` });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save plan", description: err.message, variant: "destructive" });
    },
  });

  const onSave = () => {
    if (!payload) return;
    for (const id of [payload.razorpay_plan_id_month, payload.razorpay_plan_id_year]) {
      if (id && !PLAN_ID_RE.test(id)) {
        toast({
          title: "Invalid Razorpay plan ID",
          description: "IDs must look like plan_XXXX.",
          variant: "destructive",
        });
        return;
      }
    }
    mutation.mutate();
  };

  const status = syncStatus({
    ...plan,
    razorpay_plan_id_month: draft.razorpay_plan_id_month.trim() || null,
    razorpay_plan_id_year: draft.razorpay_plan_id_year.trim() || null,
  });

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
      <td className="px-5 py-3">
        <div className="font-semibold text-zinc-100">{plan.name}</div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{plan.code}</div>
      </td>
      <td className="px-3 py-3">
        <Input
          type="number"
          min={0}
          value={draft.price_inr_month}
          onChange={(e) => setDraft((d) => ({ ...d, price_inr_month: e.target.value }))}
          className="h-9 w-24 font-mono bg-[#0b061c]/60 border-white/10 focus:border-indigo-500/40 focus:ring-indigo-500/20"
        />
      </td>
      <td className="px-3 py-3">
        <Input
          type="number"
          min={0}
          value={draft.price_inr_year}
          onChange={(e) => setDraft((d) => ({ ...d, price_inr_year: e.target.value }))}
          className="h-9 w-28 font-mono bg-[#0b061c]/60 border-white/10 focus:border-indigo-500/40 focus:ring-indigo-500/20"
        />
      </td>
      <td className="px-3 py-3">
        <Input
          value={draft.razorpay_plan_id_month}
          onChange={(e) => setDraft((d) => ({ ...d, razorpay_plan_id_month: e.target.value.trim() }))}
          placeholder="plan_…"
          className="h-9 min-w-[180px] font-mono text-xs bg-[#0b061c]/60 border-white/10 focus:border-indigo-500/40 focus:ring-indigo-500/20"
        />
      </td>
      <td className="px-3 py-3">
        <Input
          value={draft.razorpay_plan_id_year}
          onChange={(e) => setDraft((d) => ({ ...d, razorpay_plan_id_year: e.target.value.trim() }))}
          placeholder="plan_…"
          className="h-9 min-w-[180px] font-mono text-xs bg-[#0b061c]/60 border-white/10 focus:border-indigo-500/40 focus:ring-indigo-500/20"
        />
      </td>
      <td className="px-3 py-3">
        <SyncBadge status={status} />
      </td>
      <td className="px-5 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || mutation.isPending}
          onClick={onSave}
          className="border-white/15 bg-white/5 hover:bg-white/10 transition-all font-semibold"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </>
          )}
        </Button>
      </td>
    </tr>
  );
};

const SyncBadge: React.FC<{ status: "ready" | "partial" | "missing" }> = ({ status }) => {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Synced
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-300">
        <AlertCircle className="h-3.5 w-3.5" />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-rose-300">
      <AlertCircle className="h-3.5 w-3.5" />
      Missing IDs
    </span>
  );
};
