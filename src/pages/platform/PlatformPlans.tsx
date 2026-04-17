/**
 * /platform/plans — plan & pricing editor.
 *
 * Each plan is rendered as a card with inline-editable pricing (INR +
 * optional USD), Razorpay plan IDs (monthly + yearly), description,
 * sort order, and toggles for is_active / is_public. Saving a card
 * POSTs to `/api/platform/plan-update` with only the fields that were
 * touched — untouched fields never land in the request body, so audit
 * diffs stay clean.
 *
 * The "Razorpay" column doubles as the checklist operators need to go
 * through before a plan can actually be purchased via hosted checkout.
 * Missing a monthly ID ⇒ tenants on that plan can't renew monthly.
 */

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  IndianRupee,
  Info,
  Loader2,
  Save,
  Sparkles,
  Undo2,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types (mirror server response shape)
// ---------------------------------------------------------------------------
type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_public: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  price_usd_month?: number | null;
  price_usd_year?: number | null;
  razorpay_plan_id_month: string | null;
  razorpay_plan_id_year: string | null;
  sort_order: number;
  features?: Record<string, unknown>;
};

type PlansResponse = { ok: true; plans: Plan[] };

type PlanUpdatePayload = {
  name?: string;
  description?: string | null;
  price_inr_month?: number | null;
  price_inr_year?: number | null;
  price_usd_month?: number | null;
  price_usd_year?: number | null;
  razorpay_plan_id_month?: string | null;
  razorpay_plan_id_year?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json();
  if (!res.ok || !json?.ok) {
    const message = json?.error || `Request failed (${res.status})`;
    throw Object.assign(new Error(message), { payload: json });
  }
  return json as T;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PLAN_ID_RE = /^plan_[A-Za-z0-9]{4,32}$/;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const PlatformPlans: React.FC = () => {
  const query = useQuery({
    queryKey: ["platform", "plans", "editor"],
    queryFn: () => fetcher<PlansResponse>("/api/platform/plans"),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Plans & pricing</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Edit plan prices, descriptions, and Razorpay plan IDs used by tenant checkout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://dashboard.razorpay.com/app/subscriptions/plans"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200"
          >
            <Wallet className="h-3.5 w-3.5" />
            Open Razorpay dashboard
          </a>
        </div>
      </motion.header>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200 flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium">Razorpay plan IDs are not created here.</span>{" "}
          Create them in the Razorpay dashboard first (one per billing interval), then paste the
          resulting <span className="font-mono">plan_XXXX</span> values into the matching field
          below. The app only <em>references</em> these IDs.
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4" />
            Couldn't load plans
          </div>
          <p className="mt-2 text-xs text-rose-200/70">{(query.error as Error).message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(query.data?.plans ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlatformPlans;

// ---------------------------------------------------------------------------
// Plan card — controlled form bound to one plan row
// ---------------------------------------------------------------------------
const PlanCard: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local draft state. We initialise from the server row and reset back to
  // it whenever `plan` changes (i.e. after a successful save, because the
  // parent invalidates and React-Query refetches).
  const toDraft = (p: Plan): Draft => ({
    name: p.name,
    description: p.description ?? "",
    price_inr_month: p.price_inr_month ?? "",
    price_inr_year: p.price_inr_year ?? "",
    price_usd_month: p.price_usd_month ?? "",
    price_usd_year: p.price_usd_year ?? "",
    razorpay_plan_id_month: p.razorpay_plan_id_month ?? "",
    razorpay_plan_id_year: p.razorpay_plan_id_year ?? "",
    is_active: p.is_active,
    is_public: p.is_public,
    sort_order: p.sort_order,
  });

  const [draft, setDraft] = React.useState<Draft>(() => toDraft(plan));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setDraft(toDraft(plan));
    setErrors({});
  }, [plan]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = "Required.";
    if (draft.name.length > 60) e.name = "Max 60 characters.";
    if (draft.description.length > 300) e.description = "Max 300 characters.";

    const priceFields: Array<keyof Draft> = [
      "price_inr_month",
      "price_inr_year",
      "price_usd_month",
      "price_usd_year",
    ];
    for (const f of priceFields) {
      const raw = draft[f];
      if (raw === "" || raw === null) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) e[f] = "Must be ≥ 0 or empty.";
    }

    const idFields: Array<keyof Draft> = [
      "razorpay_plan_id_month",
      "razorpay_plan_id_year",
    ];
    for (const f of idFields) {
      const raw = String(draft[f] ?? "").trim();
      if (raw.length > 0 && !PLAN_ID_RE.test(raw)) {
        e[f] = "Must match plan_XXXX.";
      }
    }

    const so = Number(draft.sort_order);
    if (!Number.isInteger(so) || so < 0) e.sort_order = "Integer ≥ 0.";

    return e;
  };

  // Compute diff against the live plan row so we only send changed fields.
  const buildPayload = (): PlanUpdatePayload => {
    const payload: PlanUpdatePayload = {};
    const nullable = (raw: string | number | null): number | null => {
      if (raw === "" || raw === null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const stringOrNull = (raw: string | null): string | null => {
      const v = String(raw ?? "").trim();
      return v.length === 0 ? null : v;
    };

    if (draft.name.trim() !== plan.name) payload.name = draft.name.trim();
    if ((draft.description.trim() || null) !== (plan.description ?? null)) {
      payload.description = draft.description.trim() || null;
    }
    if (nullable(draft.price_inr_month) !== (plan.price_inr_month ?? null)) {
      payload.price_inr_month = nullable(draft.price_inr_month);
    }
    if (nullable(draft.price_inr_year) !== (plan.price_inr_year ?? null)) {
      payload.price_inr_year = nullable(draft.price_inr_year);
    }
    if (nullable(draft.price_usd_month) !== (plan.price_usd_month ?? null)) {
      payload.price_usd_month = nullable(draft.price_usd_month);
    }
    if (nullable(draft.price_usd_year) !== (plan.price_usd_year ?? null)) {
      payload.price_usd_year = nullable(draft.price_usd_year);
    }
    if (stringOrNull(draft.razorpay_plan_id_month) !== (plan.razorpay_plan_id_month ?? null)) {
      payload.razorpay_plan_id_month = stringOrNull(draft.razorpay_plan_id_month);
    }
    if (stringOrNull(draft.razorpay_plan_id_year) !== (plan.razorpay_plan_id_year ?? null)) {
      payload.razorpay_plan_id_year = stringOrNull(draft.razorpay_plan_id_year);
    }
    if (draft.is_active !== plan.is_active) payload.is_active = draft.is_active;
    if (draft.is_public !== plan.is_public) payload.is_public = draft.is_public;
    if (Number(draft.sort_order) !== plan.sort_order) payload.sort_order = Number(draft.sort_order);

    return payload;
  };

  const payload = buildPayload();
  const dirty = Object.keys(payload).length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      fetcher<{ ok: true; plan: Plan }>("/api/platform/plan-update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode: plan.code, updates: payload }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "plans", "editor"] });
      toast({ title: "Plan saved", description: `"${plan.code}" is now live.` });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save plan", description: err.message, variant: "destructive" });
    },
  });

  const onSave = () => {
    const es = validate();
    setErrors(es);
    if (Object.keys(es).length > 0) return;
    if (!dirty) return;
    mutation.mutate();
  };

  const onReset = () => {
    setDraft(toDraft(plan));
    setErrors({});
  };

  const hasMonthlyId = Boolean(plan.razorpay_plan_id_month);
  const hasYearlyId = Boolean(plan.razorpay_plan_id_year);

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.02] overflow-hidden transition-colors",
        dirty ? "border-indigo-500/40" : "border-white/10",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <div className="text-sm font-semibold text-zinc-100">{plan.name}</div>
            <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-zinc-400">
              {plan.code}
            </Badge>
            {!plan.is_active && (
              <Badge variant="outline" className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400 text-[10px] uppercase tracking-wider">
                inactive
              </Badge>
            )}
            {!plan.is_public && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] uppercase tracking-wider">
                hidden
              </Badge>
            )}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            List price:{" "}
            <span className="text-zinc-300">
              {plan.price_inr_month ? `${inr.format(plan.price_inr_month)}/mo` : "custom"}
            </span>
            {plan.price_inr_year && (
              <>
                {" "}· <span className="text-zinc-300">{inr.format(plan.price_inr_year)}/yr</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ReadinessDot ok={hasMonthlyId} label="Monthly Razorpay ID" />
          <ReadinessDot ok={hasYearlyId} label="Yearly Razorpay ID" />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Display name" error={errors.name}>
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={60}
              className="bg-black/30 border-white/10"
            />
          </Field>
          <Field label="Sort order" error={errors.sort_order} hint="Lower = earlier in pickers">
            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value || 0))}
              className="bg-black/30 border-white/10 font-mono"
              min={0}
              step={1}
            />
          </Field>
        </div>

        <Field label="Description" error={errors.description}>
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="One-sentence blurb shown on the pricing page."
            className="bg-black/30 border-white/10 resize-none"
          />
        </Field>

        {/* Pricing */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-3.5 w-3.5 text-zinc-500" />
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">INR pricing</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PriceField
              label="Monthly"
              value={draft.price_inr_month}
              onChange={(v) => set("price_inr_month", v)}
              error={errors.price_inr_month}
              currency="₹"
            />
            <PriceField
              label="Yearly"
              value={draft.price_inr_year}
              onChange={(v) => set("price_inr_year", v)}
              error={errors.price_inr_year}
              currency="₹"
              hint={
                yearlyDiscountHint(
                  Number(draft.price_inr_month) || 0,
                  Number(draft.price_inr_year) || 0,
                )
              }
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-3.5 w-3.5 text-zinc-500 font-bold text-[11px] inline-flex items-center">$</span>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">USD pricing (optional)</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PriceField
              label="Monthly"
              value={draft.price_usd_month}
              onChange={(v) => set("price_usd_month", v)}
              error={errors.price_usd_month}
              currency="$"
            />
            <PriceField
              label="Yearly"
              value={draft.price_usd_year}
              onChange={(v) => set("price_usd_year", v)}
              error={errors.price_usd_year}
              currency="$"
            />
          </div>
        </div>

        {/* Razorpay */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-3.5 w-3.5 text-zinc-500" />
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Razorpay plan IDs</div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Monthly plan ID" error={errors.razorpay_plan_id_month}>
              <Input
                value={draft.razorpay_plan_id_month}
                onChange={(e) => set("razorpay_plan_id_month", e.target.value.trim())}
                placeholder="plan_XXXXXXXXXXXX"
                className="bg-black/30 border-white/10 font-mono text-sm"
              />
            </Field>
            <Field label="Yearly plan ID" error={errors.razorpay_plan_id_year}>
              <Input
                value={draft.razorpay_plan_id_year}
                onChange={(e) => set("razorpay_plan_id_year", e.target.value.trim())}
                placeholder="plan_XXXXXXXXXXXX"
                className="bg-black/30 border-white/10 font-mono text-sm"
              />
            </Field>
          </div>
        </div>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-3">
          <ToggleRow
            label="Active"
            description="Tenants can be placed on this plan."
            icon={CheckCircle2}
            checked={draft.is_active}
            onChange={(v) => set("is_active", v)}
            disabled={plan.code === "internal" && draft.is_active === true}
            disabledHint={plan.code === "internal" ? "Internal plan is always active." : undefined}
          />
          <ToggleRow
            label="Public"
            description="Visible on the marketing pricing page."
            icon={draft.is_public ? Eye : EyeOff}
            checked={draft.is_public}
            onChange={(v) => set("is_public", v)}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "border-t flex items-center justify-between gap-3 px-5 py-3",
          dirty
            ? "border-indigo-500/20 bg-indigo-500/5"
            : "border-white/5 bg-white/[0.015]",
        )}
      >
        <div className="text-xs text-zinc-400 inline-flex items-center gap-2">
          {dirty ? (
            <>
              <CircleDot className="h-3 w-3 text-indigo-300" />
              <span>Unsaved changes in {Object.keys(payload).length} field(s).</span>
            </>
          ) : (
            <span className="text-zinc-500">No changes.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={!dirty || mutation.isPending}
            onClick={onReset}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          <Button
            size="sm"
            disabled={!dirty || mutation.isPending}
            onClick={onSave}
            className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save plan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

type Draft = {
  name: string;
  description: string;
  price_inr_month: number | "";
  price_inr_year: number | "";
  price_usd_month: number | "";
  price_usd_year: number | "";
  razorpay_plan_id_month: string;
  razorpay_plan_id_year: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
};

// ---------------------------------------------------------------------------
// Small UI bits
// ---------------------------------------------------------------------------
const Field: React.FC<{
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, error, hint, children }) => (
  <div>
    <Label className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</Label>
    <div className="mt-1">{children}</div>
    {error ? (
      <div className="mt-1 text-[11px] text-rose-400">{error}</div>
    ) : hint ? (
      <div className="mt-1 text-[11px] text-zinc-500">{hint}</div>
    ) : null}
  </div>
);

const PriceField: React.FC<{
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  error?: string;
  currency: string;
  hint?: React.ReactNode;
}> = ({ label, value, onChange, error, currency, hint }) => (
  <Field label={label} error={error} hint={hint}>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{currency}</span>
      <Input
        type="number"
        value={value === "" ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? "" : Number(raw));
        }}
        placeholder="empty = custom"
        className="pl-7 bg-black/30 border-white/10 font-mono"
        min={0}
      />
    </div>
  </Field>
);

