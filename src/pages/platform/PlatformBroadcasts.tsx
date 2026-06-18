/**
 * /platform/broadcasts — push real-time notifications to all workspaces or one org.
 */

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Globe2,
  Info,
  Loader2,
  Megaphone,
  Radio,
  Send,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { PRODUCT_BRAND } from "@/branding/brand";
import { toast } from "sonner";

type Severity = "info" | "warning" | "critical" | "success";

type PlatformBroadcast = {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  target_type: "all" | "organization";
  organization_id: string | null;
  organization_name: string | null;
  location_count: number;
  created_by_email: string;
  created_by_name: string | null;
  created_at: string;
  expires_at: string;
};

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  locationCount: number;
};

const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

type BroadcastsResponse = {
  ok: boolean;
  migrationRequired?: boolean;
  error?: string;
  broadcasts: PlatformBroadcast[];
};

const BROADCAST_MIGRATION_PATH =
  "supabase/migrations/20260808120000_platform_broadcast_notifications.sql";

const fetchBroadcastHistory = async (): Promise<BroadcastsResponse> => {
  const res = await fetch("/api/platform/broadcasts", { credentials: "same-origin" });
  const json = (await res.json()) as BroadcastsResponse;
  if (json.migrationRequired) return json;
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
};

const SEVERITY_OPTIONS: {
  id: Severity;
  label: string;
  icon: React.ElementType;
  ring: string;
  chip: string;
}[] = [
  {
    id: "info",
    label: "Info",
    icon: Info,
    ring: "ring-cyan-400/50 border-cyan-400/40 bg-cyan-500/10",
    chip: "from-cyan-500/20 to-indigo-500/10",
  },
  {
    id: "success",
    label: "Success",
    icon: CheckCircle2,
    ring: "ring-emerald-400/50 border-emerald-400/40 bg-emerald-500/10",
    chip: "from-emerald-500/20 to-teal-500/10",
  },
  {
    id: "warning",
    label: "Warning",
    icon: AlertTriangle,
    ring: "ring-amber-400/50 border-amber-400/40 bg-amber-500/10",
    chip: "from-amber-500/20 to-orange-500/10",
  },
  {
    id: "critical",
    label: "Critical",
    icon: Shield,
    ring: "ring-rose-400/50 border-rose-400/40 bg-rose-500/10",
    chip: "from-rose-500/20 to-red-600/10",
  },
];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PreviewCard: React.FC<{
  title: string;
  message: string;
  severity: Severity;
}> = ({ title, message, severity }) => {
  const opt = SEVERITY_OPTIONS.find((s) => s.id === severity) ?? SEVERITY_OPTIONS[0];
  const Icon = opt.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0a21]/95 shadow-[0_15px_40px_rgba(0,0,0,0.4)] backdrop-blur-md max-w-sm w-full mx-auto relative">
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r",
          severity === "critical"
            ? "from-rose-500 via-red-500 to-fuchsia-500"
            : severity === "warning"
              ? "from-amber-500 via-orange-500 to-yellow-400"
              : severity === "success"
                ? "from-emerald-500 via-teal-500 to-cyan-400"
                : "from-indigo-500 via-violet-500 to-cyan-400"
        )}
      />
      <div className="p-4 font-quicksand">
        <div className="mb-3 flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0",
              opt.ring
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-[9px] font-extrabold uppercase tracking-[0.2em] text-transparent">
              Cuetronix Platform
            </p>
            <p className="mt-0.5 font-bold text-white text-sm truncate">{title || "Announcement Title"}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500 font-semibold">
              {PRODUCT_BRAND.name} Admin
            </p>
          </div>
        </div>
        <p className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-xs leading-relaxed text-zinc-300 font-medium whitespace-pre-wrap break-words min-h-[60px]">
          {message || "Compose details on the left — staff will see them immediately."}
        </p>
      </div>
    </div>
  );
};

