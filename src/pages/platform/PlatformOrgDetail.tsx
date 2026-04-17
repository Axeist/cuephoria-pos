/**
 * /platform/organizations/:id — single-tenant deep view.
 *
 * Four tabs:
 *   Overview  : identity, status, key stats, inline edit of editable fields
 *   Plan      : current subscription, plan switcher, plan matrix
 *   Members   : list of admin users mapped to this org
 *   Activity  : audit-log feed scoped to this org
 *
 * All mutations invalidate `["platform"]` React-Query keys so the dashboard
 * stays in sync after returning from detail.
 */

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Play,
  ShieldCheck,
  Skull,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PlatformInviteOwnerDialog } from "@/components/platform/PlatformInviteOwnerDialog";
import { UserPlus, Trash2, Palette, RefreshCcw, Image as ImageIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DetailResponse = {
  ok: true;
  organization: {
    id: string;
    slug: string;
    name: string;
    legal_name: string | null;
    country: string;
    currency: string;
    timezone: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "suspended";
    is_internal: boolean;
    trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
  };
  subscription: {
    id: string;
    plan_id: string;
    provider: string;
    status: string;
    interval: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_ends_at: string | null;
    created_at: string;
  } | null;
  plan: Plan | null;
  plans: Plan[];
  currentFeatures: Record<string, unknown>;
  locations: Array<{
    id: string;
    name: string;
    slug: string;
    short_code: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
  }>;
  members: Array<{
    membershipId: string;
    role: string;
    joinedAt: string;
    adminUserId: string;
    username: string | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }>;
  activity: Array<AuditEntry>;
  usage: { stations: number; customers: number; branches: number };
};

type Plan = {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  sort_order: number;
  is_active: boolean;
};

type AuditEntry = {
  id: string;
  actor_type: string;
  actor_label: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  trialing: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  past_due: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  canceled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  suspended: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const relative = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
};

const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw Object.assign(new Error(json?.error || `Request failed (${res.status})`), { payload: json });
  return json as T;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const PlatformOrgDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const detailQuery = useQuery({
    queryKey: ["platform", "organization", id],
    queryFn: () => fetcher<DetailResponse>(`/api/platform/organization?id=${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
    staleTime: 20_000,
  });

  const invalidateAll = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["platform"] });
  }, [queryClient]);

  if (!id) return <Navigate />;

  if (detailQuery.isLoading) return <DetailSkeleton />;
  if (detailQuery.isError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4" />
          Couldn't load organization
        </div>
        <p className="mt-2 text-xs text-rose-200/70">{(detailQuery.error as Error).message}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 text-rose-200"
          onClick={() => navigate("/platform/organizations")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to organizations
        </Button>
      </div>
    );
  }

  const data = detailQuery.data!;
  const { organization: org, subscription, plan, plans, members, locations, activity, usage, currentFeatures } = data;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <button
            onClick={() => navigate("/platform/organizations")}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All organizations
          </button>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/40 to-cyan-500/40 grid place-items-center text-sm font-bold text-white/90">
              {org.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-zinc-50 tracking-tight">{org.name}</h1>
                {org.is_internal && (
                  <Badge variant="outline" className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400 text-[10px] uppercase tracking-wider">
                    internal
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500 flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span className="font-mono">/app/t/{org.slug}</span>
                <span>·</span>
                <span>{org.country}</span>
                <span>·</span>
                <span>{org.timezone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("border text-xs", statusStyles[org.status])}>
            {org.status.replace("_", " ")}
          </Badge>
          <ActionBar org={org} subscription={subscription} onDone={invalidateAll} />
        </div>
      </motion.div>

      {/* At-a-glance tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlanceTile icon={Sparkles} label="Plan" value={plan?.name ?? "—"} accent="indigo" />
        <GlanceTile icon={MapPin} label="Branches" value={`${usage.branches}`} sub={`${locations.length} total`} accent="cyan" />
        <GlanceTile icon={Zap} label="Stations" value={`${usage.stations}`} accent="emerald" />
        <GlanceTile icon={UserRound} label="Members" value={`${members.length}`} accent="amber" />
      </section>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Plan
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Members
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Branding
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            org={org}
            subscription={subscription}
            plan={plan}
            locations={locations}
            currentFeatures={currentFeatures}
            onSaved={() => {
              invalidateAll();
              toast({ title: "Organization updated", description: "Changes are live for this tenant." });
            }}
          />
        </TabsContent>

        <TabsContent value="plan">
          <PlanTab
            org={org}
            subscription={subscription}
            currentPlan={plan}
            plans={plans}
            currentFeatures={currentFeatures}
            onChanged={() => {
              invalidateAll();
              toast({ title: "Plan updated" });
            }}
          />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab
            orgId={org.id}
            orgName={org.name}
            orgSlug={org.slug}
            members={members}
            canInvite={!org.is_internal}
            onMutated={invalidateAll}
          />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingTab
            orgId={org.id}
            orgName={org.name}
            orgIsInternal={org.is_internal}
            onSaved={() => {
              invalidateAll();
              toast({ title: "Branding saved" });
            }}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab orgId={org.id} seed={activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformOrgDetail;

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
const Navigate: React.FC = () => {
  React.useEffect(() => {
    window.location.replace("/platform/organizations");
  }, []);
  return null;
};

const DetailSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-64 bg-white/5" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 bg-white/5" />
      ))}
    </div>
    <Skeleton className="h-64 w-full bg-white/5" />
  </div>
);

const GlanceTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: "indigo" | "emerald" | "amber" | "rose" | "cyan";
}> = ({ icon: Icon, label, value, sub, accent }) => {
  const tone = {
    indigo: "text-indigo-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    cyan: "text-cyan-300",
  }[accent];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</span>
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <div className="mt-2 text-xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Action bar (suspend/reactivate/end-trial)
// ---------------------------------------------------------------------------
const ActionBar: React.FC<{
  org: DetailResponse["organization"];
  subscription: DetailResponse["subscription"];
  onDone: () => void;
}> = ({ org, subscription, onDone }) => {
  const { toast } = useToast();
  const [confirmSuspend, setConfirmSuspend] = React.useState(false);
  const [extendOpen, setExtendOpen] = React.useState(false);

  const run = async (action: string, body?: Record<string, unknown>) => {
    try {
      await fetcher(`/api/platform/organization-action?id=${org.id}&action=${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      toast({ title: `Action: ${action}`, description: "Completed successfully." });
      onDone();
    } catch (err) {
      toast({
        title: "Action failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const isSuspended = org.status === "suspended";
  const isTrialing = subscription?.status === "trialing";

  return (
    <>
      <div className="flex items-center gap-2">
        {isSuspended ? (
          <Button
            size="sm"
            className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30"
            onClick={() => run("reactivate")}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Reactivate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
            disabled={org.is_internal}
            title={org.is_internal ? "Internal organizations can't be suspended" : undefined}
            onClick={() => setConfirmSuspend(true)}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Suspend
          </Button>
        )}
        {isTrialing && !isSuspended && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
              onClick={() => setExtendOpen(true)}
            >
              <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
              Extend trial
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
              onClick={() => run("end-trial")}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              End trial
            </Button>
          </>
        )}
      </div>

      <ExtendTrialDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        org={org}
        subscription={subscription}
        onExtended={onDone}
      />

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent className="bg-[#0b0b14] border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {org.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Staff signing in with this tenant's admin users will be blocked until reactivated.
              No data is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                setConfirmSuspend(false);
                run("suspend");
              }}
            >
              Suspend tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
const OverviewTab: React.FC<{
  org: DetailResponse["organization"];
  subscription: DetailResponse["subscription"];
  plan: Plan | null;
  locations: DetailResponse["locations"];
  currentFeatures: Record<string, unknown>;
  onSaved: () => void;
}> = ({ org, subscription, locations, onSaved }) => {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(org.name);
  const [legalName, setLegalName] = React.useState(org.legal_name ?? "");
  const [country, setCountry] = React.useState(org.country);
  const [currency, setCurrency] = React.useState(org.currency);
  const [timezone, setTimezone] = React.useState(org.timezone);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () =>
      fetcher<{ ok: true; organization: DetailResponse["organization"] }>(
        `/api/platform/organization?id=${org.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            legalName: legalName.trim() || null,
            country,
            currency,
            timezone,
          }),
        },
      ),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const reset = () => {
    setName(org.name);
    setLegalName(org.legal_name ?? "");
    setCountry(org.country);
    setCurrency(org.currency);
    setTimezone(org.timezone);
    setError(null);
    setEditing(false);
  };

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Identity</div>
            <div className="text-xs text-zinc-500">Visible to all staff of this tenant.</div>
          </div>
          {!editing ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-300 hover:text-white hover:bg-white/5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-zinc-400" onClick={reset} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <Field label="Display name" editing={editing} value={name} onChange={setName} readValue={org.name} />
          <Field
            label="Legal entity"
            editing={editing}
            value={legalName}
            onChange={setLegalName}
            readValue={org.legal_name || "—"}
            placeholder="Optional"
          />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Country" editing={editing} value={country} onChange={(v) => setCountry(v.toUpperCase().slice(0, 2))} readValue={org.country} maxLength={2} />
            <Field label="Currency" editing={editing} value={currency} onChange={(v) => setCurrency(v.toUpperCase().slice(0, 3))} readValue={org.currency} maxLength={3} />
            <Field label="Timezone" editing={editing} value={timezone} onChange={setTimezone} readValue={org.timezone} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-zinc-500">Slug (immutable)</Label>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-white/5 bg-black/30 px-3 py-2 text-sm font-mono text-zinc-200">
              <span>/app/t/{org.slug}</span>
              <CopyButton text={`/app/t/${org.slug}`} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-zinc-100">Lifecycle</div>
          <dl className="mt-3 space-y-2.5 text-xs">
            <Row k="Created" v={fmtDate(org.created_at)} />
            <Row k="Updated" v={`${relative(org.updated_at)} (${fmtDate(org.updated_at)})`} />
            <Row k="Trial ends" v={org.trial_ends_at ? fmtDate(org.trial_ends_at) : "—"} />
            <Row k="Provider" v={subscription?.provider ?? "—"} />
            <Row k="Billing cycle" v={subscription?.interval ?? "—"} />
          </dl>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-100">Branches</div>
            <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400">
              {locations.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-2">
            {locations.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-md border border-white/5 bg-black/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 truncate">{l.name}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {l.short_code} · {l.slug}
                  </div>
                </div>
                {!l.is_active && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px]">
                    inactive
                  </Badge>
                )}
              </div>
            ))}
            {locations.length === 0 && (
              <div className="text-xs text-zinc-500">No branches attached yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Danger zone lives inside the Overview tab, below the primary cards. */}
    <DangerZone org={org} onDeleted={onSaved} />
    </div>
  );
};

const Field: React.FC<{
  label: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  readValue: React.ReactNode;
  placeholder?: string;
  maxLength?: number;
}> = ({ label, editing, value, onChange, readValue, placeholder, maxLength }) => (
  <div>
    <Label className="text-xs uppercase tracking-wider text-zinc-500">{label}</Label>
    {editing ? (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 bg-black/40 border-white/10"
        placeholder={placeholder}
        maxLength={maxLength}
      />
    ) : (
      <div className="mt-1 text-sm text-zinc-100">{readValue}</div>
    )}
  </div>
);

const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-zinc-500">{k}</dt>
    <dd className="text-zinc-200 text-right truncate">{v}</dd>
  </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
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
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Plan tab
// ---------------------------------------------------------------------------
const PlanTab: React.FC<{
  org: DetailResponse["organization"];
  subscription: DetailResponse["subscription"];
  currentPlan: Plan | null;
  plans: Plan[];
  currentFeatures: Record<string, unknown>;
  onChanged: () => void;
}> = ({ org, subscription, currentPlan, plans, onChanged }) => {
  const { toast } = useToast();
  const [pendingCode, setPendingCode] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[] | null>(null);
  const [confirmingPlan, setConfirmingPlan] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const apply = async (code: string, confirm = false) => {
    setPending(true);
    try {
      const res = await fetch(`/api/platform/organization-action?id=${org.id}&action=change-plan`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode: code, confirm }),
      });
      const json = await res.json();
      if (res.status === 409 && json?.warnings) {
        setWarnings(json.warnings);
        setConfirmingPlan(code);
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      toast({ title: "Plan changed", description: `Now on ${code}.` });
      setPendingCode(null);
      setWarnings(null);
      setConfirmingPlan(null);
      onChanged();
    } catch (err) {
      toast({ title: "Plan change failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const selectablePlans = plans.filter((p) => p.is_active && p.code !== "internal");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Current subscription</div>
            <div className="mt-1 text-xs text-zinc-500">
              {subscription ? `Status: ${subscription.status} · ${subscription.provider}` : "No subscription row — change plan to create one."}
            </div>
          </div>
          {currentPlan && (
            <div className="text-right">
              <div className="text-xl font-semibold text-zinc-100">{currentPlan.name}</div>
              <div className="text-xs text-zinc-500">
                {currentPlan.price_inr_month ? `${inr.format(currentPlan.price_inr_month)}/mo` : "Custom"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {selectablePlans.map((p) => {
          const isCurrent = currentPlan?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => !isCurrent && setPendingCode(p.code)}
              disabled={isCurrent}
              className={cn(
                "text-left rounded-xl border p-4 transition-all group relative",
                isCurrent
                  ? "border-emerald-500/40 bg-emerald-500/5 cursor-default"
                  : "border-white/10 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-500/5",
              )}
            >
              {isCurrent && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-0.5">
                  <ShieldCheck className="h-3 w-3" />
                  current
                </span>
              )}
              <div className="text-sm font-semibold text-zinc-100">{p.name}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{p.code}</div>
              <div className="mt-3 text-lg font-semibold text-zinc-50">
                {p.price_inr_month ? inr.format(p.price_inr_month) : "Custom"}
                <span className="text-xs text-zinc-500 font-normal"> /mo</span>
              </div>
              {!isCurrent && (
                <div className="mt-3 text-[11px] text-indigo-300 opacity-70 group-hover:opacity-100">
                  Click to switch
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm modal for plain switch */}
      <AlertDialog open={Boolean(pendingCode) && !confirmingPlan} onOpenChange={(v) => !v && !pending && setPendingCode(null)}>
        <AlertDialogContent className="bg-[#0b0b14] border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch {org.name} to {pendingCode}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              The tenant will see the new limits immediately. Billing provider is unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-90"
              onClick={() => pendingCode && apply(pendingCode, false)}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Switch plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm override for downgrades that exceed usage */}
      <AlertDialog open={Boolean(confirmingPlan)} onOpenChange={(v) => !v && !pending && (setConfirmingPlan(null), setWarnings(null))}>
        <AlertDialogContent className="bg-[#0b0b14] border-white/10 text-zinc-100 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              This downgrade exceeds current usage
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              The tenant will keep running today, but new limits are lower than what they currently consume.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(warnings ?? []).map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-amber-950"
              onClick={() => confirmingPlan && apply(confirmingPlan, true)}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Downgrade anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Members tab
// ---------------------------------------------------------------------------
const MembersTab: React.FC<{
  orgId: string;
  orgName: string;
  orgSlug: string;
  members: DetailResponse["members"];
  canInvite: boolean;
  onMutated: () => void;
}> = ({ orgId, orgName, orgSlug, members, canInvite, onMutated }) => {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<DetailResponse["members"][number] | null>(null);
  const [removing, setRemoving] = React.useState(false);

  const doRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/platform/organization-member?orgId=${orgId}&membershipId=${removeTarget.membershipId}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      toast({ title: "Member removed", description: `${removeTarget.username ?? "Member"} is no longer part of ${orgName}.` });
      setRemoveTarget(null);
      onMutated();
    } catch (err) {
      toast({
        title: "Couldn't remove member",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Members</div>
            <div className="text-xs text-zinc-500">Admins and staff mapped to this tenant.</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400">
              {members.length}
            </Badge>
            {canInvite && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Invite owner
              </Button>
            )}
          </div>
        </div>

        {members.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="h-8 w-8 mx-auto text-zinc-600" />
            <div className="mt-3 text-sm text-zinc-300">No members yet</div>
            <div className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
              {canInvite
                ? "Invite the first owner so this workspace has a login."
                : "Manage internal staff from inside the tenant app."}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m) => (
              <div key={m.membershipId} className="flex items-center justify-between gap-3 px-5 py-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 grid place-items-center text-xs font-semibold text-white/90">
                    {m.username?.substring(0, 2).toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100 flex items-center gap-2">
                      {m.username ?? "unknown"}
                      {m.isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 px-1.5 py-0.5">
                          <Crown className="h-2.5 w-2.5" />
                          super
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500">role: {m.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-zinc-500 inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    joined {relative(m.joinedAt)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                    onClick={() => setRemoveTarget(m)}
                    title="Remove from workspace"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlatformInviteOwnerDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        orgId={orgId}
        orgName={orgName}
        orgSlug={orgSlug}
        onInvited={onMutated}
      />

      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(v) => !v && !removing && setRemoveTarget(null)}>
        <AlertDialogContent className="bg-[#0b0b14] border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.username} from {orgName}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              They'll lose access to this workspace immediately. Their admin user row is kept;
              they can be re-added later. If they're the only owner, removal is blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300" disabled={removing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={doRemove}
              disabled={removing}
            >
              {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ---------------------------------------------------------------------------
// Branding tab (platform override)
// ---------------------------------------------------------------------------
type BrandingState = {
  display_name: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  icon_url: string;
};

const emptyBrandingState: BrandingState = {
  display_name: "",
  tagline: "",
  primary_color: "",
  accent_color: "",
  logo_url: "",
  icon_url: "",
};

const PLATFORM_HEX_RE = /^#[0-9a-f]{6}$/i;
const PLATFORM_HTTPS_RE = /^https:\/\//i;

const BrandingTab: React.FC<{
  orgId: string;
  orgName: string;
  orgIsInternal: boolean;
  onSaved: () => void;
}> = ({ orgId, orgName, orgIsInternal, onSaved }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["platform", "organization-branding", orgId],
    queryFn: () =>
      fetcher<{ ok: true; branding: Partial<BrandingState>; organization: { is_internal: boolean } }>(
        `/api/platform/organization-branding?id=${orgId}`,
      ),
    staleTime: 30_000,
  });

  const [form, setForm] = React.useState<BrandingState>(emptyBrandingState);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);

  React.useEffect(() => {
    if (query.data) {
      const b = query.data.branding || {};
      setForm({
        display_name: b.display_name ?? "",
        tagline: b.tagline ?? "",
        primary_color: b.primary_color ?? "",
        accent_color: b.accent_color ?? "",
        logo_url: b.logo_url ?? "",
        icon_url: b.icon_url ?? "",
      });
    }
  }, [query.data]);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.display_name && form.display_name.length > 120) errs.display_name = "Max 120 characters.";
    if (form.tagline && form.tagline.length > 160) errs.tagline = "Max 160 characters.";
    if (form.primary_color && !PLATFORM_HEX_RE.test(form.primary_color))
      errs.primary_color = "Use #rrggbb.";
    if (form.accent_color && !PLATFORM_HEX_RE.test(form.accent_color))
      errs.accent_color = "Use #rrggbb.";
    if (form.logo_url && !PLATFORM_HTTPS_RE.test(form.logo_url)) errs.logo_url = "Must be https://.";
    if (form.icon_url && !PLATFORM_HTTPS_RE.test(form.icon_url)) errs.icon_url = "Must be https://.";
    return errs;
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | null> = {};
      (Object.keys(form) as (keyof BrandingState)[]).forEach((k) => {
        const v = form[k].trim();
        payload[k] = v.length === 0 ? null : v;
      });
      return fetcher<{ ok: true; branding: Partial<BrandingState> }>(
        `/api/platform/organization-branding?id=${orgId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      setFieldErrors({});
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ["platform", "organization-branding", orgId] });
      queryClient.invalidateQueries({ queryKey: ["public", "workspace"] });
      onSaved();
    },
    onError: (err: Error) => setSubmitError(err.message),
  });

  const resetMut = useMutation({
    mutationFn: () =>
      fetcher<{ ok: true }>(`/api/platform/organization-branding?id=${orgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          orgIsInternal
            ? { reset: true, confirmInternalReset: true }
            : { reset: true },
        ),
      }),
    onSuccess: () => {
      setConfirmReset(false);
      setForm(emptyBrandingState);
      queryClient.invalidateQueries({ queryKey: ["platform", "organization-branding", orgId] });
      queryClient.invalidateQueries({ queryKey: ["public", "workspace"] });
      toast({ title: "Branding reset to Cuetronix defaults" });
      onSaved();
    },
    onError: (err: Error) => toast({ title: "Reset failed", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    save.mutate();
  };

  const primaryPreview = PLATFORM_HEX_RE.test(form.primary_color) ? form.primary_color : "#6366f1";
  const accentPreview = PLATFORM_HEX_RE.test(form.accent_color) ? form.accent_color : primaryPreview;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-300" />
            <div className="text-sm font-semibold text-zinc-100">Branding override</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              onClick={() => setConfirmReset(true)}
              disabled={resetMut.isPending || query.isLoading}
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to Cuetronix defaults
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
              onClick={handleSave}
              disabled={save.isPending || query.isLoading}
            >
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div
          className="rounded-xl overflow-hidden border border-white/10 mb-5"
          style={{ background: `linear-gradient(135deg, ${primaryPreview}, ${accentPreview})` }}
        >
          <div className="p-5 flex items-center gap-4 text-white">
            <div className="h-12 w-12 rounded-xl bg-white/15 grid place-items-center overflow-hidden backdrop-blur">
              {form.logo_url && PLATFORM_HTTPS_RE.test(form.logo_url) ? (
                <img
                  src={form.logo_url}
                  alt=""
                  className="h-full w-full object-contain p-1.5"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {form.display_name || orgName}
              </div>
              {form.tagline && (
                <div className="text-xs text-white/80 truncate">{form.tagline}</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-zinc-500">Display name</Label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              className="mt-1 bg-black/30 border-white/10"
              maxLength={120}
            />
            {fieldErrors.display_name && <div className="mt-1 text-[11px] text-rose-400">{fieldErrors.display_name}</div>}
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Tagline</Label>
            <Input
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className="mt-1 bg-black/30 border-white/10"
              maxLength={160}
            />
            {fieldErrors.tagline && <div className="mt-1 text-[11px] text-rose-400">{fieldErrors.tagline}</div>}
          </div>

          <PlatformColorPicker
            label="Primary color"
            value={form.primary_color}
            onChange={(v) => setForm((f) => ({ ...f, primary_color: v }))}
            error={fieldErrors.primary_color}
          />
          <PlatformColorPicker
            label="Accent color"
            value={form.accent_color}
            onChange={(v) => setForm((f) => ({ ...f, accent_color: v }))}
            error={fieldErrors.accent_color}
          />

          <div>
            <Label className="text-xs text-zinc-500">Logo URL</Label>
            <Input
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              className="mt-1 bg-black/30 border-white/10 font-mono text-sm"
              placeholder="https://…"
            />
            {fieldErrors.logo_url && <div className="mt-1 text-[11px] text-rose-400">{fieldErrors.logo_url}</div>}
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Icon URL</Label>
            <Input
              value={form.icon_url}
              onChange={(e) => setForm((f) => ({ ...f, icon_url: e.target.value }))}
              className="mt-1 bg-black/30 border-white/10 font-mono text-sm"
              placeholder="https://…"
            />
            {fieldErrors.icon_url && <div className="mt-1 text-[11px] text-rose-400">{fieldErrors.icon_url}</div>}
          </div>
        </div>

        {submitError && (
          <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {orgIsInternal && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              This is the internal Cuephoria organization. Reset is gated behind an explicit confirm
              to prevent accidental wipes of live branding.
            </span>
          </div>
        )}
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset branding?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears this tenant's display name, tagline, colors, logo and icon. The default
              Cuetronix theme will apply until someone sets overrides again.
              {orgIsInternal && " Because this is the internal org, the action is also audited."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                resetMut.mutate();
              }}
              disabled={resetMut.isPending}
            >
              {resetMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const PlatformColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}> = ({ label, value, onChange, error }) => {
  const safe = PLATFORM_HEX_RE.test(value) ? value : "#6366f1";
  return (
    <div>
      <Label className="text-xs text-zinc-500">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-9 w-12 rounded border border-white/10 bg-black/40 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-black/30 border-white/10 font-mono"
          placeholder="#7c3aed"
          maxLength={7}
        />
      </div>
      {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------
const ActivityTab: React.FC<{ orgId: string; seed: AuditEntry[] }> = ({ orgId, seed }) => {
  const query = useQuery({
    queryKey: ["platform", "audit", "org", orgId],
    queryFn: () => fetcher<{ ok: true; entries: AuditEntry[] }>(`/api/platform/audit?org=${orgId}&limit=100`),
    initialData: { ok: true, entries: seed },
    refetchOnMount: true,
  });

  const entries = query.data?.entries ?? [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="text-sm font-semibold text-zinc-100">Activity</div>
        <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400">
          {entries.length}
        </Badge>
      </div>
      {entries.length === 0 ? (
        <div className="p-10 text-center text-sm text-zinc-500">No events yet for this tenant.</div>
      ) : (
        <ol className="divide-y divide-white/5">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-3 flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-zinc-200">{e.action}</span>
                  <span className="text-[11px] rounded-full border border-white/10 bg-white/5 text-zinc-400 px-1.5 py-0.5">
                    {e.actor_type}
                  </span>
                  <span className="text-xs text-zinc-500">{e.actor_label}</span>
                </div>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <pre className="mt-1 text-[11px] text-zinc-500 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(e.meta, null, 0)}
                  </pre>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 whitespace-nowrap">
                {relative(e.created_at)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Extend-trial dialog
// ---------------------------------------------------------------------------
const EXTEND_PRESETS = [7, 14, 30];

const ExtendTrialDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  org: DetailResponse["organization"];
  subscription: DetailResponse["subscription"];
  onExtended: () => void;
}> = ({ open, onOpenChange, org, subscription, onExtended }) => {
  const { toast } = useToast();
  const [days, setDays] = React.useState<number>(14);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) setDays(14);
  }, [open]);

  const currentEndsAt = subscription?.trial_ends_at || org.trial_ends_at;
  const baseTime = currentEndsAt
    ? Math.max(new Date(currentEndsAt).getTime(), Date.now())
    : Date.now();
  const projected = new Date(baseTime + days * 24 * 60 * 60 * 1000);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetcher(`/api/platform/organization-action?id=${org.id}&action=extend-trial`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days }),
      });
      toast({
        title: "Trial extended",
        description: `New end date: ${projected.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}.`,
      });
      onOpenChange(false);
      onExtended();
    } catch (err) {
      toast({
        title: "Couldn't extend trial",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <AlertDialogContent className="bg-[#0b0b14] border-white/10 text-zinc-100">
        <AlertDialogHeader>
          <AlertDialogTitle>Extend trial for {org.name}</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            Adds days to the later of today or the current trial end date, so extensions
            never accidentally land in the past.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">Current end</div>
            <div className="text-sm text-zinc-200">{currentEndsAt ? fmtDate(currentEndsAt) : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">Add</div>
            <div className="flex items-center gap-2 flex-wrap">
              {EXTEND_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    days === n
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
                  )}
                >
                  +{n} days
                </button>
              ))}
              <div className="relative">
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value || 0))))}
                  className="w-24 bg-black/30 border-white/10 h-8 text-sm"
                  min={1}
                  max={365}
                />
              </div>
              <span className="text-xs text-zinc-500">days</span>
            </div>
          </div>
          <div className="rounded-md border border-white/5 bg-black/30 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Projected end</div>
            <div className="text-sm text-emerald-300 font-medium">{fmtDate(projected.toISOString())}</div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300" disabled={submitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-500 hover:bg-amber-600 text-amber-950"
            onClick={(e) => {
              e.preventDefault();
              void submit();
            }}
            disabled={submitting || days < 1 || days > 365}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Extend by ${days} day${days === 1 ? "" : "s"}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ---------------------------------------------------------------------------
// Danger zone — hard-delete a tenant. Requires typing the slug to confirm.
// ---------------------------------------------------------------------------
const DangerZone: React.FC<{
  org: DetailResponse["organization"];
  onDeleted: () => void;
}> = ({ org, onDeleted }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTyped("");
      setServerError(null);
    }
  }, [open]);

  const disabled = org.is_internal;
  const slugMatches = typed.trim() === org.slug;

  const submit = async () => {
    if (submitting || !slugMatches) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/platform/organization-delete?id=${org.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmSlug: typed.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      const counts = (json.counts || {}) as Record<string, number>;
      const total =
        (counts.bills ?? 0) +
        (counts.bill_items ?? 0) +
        (counts.bookings ?? 0) +
        (counts.sessions ?? 0) +
        (counts.customers ?? 0);
      toast({
        title: `${org.name} deleted`,
        description: `Cleared ${counts.locations ?? 0} branch(es), ${counts.stations ?? 0} station(s), ${total} operational record(s).`,
      });
      setOpen(false);
      // Blow the platform cache and bounce back to the org list.
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onDeleted();
      navigate("/platform/organizations", { replace: true });
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/30 grid place-items-center shrink-0">
              <Skull className="h-4 w-4 text-rose-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-rose-200">Danger zone</div>
              <div className="mt-1 text-xs text-rose-200/70 max-w-prose">
                Permanently deletes this tenant and all of its operational data — branches,
                stations, products, customers, bills, bookings, sessions, memberships,
                subscription, and invoices. Audit rows are kept (organization pointer cleared).
                This cannot be undone.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25"
            disabled={disabled}
            title={disabled ? "Internal organizations can't be deleted." : undefined}
            onClick={() => setOpen(true)}
          >
            <Skull className="h-3.5 w-3.5 mr-1.5" />
            Delete organization
          </Button>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <AlertDialogContent className="bg-[#0b0b14] border-rose-500/30 text-zinc-100 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              Delete {org.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Type the org slug{" "}
              <span className="font-mono text-rose-200">{org.slug}</span>{" "}
              below to confirm. Everything tied to this tenant will be wiped.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 pt-1">
            <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
              <li>All branches, stations, products, categories</li>
              <li>All customers, bills, bookings, sessions</li>
              <li>Subscription, invoices, memberships</li>
              <li>Admin user rows are <em>not</em> deleted — they stay reusable</li>
            </ul>
            <div>
              <Label className="text-xs uppercase tracking-wider text-zinc-500">
                Type <span className="font-mono text-rose-300">{org.slug}</span> to confirm
              </Label>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1 bg-black/40 border-rose-500/30 font-mono"
                placeholder={org.slug}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={submitting}
              />
            </div>
            {serverError && (
              <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600 text-white"
              disabled={!slugMatches || submitting}
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Skull className="h-3.5 w-3.5 mr-1.5" />
                  Delete forever
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
