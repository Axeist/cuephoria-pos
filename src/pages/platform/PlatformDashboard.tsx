/**
 * /platform — Cuetronix operator overview.
 *
 * Stats row + organizations table. All reads go through the platform API
 * surface; no direct Supabase calls from the client.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
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

  const orgParams = React.useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter !== "all") p.set("status", statusFilter);
    return p.toString();
  }, [statusFilter]);

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