const PlatformBroadcasts: React.FC = () => {
  const { admin } = usePlatformAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("info");
  const [targetType, setTargetType] = useState<"all" | "organization">("all");
  const [organizationId, setOrganizationId] = useState<string>("");

  const orgsQuery = useQuery({
    queryKey: ["platform", "organizations", "broadcast-picker"],
    queryFn: () =>
      fetcher<{ ok: true; organizations: OrgRow[] }>("/api/platform/organizations"),
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ["platform", "broadcasts"],
    queryFn: fetchBroadcastHistory,
    refetchInterval: (query) => (query.state.data?.migrationRequired ? false : 12_000),
    retry: false,
  });

  const broadcastNeedsMigration =
    historyQuery.data?.migrationRequired === true ||
    (historyQuery.error instanceof Error &&
      /platform_broadcast_notifications|platform_broadcasts|staff_notifications_kind_check/i.test(
        historyQuery.error.message,
      ));

  const sendMutation = useMutation({
    mutationFn: () =>
      fetcher<{ ok: true; deliveredTo: number; broadcast: PlatformBroadcast }>(
        "/api/platform/broadcasts",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            severity,
            targetType,
            organizationId: targetType === "organization" ? organizationId : null,
            expiresInHours: 168,
          }),
        }
      ),
    onSuccess: (data) => {
      toast.success(`Live push sent to ${data.deliveredTo} branch${data.deliveredTo === 1 ? "" : "es"}`);
      setTitle("");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["platform", "broadcasts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send broadcast");
    },
  });

  const broadcasts = historyQuery.data?.broadcasts ?? [];
  const orgs = orgsQuery.data?.organizations ?? [];
  const selectedOrg = orgs.find((o) => o.id === organizationId);

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (targetType === "all" || (organizationId && selectedOrg));

  const estBranches = useMemo(() => {
    if (targetType === "all") {
      return orgs.reduce((sum, o) => sum + (o.locationCount ?? 0), 0);
    }
    return selectedOrg?.locationCount ?? 0;
  }, [targetType, orgs, selectedOrg]);

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#120a2e] via-[#180f3d] to-[#0b061e] p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
      >
        <motion.div
          aria-hidden
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-28 -left-20 h-[360px] w-[360px] rounded-full blur-[140px] bg-indigo-500/30"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 p-3 shadow-lg shadow-indigo-500/30">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                <Radio className="h-3 w-3 animate-pulse" />
                Realtime push
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl font-quicksand">
                Workspace broadcasts
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Push announcements to every branch instantly. Staff see a distinct{" "}
                <span className="font-semibold text-cyan-200">Cuetronix Platform</span> badge —
                not confused with booking or session alerts.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-white/5 text-zinc-300">
              <Zap className="mr-1 h-3 w-3 text-amber-300" />
              Supabase Realtime
            </Badge>
            <Badge className="border-violet-400/30 bg-violet-500/10 text-violet-200">
              Signed as {admin?.displayName || admin?.email}
            </Badge>
          </div>
        </div>
      </motion.header>

      {broadcastNeedsMigration && (
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <p className="font-semibold text-amber-50">Database migration required</p>
          <p className="mt-2 leading-relaxed text-amber-100/90">
            {historyQuery.data?.error ||
              "Apply the platform broadcasts migration in Supabase before sending live pushes."}
          </p>
          <p className="mt-2 font-mono text-[11px] text-amber-200/80">{BROADCAST_MIGRATION_PATH}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/5 bg-[#130b2c]/30 backdrop-blur-md p-5 sm:p-6 shadow-lg"
        >
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
            <Send className="h-5 w-5 text-violet-300" />
            Compose broadcast
          </h2>

          <div className="space-y-5">
            <div>
              <Label className="text-zinc-400">Severity</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SEVERITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = severity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSeverity(opt.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all shadow-sm duration-200",
                        active ? `${opt.ring} scale-102` : "border-white/10 bg-[#0b061c]/50 text-zinc-400 hover:border-white/20"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="broadcast-title" className="text-zinc-400">
                Title
              </Label>
              <Input
                id="broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Scheduled maintenance tonight 11 PM–1 AM"
                className="mt-1.5 bg-[#0b061c]/60 border-white/10 text-sm focus:border-indigo-500/40 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <Label htmlFor="broadcast-message" className="text-zinc-400">
                Message
              </Label>
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Full details staff should know. Keep it actionable."
                className="mt-1.5 bg-[#0b061c]/60 border-white/10 resize-y min-h-[120px] text-sm focus:border-indigo-500/40 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Audience</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
                    targetType === "all"
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                      : "border-white/10 text-zinc-400 hover:border-white/20"
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                  All workspaces
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("organization")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
                    targetType === "organization"
                      ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                      : "border-white/10 text-zinc-400 hover:border-white/20"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  One workspace
                </button>
              </div>

              {targetType === "organization" && (
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger className="mt-3 bg-[#0b061c]/60 border-white/10 text-sm focus:border-indigo-500/40 focus:ring-indigo-500/20">
                    <SelectValue placeholder="Select organization…" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} · {org.locationCount} branch{org.locationCount === 1 ? "" : "es"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b061c]/50 px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">
                Delivers to{" "}
                <span className="font-semibold text-zinc-200">
                  ~{estBranches} active branch{estBranches === 1 ? "" : "es"}
                </span>{" "}
                · visible 7 days · toast + bell
              </p>
              <Button
                disabled={!canSend || sendMutation.isPending || broadcastNeedsMigration}
                onClick={() => sendMutation.mutate()}
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-bold shadow-lg shadow-indigo-500/25 hover:opacity-95 text-white transition-all text-xs"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Push live
              </Button>
            </div>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Staff preview
            </p>
            <PreviewCard title={title} message={message} severity={severity} />
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Appears in the notification bell and as a popup. Branded as official{" "}
            {PRODUCT_BRAND.name} platform mail — not venue booking alerts.
          </p>
        </motion.aside>
      </div>

      <section className="rounded-2xl border border-white/5 bg-[#130b2c]/30 backdrop-blur-md p-5 sm:p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Recent broadcasts</h2>
          <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400 text-[10px] font-bold">
            Auto-refresh 12s
          </Badge>
        </div>

        {historyQuery.isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : historyQuery.isError && !broadcastNeedsMigration ? (
          <p className="py-12 text-center text-sm text-rose-300">
            {historyQuery.error instanceof Error
              ? historyQuery.error.message
              : "Failed to load broadcast history."}
          </p>
        ) : broadcasts.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No broadcasts sent yet.</p>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const sev = SEVERITY_OPTIONS.find((s) => s.id === b.severity) ?? SEVERITY_OPTIONS[0];
              const Icon = sev.icon;
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#0b061c]/50 p-4 sm:flex-row sm:items-start sm:justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex min-w-0 gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        sev.ring
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{b.title}</p>
                        <Badge className="border-cyan-400/30 bg-cyan-500/10 text-[10px] text-cyan-200">
                          {b.target_type === "all" ? "Global" : b.organization_name ?? "Targeted"}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{b.message}</p>
                      <p className="mt-2 text-[11px] text-zinc-600">
                        {b.location_count} branches · {b.created_by_name || b.created_by_email} ·{" "}
                        {relativeTime(b.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PlatformBroadcasts;
