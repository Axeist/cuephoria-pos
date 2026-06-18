/**
 * /platform/audit — platform-wide audit log viewer.
 *
 * Filterable feed backed by /api/platform/audit. Keyset pagination via
 * `before` cursor — newer events stay pinned at the top on refresh.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Search, SlidersHorizontal, RefreshCw, Building2, ChevronDown, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type AuditEntry = {
  id: string;
  actor_type: string;
  actor_id: string;
  actor_label: string;
  organization_id: string | null;
  organizationSlug: string | null;
  organizationName: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

type AuditResponse = { ok: true; entries: AuditEntry[]; nextBefore: string | null };

const fetcher = async (url: string): Promise<AuditResponse> => {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as AuditResponse;
};

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
};

const PlatformAudit: React.FC = () => {
  const [actorFilter, setActorFilter] = React.useState<string>("all");
  const [actionPrefix, setActionPrefix] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [extras, setExtras] = React.useState<AuditEntry[]>([]);

  const params = new URLSearchParams();
  if (actorFilter !== "all") params.set("actor", actorFilter);
  if (actionPrefix !== "all") params.set("actionPrefix", actionPrefix);
  if (q.trim()) params.set("q", q.trim());
  params.set("limit", "50");

  const query = useQuery({
    queryKey: ["platform", "audit", "feed", actorFilter, actionPrefix, q],
    queryFn: () => fetcher(`/api/platform/audit?${params.toString()}`),
    staleTime: 15_000,
  });

  React.useEffect(() => {
    setCursor(null);
    setExtras([]);
  }, [actorFilter, actionPrefix, q]);

  const loadMore = async () => {
    const next = cursor ?? query.data?.nextBefore;
    if (!next) return;
    const p = new URLSearchParams(params);
    p.set("before", next);
    const json = await fetcher(`/api/platform/audit?${p.toString()}`);
    setExtras((prev) => [...prev, ...json.entries]);
    setCursor(json.nextBefore);
  };

  const entries = [...(query.data?.entries ?? []), ...extras];
  const nextBefore = cursor ?? query.data?.nextBefore ?? null;

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#120a2e] via-[#180f3d] to-[#0b061e] p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
      >
        <div className="relative flex flex-wrap items-end justify-between gap-4 font-quicksand">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase font-bold tracking-[0.18em] text-zinc-300">
              <Activity className="h-3.5 w-3.5 text-indigo-300 animate-pulse" />
              Operator Security Log
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-50 font-quicksand">Audit log</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Every operator action and sensitive tenant event, in one stream.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 transition-all text-xs font-semibold"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </motion.header>

      <div className="rounded-2xl border border-white/5 bg-[#130b2c]/30 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect value={actorFilter} onChange={setActorFilter} options={ACTOR_OPTIONS} icon={<SlidersHorizontal className="h-3.5 w-3.5" />} />
            <FilterSelect value={actionPrefix} onChange={setActionPrefix} options={ACTION_OPTIONS} icon={<Activity className="h-3.5 w-3.5" />} />
          </div>
          <div className="relative flex-1 sm:flex-initial sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search action or actor"
              className="pl-8 h-9 bg-[#0b061c]/60 border-white/10 text-sm focus:border-indigo-500/40 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {query.isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-white/5" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-8 text-center text-sm text-rose-300">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            Failed to load: {(query.error as Error).message}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-8 w-8 mx-auto text-zinc-600" />
            <div className="mt-3 text-sm text-zinc-400">
              No events match the current filters.
            </div>
          </div>
        ) : (
          <ol className="divide-y divide-white/5 bg-[#0b061c]/10">
            {entries.map((e) => (
              <li key={e.id} className="px-5 py-3.5 flex items-start gap-3.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] last:border-b-0">
                <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", actorDot(e.actor_type))} />
                <div className="flex-1 min-w-0 font-quicksand">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[13px] font-semibold text-zinc-100 bg-[#0b061c]/60 border border-white/5 px-1.5 py-0.5 rounded">{e.action}</span>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                      {e.actor_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-zinc-300 font-medium">{e.actor_label}</span>
                    {e.organization_id && e.organizationName && (
                      <Link
                        to={`/platform/organizations/${e.organization_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
                      >
                        <Building2 className="h-3 w-3 text-indigo-400" />
                        {e.organizationName}
                      </Link>
                    )}
                  </div>
                  {e.meta && Object.keys(e.meta).length > 0 && (
                    <div className="mt-2 rounded-lg bg-[#0b061c]/40 border border-white/5 p-2 max-w-2xl">
                      <pre className="text-[10.5px] text-zinc-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {JSON.stringify(e.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <div
                  className="text-[11px] text-zinc-500 font-medium whitespace-nowrap mt-1"
                  title={new Date(e.created_at).toLocaleString()}
                >
                  {relative(e.created_at)} ago
                </div>
              </li>
            ))}
          </ol>
        )}

        {nextBefore && !query.isLoading && (
          <div className="border-t border-white/5 px-5 py-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              className="text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
              Load older
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const ACTOR_OPTIONS = [
  { value: "all", label: "All actors" },
  { value: "platform_admin", label: "Platform admins" },
  { value: "admin_user", label: "Tenant admins" },
  { value: "system", label: "System" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "organization", label: "Organization" },
  { value: "subscription", label: "Subscription" },
  { value: "platform_admin", label: "Platform admin" },
  { value: "auth", label: "Auth" },
];

const actorDot = (t: string) => {
  switch (t) {
    case "platform_admin":
      return "bg-indigo-400";
    case "admin_user":
      return "bg-emerald-400";
    case "system":
      return "bg-amber-400";
    default:
      return "bg-zinc-500";
  }
};

const FilterSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  icon: React.ReactNode;
}> = ({ value, onChange, options, icon }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">{icon}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 pl-8 pr-8 rounded-md bg-[#0b061c]/60 border border-white/10 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all cursor-pointer appearance-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export default PlatformAudit;