const ToggleRow: React.FC<{
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
}> = ({ label, description, icon: Icon, checked, onChange, disabled, disabledHint }) => (
  <div
    className={cn(
      "rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 flex items-center justify-between gap-3",
      disabled && "opacity-70",
    )}
    title={disabled ? disabledHint : undefined}
  >
    <div className="min-w-0">
      <div className="text-sm text-zinc-100 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        {label}
      </div>
      <div className="text-[11px] text-zinc-500 truncate">{description}</div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const ReadinessDot: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span
    title={`${label}: ${ok ? "set" : "not set"}`}
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
      ok
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-300",
    )}
  >
    <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
    {label.startsWith("Monthly") ? "mo" : "yr"}
  </span>
);

const yearlyDiscountHint = (monthly: number, yearly: number): React.ReactNode => {
  if (!monthly || !yearly) return null;
  const yearlyEquivalent = monthly * 12;
  const savings = yearlyEquivalent - yearly;
  if (savings <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-300/80">
        <AlertTriangle className="h-3 w-3" />
        No discount vs. monthly × 12.
      </span>
    );
  }
  const pct = Math.round((savings / yearlyEquivalent) * 100);
  return (
    <span className="text-emerald-300/80">
      Saves {inr.format(savings)} vs. monthly ({pct}% off).
    </span>
  );
};

// Copy-button reused if needed later (not currently referenced in this page).
export const CopyInline: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-auto text-zinc-500 hover:text-zinc-200"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};
