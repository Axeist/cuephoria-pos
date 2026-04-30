/**
 * Payment Reconciliation tab for the Booking Management page.
 *
 * Shows every Razorpay payment_orders row scoped to the active location
 * (with realtime updates), KPI cards for stuck/paid/expired counts, and
 * a manual "Re-check now" button that POSTs to /api/razorpay/reconcile
 * for a single order_id.
 *
 * The webhook + pg_cron reconciler do the actual work — this view just
 * surfaces the state to operators so any anomaly is visible immediately.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  Search,
  XCircle,
  Activity,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// The generated Supabase types don't yet know about the new tables
// (`payment_orders`, `reconciler_heartbeat`). Narrow query results to
// the local row types below and use a small typed escape on the
// from()/channel() arguments only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string): any => (supabase as unknown as { from: (t: string) => unknown }).from(table);
const fromPaymentOrders = () => fromTable("payment_orders");
const fromHeartbeat = () => fromTable("reconciler_heartbeat");

// How often the client-side auto-reconciler runs and which rows it picks up.
const AUTO_TICK_MS = 15_000;
const MIN_AGE_FOR_AUTO_MS = 10_000;
const MAX_PARALLEL_RECHECKS = 4;
const HEARTBEAT_FRESH_MS = 60_000;
const HEARTBEAT_STALE_MS = 5 * 60_000;

type PaymentOrder = {
  id: string;
  provider: string;
  profile: string;
  status: "created" | "pending" | "paid" | "failed" | "expired" | "reconciled";
  provider_order_id: string;
  provider_payment_id: string | null;
  amount_paise: number;
  currency: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  reconcile_attempts: number;
  last_reconciled_at: string | null;
  last_error: string | null;
  materialized_booking_ids: string[] | null;
  materialized_bill_id: string | null;
  created_at: string;
  expires_at: string;
};

type Heartbeat = {
  last_run_at: string;
  last_source: string | null;
  last_scanned: number;
  last_paid: number;
  last_pending: number;
  last_expired: number;
  last_failed: number;
  last_errors: number;
  last_elapsed_ms: number;
};

type Props = {
  activeLocationId: string | null | undefined;
};

const STATUS_TO_BADGE: Record<
  PaymentOrder["status"],
  { className: string; label: string }
> = {
  created: { className: "bg-slate-500 hover:bg-slate-600", label: "Created" },
  pending: { className: "bg-amber-500 hover:bg-amber-600", label: "Pending" },
  paid: { className: "bg-green-500 hover:bg-green-600", label: "Paid" },
  failed: { className: "bg-red-500 hover:bg-red-600", label: "Failed" },
  expired: { className: "bg-zinc-500 hover:bg-zinc-600", label: "Expired" },
  reconciled: { className: "bg-blue-500 hover:bg-blue-600", label: "Reconciled" },
};

function formatINR(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function dashboardLink(orderId: string): string {
  return `https://dashboard.razorpay.com/app/orders/${encodeURIComponent(orderId)}`;
}

export const PaymentReconciliationTab: React.FC<Props> = ({ activeLocationId }) => {
  const [rows, setRows] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [recheckInProgress, setRecheckInProgress] = useState<Set<string>>(new Set());
  const [autoOn, setAutoOn] = useState<boolean>(true);
  const [autoLastTickAt, setAutoLastTickAt] = useState<number | null>(null);
  const [autoLastResult, setAutoLastResult] = useState<{ checked: number; flipped: number } | null>(null);
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let q = fromPaymentOrders()
        .select(
          "id, provider, profile, status, provider_order_id, provider_payment_id, amount_paise, currency, customer_name, customer_phone, customer_email, reconcile_attempts, last_reconciled_at, last_error, materialized_booking_ids, materialized_bill_id, created_at, expires_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (activeLocationId) q = q.eq("location_id", activeLocationId);
      const { data, error } = (await q) as {
        data: PaymentOrder[] | null;
        error: { message: string } | null;
      };
      if (error) {
        console.error("[reconciliation] fetch error", error);
        toast.error(`Failed to load payment orders: ${error.message}`);
        return;
      }
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }, [activeLocationId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Realtime: react to inserts/updates so the tab stays live.
  useEffect(() => {
    const channel = supabase
      .channel(`payment_orders_recon_${activeLocationId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_orders",
          ...(activeLocationId ? { filter: `location_id=eq.${activeLocationId}` } : {}),
        },
        () => {
          fetchRows();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLocationId, fetchRows]);

  // Light tick to refresh "X seconds ago" labels every 5s.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  void tick;

  // pg_cron heartbeat: read the singleton row + subscribe to updates so we
  // can show whether the database-side cron is firing.
  const fetchHeartbeat = useCallback(async () => {
    try {
      const { data, error } = (await fromHeartbeat()
        .select(
          "last_run_at, last_source, last_scanned, last_paid, last_pending, last_expired, last_failed, last_errors, last_elapsed_ms",
        )
        .eq("id", 1)
        .maybeSingle()) as { data: Heartbeat | null; error: { message: string } | null };
      if (error) {
        // table missing in older deployments → silently ignore
        return;
      }
      if (data) setHeartbeat(data);
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    fetchHeartbeat();
  }, [fetchHeartbeat]);

  useEffect(() => {
    const channel = supabase
      .channel("reconciler_heartbeat_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reconciler_heartbeat" },
        () => fetchHeartbeat(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHeartbeat]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!needle) return true;
      const hay = [
        r.provider_order_id,
        r.provider_payment_id || "",
        r.customer_phone || "",
        r.customer_name || "",
        r.customer_email || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, statusFilter, search]);

  const kpi = useMemo(() => {
    const now = Date.now();
    let pending = 0;
    let stuck = 0;
    let paidLast24h = 0;
    let expiredLast7d = 0;
    let stuckAmountPaise = 0;
    for (const r of rows) {
      const age = now - new Date(r.created_at).getTime();
      if (r.status === "created" || r.status === "pending") {
        pending += 1;
        if (age > 30 * 1000) {
          stuck += 1;
          stuckAmountPaise += r.amount_paise || 0;
        }
      }
      if (r.status === "paid" && age <= 24 * 60 * 60 * 1000) paidLast24h += 1;
      if (r.status === "expired" && age <= 7 * 24 * 60 * 60 * 1000) expiredLast7d += 1;
    }
    return { pending, stuck, paidLast24h, expiredLast7d, stuckAmountPaise };
  }, [rows]);

  // Low-level single recheck (used by both manual button and auto loop).
  // Returns the new status string or null on error so the caller can tally.
  const recheckOne = useCallback(async (orderId: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/razorpay/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json", "x-source": "ui-auto" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; status?: string; message?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok) return null;
      return data.status || null;
    } catch {
      return null;
    }
  }, []);

  const recheck = useCallback(
    async (row: PaymentOrder) => {
      setRecheckInProgress((s) => new Set(s).add(row.id));
      try {
        const status = await recheckOne(row.provider_order_id);
        if (!status) {
          toast.error("Re-check failed");
        } else {
          toast.success(`Re-check complete: ${status}`);
          await fetchRows();
        }
      } catch (err) {
        toast.error(`Re-check threw: ${(err as Error).message}`);
      } finally {
        setRecheckInProgress((s) => {
          const next = new Set(s);
          next.delete(row.id);
          return next;
        });
      }
    },
    [fetchRows, recheckOne],
  );

  // Client-side auto-reconciler.
  //
  // Every AUTO_TICK_MS while this tab is open and `autoOn` is true, we
  // pick up rows that are still pending/created and at least
  // MIN_AGE_FOR_AUTO_MS old, then call recheckOne in parallel batches.
  // This is a complementary safety net to the server-side pg_cron job —
  // it works even if pg_cron / GUCs / RECONCILE_CRON_SECRET aren't set.
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!autoOn) return;
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const now = Date.now();
        const candidates = rowsRef.current.filter((r) => {
          if (r.status !== "created" && r.status !== "pending") return false;
          const age = now - new Date(r.created_at).getTime();
          if (age < MIN_AGE_FOR_AUTO_MS) return false;
          return true;
        });

        let checked = 0;
        let flipped = 0;
        // Process in chunks to bound parallelism.
        for (let i = 0; i < candidates.length; i += MAX_PARALLEL_RECHECKS) {
          if (cancelled) break;
          const chunk = candidates.slice(i, i + MAX_PARALLEL_RECHECKS);
          const results = await Promise.all(
            chunk.map((r) => recheckOne(r.provider_order_id)),
          );
          checked += chunk.length;
          for (const status of results) {
            if (status === "paid" || status === "reconciled" || status === "expired" || status === "failed") {
              flipped += 1;
            }
          }
        }

        setAutoLastTickAt(Date.now());
        setAutoLastResult({ checked, flipped });
        if (flipped > 0) await fetchRows();
      } finally {
        inFlight = false;
      }
    }

    tick();
    const interval = setInterval(tick, AUTO_TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [autoOn, recheckOne, fetchRows]);

  // Heartbeat freshness for the pg_cron badge.
  const hbAgeMs = heartbeat ? Date.now() - new Date(heartbeat.last_run_at).getTime() : null;
  const hbColor =
    hbAgeMs == null
      ? "bg-zinc-500"
      : hbAgeMs < HEARTBEAT_FRESH_MS
        ? "bg-green-500"
        : hbAgeMs < HEARTBEAT_STALE_MS
          ? "bg-amber-500"
          : "bg-red-500";
  const hbLabel =
    hbAgeMs == null
      ? "pg_cron: never run"
      : hbAgeMs < HEARTBEAT_FRESH_MS
        ? `pg_cron: healthy (${Math.round(hbAgeMs / 1000)}s ago)`
        : hbAgeMs < HEARTBEAT_STALE_MS
          ? `pg_cron: slow (${Math.round(hbAgeMs / 1000)}s ago)`
          : `pg_cron: stalled (${timeAgo(heartbeat!.last_run_at)})`;

  return (
    <div className="space-y-6">
      {/* Auto-reconciler status bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity
                  className={`h-4 w-4 ${autoOn ? "text-green-500 animate-pulse" : "text-muted-foreground"}`}
                />
                <span className="text-sm font-medium">
                  Auto-reconcile {autoOn ? "ON" : "OFF"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {autoOn
                  ? autoLastTickAt
                    ? `last tick ${Math.max(0, Math.round((Date.now() - autoLastTickAt) / 1000))}s ago` +
                      (autoLastResult ? ` • checked ${autoLastResult.checked}, resolved ${autoLastResult.flipped}` : "")
                    : "starting…"
                  : "manual mode"}
              </span>
              <span className={`inline-block h-2 w-2 rounded-full ${hbColor}`} />
              <span className="text-xs text-muted-foreground">{hbLabel}</span>
            </div>
            <Button
              size="sm"
              variant={autoOn ? "outline" : "default"}
              onClick={() => setAutoOn((v) => !v)}
            >
              {autoOn ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {autoOn ? "Pause auto-reconcile" : "Resume auto-reconcile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{kpi.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">awaiting capture</p>
              </div>
              <Clock3 className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={kpi.stuck > 0 ? "border-red-500/50" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stuck &gt; 30s</p>
                <p className={`text-2xl font-bold ${kpi.stuck > 0 ? "text-red-500" : ""}`}>
                  {kpi.stuck}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatINR(kpi.stuckAmountPaise)} held up
                </p>
              </div>
              <AlertTriangle
                className={`h-8 w-8 ${kpi.stuck > 0 ? "text-red-500" : "text-muted-foreground"}`}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid (24h)</p>
                <p className="text-2xl font-bold text-green-600">{kpi.paidLast24h}</p>
                <p className="text-xs text-muted-foreground mt-1">successfully booked</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired (7d)</p>
                <p className="text-2xl font-bold">{kpi.expiredLast7d}</p>
                <p className="text-xs text-muted-foreground mt-1">no payment captured</p>
              </div>
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order id, payment id, phone, name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="reconciled">Reconciled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Razorpay</th>
                  <th className="px-4 py-3 font-medium">Bookings</th>
                  <th className="px-4 py-3 font-medium">Last error</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      No payment orders match the current filter.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const ageMs = Date.now() - new Date(r.created_at).getTime();
                  const isStuck =
                    (r.status === "created" || r.status === "pending") && ageMs > 30 * 1000;
                  return (
                    <tr
                      key={r.id}
                      className={`border-t hover:bg-muted/30 ${isStuck ? "bg-red-500/5" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>{new Date(r.created_at).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.customer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.customer_phone || ""}</div>
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {formatINR(r.amount_paise)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${STATUS_TO_BADGE[r.status].className} text-white`}>
                          {STATUS_TO_BADGE[r.status].label}
                        </Badge>
                        {r.reconcile_attempts > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            tried {r.reconcile_attempts}×
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <a
                          href={dashboardLink(r.provider_order_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                          title={r.provider_order_id}
                        >
                          {r.provider_order_id}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {r.provider_payment_id && (
                          <div className="font-mono text-[10px] text-muted-foreground truncate">
                            {r.provider_payment_id}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">profile: {r.profile}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {(r.materialized_booking_ids || []).length} booking
                          {(r.materialized_booking_ids || []).length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <span
                          className="text-[11px] text-red-500/90 line-clamp-2"
                          title={r.last_error || ""}
                        >
                          {r.last_error || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recheck(r)}
                          disabled={
                            recheckInProgress.has(r.id) ||
                            r.status === "paid" ||
                            r.status === "reconciled"
                          }
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 mr-1 ${recheckInProgress.has(r.id) ? "animate-spin" : ""}`}
                          />
                          Re-check
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <div>
          <strong>How automatic reconciliation works (3 layers):</strong>
        </div>
        <div>
          1. <strong>Razorpay webhook</strong> — primary real-time path: Razorpay calls our
          webhook the instant a payment is captured.
        </div>
        <div>
          2. <strong>Browser auto-reconciler</strong> — every 15s while this tab is open we
          re-check every pending row directly against Razorpay (no secrets needed). Status
          shown above.
        </div>
        <div>
          3. <strong>Supabase pg_cron</strong> — every 15s server-side sweep. Status shown
          above; if you see <em>“never run”</em> or <em>“stalled”</em>, ask ops to enable
          <code className="mx-1">pg_cron</code> + <code>pg_net</code> and set
          <code className="mx-1">app.reconcile_url</code> /
          <code className="mx-1">app.reconcile_secret</code> GUCs.
        </div>
      </div>
    </div>
  );
};

export default PaymentReconciliationTab;
