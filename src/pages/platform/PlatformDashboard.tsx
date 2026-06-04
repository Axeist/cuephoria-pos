/**
 * /platform — Cuetronix operator overview.
 *
 * Stats row + organizations table. All reads go through the platform API
 * surface; no direct Supabase calls from the client.
 */

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  Sparkles,
  Wallet,
  CircleDot,
  AlertTriangle,
  UserRound,
  MapPin,
  Clock,
  Search,
  SlidersHorizontal,
  Plus,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlatformCreateOrgDialog } from "@/components/platform/PlatformCreateOrgDialog";
import { useToast } from "@/hooks/use-toast";

type PlatformStats = {
  totalOrgs: number;
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  suspended: number;
  internal: number;
  newOrgsLast7Days: number;
  mrrInr: number;
  payingOrgs: number;
};

type PasswordMigrationStatus = {
  total: number;
  hashed: number;
  plaintextRemaining: number;
  migratedPct: number;
};

type BackdoorWorkspace = {
  organizationId: string;
  orgSlug: string;
  orgName: string;
  username: string;
  password: string;
  loginUrl: string;
  createdAt: string;
};

type OrgRow = {
  id: string;
  slug: string;
  name: string;
  country: string;
  currency: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "suspended";
  is_internal: boolean;
  created_at: string;
  trial_ends_at: string | null;
  locationCount: number;
  memberCount: number;
  subscription: {
    planCode: string | null;
    planName: string | null;
    status: string;
    provider: string;
    interval: string;
  } | null;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const relative = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

/**
 * Animates integer count-up. Caches last value so we only animate when the
 * number actually moves (avoids replaying on every refetch-with-same-data).
 */
const useCountUp = (target: number, durationMs = 650): number => {
  const [value, setValue] = React.useState(target);
  const previousTargetRef = React.useRef(target);

  React.useEffect(() => {
    const from = previousTargetRef.current;
    const to = target;
    if (from === to) return;
    previousTargetRef.current = to;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setValue(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
};

const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string }> = ({ value, format }) => {
  const n = useCountUp(value);
  return <>{format ? format(n) : n.toLocaleString()}</>;
};

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  numeric?: number;
  formatNumeric?: (n: number) => string;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "cyan";
  loading?: boolean;
}> = ({ label, value, numeric, formatNumeric, sub, icon: Icon, accent = "indigo", loading }) => {
  const accentRing = {
    indigo: "from-indigo-500/20 to-indigo-500/0",
    emerald: "from-emerald-500/20 to-emerald-500/0",
    amber: "from-amber-500/20 to-amber-500/0",
    rose: "from-rose-500/20 to-rose-500/0",
    cyan: "from-cyan-500/20 to-cyan-500/0",
  }[accent];
  const iconColor = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    cyan: "text-cyan-400",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5",
        "hover:border-white/20 hover:bg-white/[0.04] transition-colors",
      )}
    >
      <div className={cn("absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl", accentRing)} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</div>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-2 bg-white/10" />
          ) : (
            <div className="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">
              {typeof numeric === "number" ? <AnimatedNumber value={numeric} format={formatNumeric} /> : value}
            </div>
          )}
          {sub && !loading && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
        </div>
        <div className={cn("rounded-xl bg-white/5 p-2", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
};

const planBadgeStyles: Record<string, string> = {
  internal: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
  starter: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  growth: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  pro: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
  enterprise: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  trialing: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  past_due: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  canceled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  suspended: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

const PlatformDashboard: React.FC = () => {
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => fetcher<{ ok: true; stats: PlatformStats }>("/api/platform/stats"),
    staleTime: 60_000,
  });

  const pwdMigrationQuery = useQuery({
    queryKey: ["platform", "password-migration-status"],
    queryFn: () =>
      fetcher<{ ok: true; status: PasswordMigrationStatus }>(
        "/api/platform/password-migration-status",
      ),
    staleTime: 5 * 60_000,
  });

  const billingSettingsQuery = useQuery({
    queryKey: ["platform", "billing-settings"],
    queryFn: () =>
      fetcher<{ ok: true; billingAccessGraceMinutes: number }>("/api/platform/settings"),
    staleTime: 60_000,
  });

  const [graceDraft, setGraceDraft] = React.useState("");
  React.useEffect(() => {
    const m = billingSettingsQuery.data?.billingAccessGraceMinutes;
    if (typeof m === "number" && Number.isFinite(m)) setGraceDraft(String(m));
  }, [billingSettingsQuery.data?.billingAccessGraceMinutes]);

  const saveBillingGrace = useMutation({
    mutationFn: async (billingAccessGraceMinutes: number) => {
      const res = await fetch("/api/platform/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ billingAccessGraceMinutes }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        billingAccessGraceMinutes?: number;
      };
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Save failed.");
      return json;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["platform", "billing-settings"] });
      toast({
        title: "Fleet billing grace updated",
        description: "Tenant Subscription gates pick this up within a minute.",
      });
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: "Could not save", description: e.message }),
  });

  const orgParams = React.useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter !== "all") p.set("status", statusFilter);
    return p.toString();
  }, [statusFilter]);

  const [showBackdoorPasswords, setShowBackdoorPasswords] = React.useState(false);
  const [backdoorFilter, setBackdoorFilter] = React.useState("");

  const backdoorQuery = useQuery({
    queryKey: ["platform", "backdoor-access"],
    queryFn: () =>
      fetcher<{ ok: true; provisioned: number; workspaces: BackdoorWorkspace[] }>(
        "/api/platform/backdoor-access?provisionMissing=1",
      ),
    staleTime: 120_000,
  });

  const filteredBackdoor = React.useMemo(() => {
    const list = backdoorQuery.data?.workspaces ?? [];
    const needle = backdoorFilter.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((w) =>
      [w.orgName, w.orgSlug, w.username].some((v) => v?.toLowerCase().includes(needle)),
    );
  }, [backdoorQuery.data, backdoorFilter]);

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: label });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: label });
    }
  };

  const orgsQuery = useQuery({
    queryKey: ["platform", "organizations", statusFilter],
    queryFn: () =>
      fetcher<{ ok: true; organizations: OrgRow[] }>(
        `/api/platform/organizations${orgParams ? `?${orgParams}` : ""}`,
      ),
    staleTime: 60_000,
  });

  const filteredOrgs = React.useMemo(() => {
    const list = orgsQuery.data?.organizations ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((o) =>
      [o.name, o.slug, o.subscription?.planName].some((v) => v?.toLowerCase().includes(needle)),
    );
  }, [orgsQuery.data, q]);

  const stats = statsQuery.data?.stats;

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b0b16] via-[#10112a] to-[#0b0b16] p-5 sm:p-7"
      >
        <motion.div
          aria-hidden
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-28 -left-20 h-[360px] w-[360px] rounded-full blur-[140px] bg-indigo-500/40"
        />
        <motion.div
          aria-hidden
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="pointer-events-none absolute -bottom-32 -right-16 h-[340px] w-[340px] rounded-full blur-[140px] bg-fuchsia-500/40"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-white/5 border border-white/10 text-zinc-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cuetronix · Platform Console
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
              Hello — here's the{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                fleet
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400 max-w-xl">
              Every gaming cafe running Cuetronix right now, at a glance. Click any tenant to drill into
              members, branding, subscription, and audit trail.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
              onClick={() => {
                statsQuery.refetch();
                orgsQuery.refetch();
                backdoorQuery.refetch();
              }}
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90 shadow-lg shadow-indigo-500/30"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New tenant
            </Button>
          </div>
        </div>
      </motion.header>

      <PlatformCreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(org) => {
          toast({ title: "Tenant created", description: `${org.name} · /app/t/${org.slug}` });
          navigate(`/platform/organizations/${org.id}`);
        }}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tenants"
          value={stats?.totalOrgs ?? 0}
          numeric={stats?.totalOrgs}
          sub={stats ? `${stats.internal} internal · ${stats.totalOrgs - stats.internal} paying/prospect` : ""}
          icon={Building2}
          accent="indigo"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          numeric={stats?.active}
          sub={stats ? `+${stats.newOrgsLast7Days} in last 7 days` : ""}
          icon={CircleDot}
          accent="emerald"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Trialing"
          value={stats?.trialing ?? 0}
          numeric={stats?.trialing}
          sub={stats?.pastDue ? `${stats.pastDue} past-due` : "none past-due"}
          icon={Sparkles}
          accent="cyan"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="MRR"
          value={stats ? inr.format(stats.mrrInr) : "—"}
          numeric={stats?.mrrInr}
          formatNumeric={(n) => inr.format(n)}
          sub={stats ? `${stats.payingOrgs} paying accounts` : ""}
          icon={Wallet}
          accent="amber"
          loading={statsQuery.isLoading}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-300">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">Fleet billing grace</div>
                <p className="mt-1 text-xs text-zinc-500 max-w-xl">
                  How long tenant workspaces stay usable after a Razorpay billing suspend, or after they close
                  checkout while the mandate is still uncompleted (
                  <code className="text-[11px] px-1 rounded bg-white/10">created</code>
                  ). Shown as a countdown on the tenant Subscription page and the app gate.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2">
              <label htmlFor="fleet-grace-min" className="text-[11px] uppercase tracking-wider text-zinc-500">
                Minutes
              </label>
              <Input
                id="fleet-grace-min"
                type="number"
                min={1}
                max={10080}
                value={graceDraft}
                disabled={billingSettingsQuery.isLoading || saveBillingGrace.isPending}
                onChange={(e) => setGraceDraft(e.target.value)}
                className="h-9 w-28 bg-transparent border-white/15 text-zinc-100 font-mono text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-white/15 bg-white/5 hover:bg-white/10"
              disabled={
                billingSettingsQuery.isLoading ||
                saveBillingGrace.isPending ||
                graceDraft.trim() === ""
              }
              onClick={() => {
                const n = Number(graceDraft);
                if (!Number.isFinite(n)) {
                  toast({
                    variant: "destructive",
                    title: "Invalid value",
                    description: "Enter a number between 1 and 10080 (7 days).",
                  });
                  return;
                }
                saveBillingGrace.mutate(n);
              }}
            >
              {saveBillingGrace.isPending ? "Saving…" : "Save grace window"}
            </Button>
          </div>
        </div>
      </section>

      {pwdMigrationQuery.data?.status && (() => {
        const s = pwdMigrationQuery.data.status;
        const done = s.plaintextRemaining === 0;
        return (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm flex items-center gap-3",
              done
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                : "border-white/10 bg-white/[0.02] text-zinc-300",
            )}
          >
            <div
              className={cn(
                "rounded-lg p-2",
                done ? "bg-emerald-500/10 text-emerald-300" : "bg-indigo-500/10 text-indigo-300",
              )}
            >
              {done ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Password hash migration
              </div>
              <div className="mt-0.5 text-sm">
                {done ? (
                  <>
                    All <strong>{s.total}</strong> admin account{s.total === 1 ? "" : "s"} on
                    PBKDF2. Safe to retire the legacy <code className="text-xs px-1 rounded bg-white/10">password</code> column.
                  </>
                ) : (
                  <>
                    <strong>{s.hashed}</strong> of <strong>{s.total}</strong> accounts migrated
                    ({s.migratedPct}%). <strong>{s.plaintextRemaining}</strong> still on legacy
                    plaintext — they'll auto-upgrade on their next login.
                  </>
                )}
              </div>
              {!done && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width]"
                    style={{ width: `${Math.min(100, Math.max(0, s.migratedPct))}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      <section className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.04] overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              Workspace backdoor access
            </div>
            <p className="mt-1 text-xs text-zinc-500 max-w-2xl">
              Hidden super-admin login per tenant for Cuetronix testing. Not shown in tenant staff lists.
              {backdoorQuery.data?.provisioned ? (
                <span className="text-indigo-300/90">
                  {" "}
                  Provisioned {backdoorQuery.data.provisioned} missing account
                  {backdoorQuery.data.provisioned === 1 ? "" : "s"} on this load.
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-zinc-200"
              onClick={() => setShowBackdoorPasswords((v) => !v)}
            >
              {showBackdoorPasswords ? (
                <EyeOff className="h-4 w-4 mr-1.5" />
              ) : (
                <Eye className="h-4 w-4 mr-1.5" />
              )}
              {showBackdoorPasswords ? "Hide passwords" : "Show passwords"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-zinc-200"
              onClick={() => backdoorQuery.refetch()}
              disabled={backdoorQuery.isFetching}
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={backdoorFilter}
              onChange={(e) => setBackdoorFilter(e.target.value)}
              placeholder="Filter workspace, slug, or username"
              className="pl-8 h-9 bg-black/40 border-white/10 text-sm"
            />
          </div>
        </div>

        {backdoorQuery.isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-white/5" />
            ))}
          </div>
        ) : backdoorQuery.isError ? (
          <div className="p-6 text-sm text-rose-300">
            {(backdoorQuery.error as Error)?.message}
          </div>
        ) : filteredBackdoor.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No workspaces match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                  <th className="px-5 py-3 font-medium">Workspace</th>
                  <th className="px-3 py-3 font-medium">Username</th>
                  <th className="px-3 py-3 font-medium">Password</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBackdoor.map((w) => (
                  <tr key={w.organizationId} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-zinc-100">{w.orgName}</div>
                      <div className="text-xs text-zinc-500">/app/t/{w.orgSlug}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-300">{w.username}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-300">
                      {showBackdoorPasswords ? w.password : "••••••••••••••••"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-zinc-400 hover:text-zinc-100"
                          onClick={() => void copyText("Username", w.username)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          User
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-zinc-400 hover:text-zinc-100"
                          onClick={() => void copyText("Password", w.password)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Pass
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-zinc-400 hover:text-zinc-100"
                          onClick={() =>
                            void copyText(
                              "Login",
                              `${w.username}\n${w.password}\n${w.loginUrl}`,
                            )
                          }
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          All
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {stats && stats.suspended + stats.pastDue > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>
            {stats.pastDue > 0 && (
              <>
                <strong className="text-amber-100">{stats.pastDue}</strong> tenant
                {stats.pastDue === 1 ? "" : "s"} past-due
              </>
            )}
            {stats.pastDue > 0 && stats.suspended > 0 && " · "}
            {stats.suspended > 0 && (
              <>
                <strong className="text-amber-100">{stats.suspended}</strong> suspended
              </>
            )}{" "}
            — triage from the organizations list.
          </span>
        </motion.div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Organizations</div>
            <div className="text-xs text-zinc-500">
              {orgsQuery.isLoading
                ? "Loading…"
                : `${filteredOrgs.length} of ${orgsQuery.data?.organizations.length ?? 0}`}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or slug"
                className="pl-8 h-9 w-64 bg-black/40 border-white/10 text-sm"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 pl-8 pr-3 rounded-md bg-black/40 border border-white/10 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past due</option>
                <option value="suspended">Suspended</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
        </div>

        {orgsQuery.isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-white/5" />
            ))}
          </div>
        ) : orgsQuery.isError ? (
          <div className="p-8 text-center text-sm text-rose-300">
            Failed to load: {(orgsQuery.error as Error)?.message}
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-8 w-8 mx-auto text-zinc-600" />
            <div className="mt-3 text-sm text-zinc-400">No tenants match those filters.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredOrgs.map((org) => {
              const planKey = (org.subscription?.planCode || "").toLowerCase();
              const planStyle = planBadgeStyles[planKey] || planBadgeStyles.starter;
              const statusStyle = statusStyles[org.status] || statusStyles.active;

              return (
                <button
                  type="button"
                  key={org.id}
                  onClick={() => navigate(`/platform/organizations/${org.id}`)}
                  className="group w-full text-left grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)] items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors focus:outline-none focus:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 grid place-items-center text-[11px] font-bold text-white/90">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-100 flex items-center gap-2">
                          {org.name}
                          {org.is_internal && (
                            <span className="text-[10px] uppercase tracking-wider rounded-sm border border-zinc-500/30 bg-zinc-500/10 text-zinc-400 px-1.5 py-0.5">
                              internal
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          /app/t/{org.slug} · {org.country}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("border", planStyle)}>
                      {org.subscription?.planName || "No plan"}
                    </Badge>
                    <Badge variant="outline" className={cn("border", statusStyle)}>
                      {org.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="hidden md:flex flex-col text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-zinc-500" />
                      {org.locationCount} branch{org.locationCount === 1 ? "" : "es"}
                    </span>
                    <span className="inline-flex items-center gap-1 mt-0.5">
                      <UserRound className="h-3 w-3 text-zinc-500" />
                      {org.memberCount} member{org.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <div className="text-right text-xs text-zinc-500 hidden sm:block">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {relative(org.created_at)}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PlatformDashboard;
