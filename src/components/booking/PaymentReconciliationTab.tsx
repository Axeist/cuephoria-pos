/**
 * Payment command centre (Booking Management → Reconciliation tab).
 *
 * Combines Razorpay payment_orders reconciliation with live checkout visibility:
 * slot_blocks holds, countdown until hold expiry, ₹ in flight, and realtime
 * updates on both tables.
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
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  Layers,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Activity,
  Pause,
  Play,
} from "lucide-react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_CHECKOUT_TTL_MINUTES } from "@/lib/payment-checkout-ttl";

// The generated Supabase types don't yet know about the new tables
// (`payment_orders`, `reconciler_heartbeat`). Narrow query results to
// the local row types below and use a small typed escape on the
// from()/channel() arguments only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string): any => (supabase as unknown as { from: (t: string) => unknown }).from(table);
const fromPaymentOrders = () => fromTable("payment_orders");
const fromHeartbeat = () => fromTable("reconciler_heartbeat");

// How often the client-side auto-reconciler runs and which rows it picks up.
// 5s gives near-real-time recovery while staying well under Razorpay's
// orders.fetchPayments rate limits (we cap parallelism + skip rows
// younger than MIN_AGE_FOR_AUTO_MS).
const AUTO_TICK_MS = 5_000;
const MIN_AGE_FOR_AUTO_MS = 5_000;
const MAX_PARALLEL_RECHECKS = 4;
const HEARTBEAT_FRESH_MS = 60_000;
const HEARTBEAT_STALE_MS = 5 * 60_000;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type BookingSlot = {
  start_time?: string;
  end_time?: string;
  s?: string;
  e?: string;
};

type BookingPayload = {
  selectedStations?: string[];
  s?: string[];
  selectedDateISO?: string;
  d?: string;
  slots?: BookingSlot[];
  t?: BookingSlot[];
  duration?: number;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    [key: string]: unknown;
  };
  locationId?: string;
  pricing?: {
    original?: number;
    discount?: number;
    final?: number;
    transactionFee?: number;
    totalWithFee?: number;
    coupons?: string;
  };
  [key: string]: unknown;
};

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
  booking_payload: BookingPayload | null;
  created_at: string;
  expires_at: string;
};

type StationLite = { id: string; name: string };

type SlotBlockRow = {
  id: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  expires_at: string;
  session_id: string | null;
  customer_phone: string | null;
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

function remainingMs(expiresAt: string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

function formatCountdown(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PaymentOrder | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [stationMap, setStationMap] = useState<Record<string, string>>({});
  const [holds, setHolds] = useState<SlotBlockRow[]>([]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let q = fromPaymentOrders()
        .select(
          "id, provider, profile, status, provider_order_id, provider_payment_id, amount_paise, currency, customer_name, customer_phone, customer_email, reconcile_attempts, last_reconciled_at, last_error, materialized_booking_ids, materialized_bill_id, booking_payload, created_at, expires_at",
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

      let hq = fromTable("slot_blocks")
        .select(
          "id, station_id, booking_date, start_time, end_time, expires_at, session_id, customer_phone",
        )
        .eq("is_confirmed", false)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true })
        .limit(200);
      if (activeLocationId) hq = hq.eq("location_id", activeLocationId);
      const { data: hd, error: he } = (await hq) as {
        data: SlotBlockRow[] | null;
        error: { message: string } | null;
      };
      if (he) {
        console.warn("[reconciliation] slot_blocks fetch", he);
        setHolds([]);
      } else {
        setHolds(hd || []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeLocationId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Realtime: payment_orders + slot_blocks (single command centre feed).
  useEffect(() => {
    const channel = supabase
      .channel(`payment_command_centre_${activeLocationId || "all"}`)
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slot_blocks",
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

  const [countdownTick, setCountdownTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCountdownTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void countdownTick;

  // Station id → name map so we can render readable station labels in the
  // expanded booking detail. We fetch all stations once and cache them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = (await fromTable("stations").select("id, name")) as {
          data: StationLite[] | null;
          error: { message: string } | null;
        };
        if (cancelled || error) return;
        const map: Record<string, string> = {};
        for (const s of data || []) map[s.id] = s.name;
        setStationMap(map);
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Reset to page 1 whenever the filter set or page size changes.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, pageSize, activeLocationId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginated = useMemo(
    () => filtered.slice(pageStart, pageEnd),
    [filtered, pageStart, pageEnd],
  );

  const inFlightPaise = useMemo(
    () =>
      rows
        .filter((r) => r.status === "created" || r.status === "pending")
        .reduce((s, r) => s + (Number(r.amount_paise) || 0), 0),
    [rows],
  );

  const holdCountByStation = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of holds) {
      m[h.station_id] = (m[h.station_id] || 0) + 1;
    }
    return m;
  }, [holds]);

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

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { error } = (await fromPaymentOrders().delete().eq("id", pendingDelete.id)) as {
        error: { message: string } | null;
      };
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
      } else {
        toast.success("Payment order deleted");
        setRows((rs) => rs.filter((r) => r.id !== pendingDelete.id));
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-start gap-3">
          <Radio className="h-7 w-7 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Payment command centre</h2>
            <p className="text-sm text-muted-foreground">
              Live Razorpay orders and station slot holds in one place. Unpaid holds release after{" "}
              <strong>{PAYMENT_CHECKOUT_TTL_MINUTES} minutes</strong>.
            </p>
          </div>
        </div>
      </div>

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

      {/* KPIs — reconciliation + live checkout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Slot holds</p>
                <p className="text-2xl font-bold text-amber-400">{holds.length}</p>
                <p className="text-xs text-muted-foreground mt-1">unconfirmed blocks</p>
              </div>
              <Layers className="h-8 w-8 text-amber-500/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-500/30 bg-violet-950/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">₹ in flight</p>
                <p className="text-2xl font-bold text-violet-300">{formatINR(inFlightPaise)}</p>
                <p className="text-xs text-muted-foreground mt-1">pending orders only</p>
              </div>
              <Activity className="h-8 w-8 text-violet-400/80" />
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

      {/* Live slot reservations (same timer as checkout) */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <span className="text-sm font-medium">Active slot reservations</span>
            <span className="text-xs text-muted-foreground">Realtime · releases when timer hits 0</span>
          </div>
          {holds.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">No temporary holds right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Release in</th>
                    <th className="px-4 py-3 font-medium">Station</th>
                    <th className="px-4 py-3 font-medium">Date / slot</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {holds.map((h) => {
                    const ms = remainingMs(h.expires_at);
                    return (
                      <tr key={h.id} className="border-t border-border/40">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-amber-400/90">
                          {formatCountdown(ms)}
                        </td>
                        <td className="px-4 py-3">
                          {stationMap[h.station_id] || h.station_id.slice(0, 8)}
                          {holdCountByStation[h.station_id] > 1 ? (
                            <Badge className="ml-2 text-[10px]" variant="outline">
                              multi
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {h.booking_date} {String(h.start_time).slice(0, 5)}–{String(h.end_time).slice(0, 5)}
                        </td>
                        <td className="px-4 py-3">{h.customer_phone || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                          {h.session_id || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <th className="px-2 py-3 font-medium w-8" aria-label="expand" />
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Hold ends</th>
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
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={10}>
                      No payment orders match the current filter.
                    </td>
                  </tr>
                )}
                {paginated.map((r) => {
                  const ageMs = Date.now() - new Date(r.created_at).getTime();
                  const isStuck =
                    (r.status === "created" || r.status === "pending") && ageMs > 30 * 1000;
                  const isExpanded = expanded.has(r.id);
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className={`border-t hover:bg-muted/30 ${isStuck ? "bg-red-500/5" : ""} ${isExpanded ? "bg-muted/20" : ""}`}
                      >
                        <td className="px-2 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(r.id)}
                            className="p-1 rounded hover:bg-muted-foreground/10"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap align-top">
                          <div>{new Date(r.created_at).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium">{r.customer_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.customer_phone || ""}</div>
                          {r.customer_email && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={r.customer_email}>
                              {r.customer_email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap align-top">
                          {formatINR(r.amount_paise)}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {r.status === "created" || r.status === "pending" ? (
                            <span
                              className={
                                remainingMs(r.expires_at) < 60_000
                                  ? "text-amber-400 font-medium font-mono"
                                  : "text-emerald-400/90 font-mono"
                              }
                            >
                              {formatCountdown(remainingMs(r.expires_at))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge className={`${STATUS_TO_BADGE[r.status].className} text-white`}>
                            {STATUS_TO_BADGE[r.status].label}
                          </Badge>
                          {r.reconcile_attempts > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              tried {r.reconcile_attempts}×
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[220px] align-top">
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
                        <td className="px-4 py-3 align-top">
                          <span className="text-xs">
                            {(r.materialized_booking_ids || []).length} booking
                            {(r.materialized_booking_ids || []).length === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[260px] align-top">
                          <span
                            className="text-[11px] text-red-500/90 line-clamp-2"
                            title={r.last_error || ""}
                          >
                            {r.last_error || ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap align-top">
                          <div className="flex items-center justify-end gap-2">
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPendingDelete(r)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              title="Delete this payment order row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-t bg-muted/10">
                          <td colSpan={10} className="px-6 py-4">
                            <BookingDetailsBlock row={r} stationMap={stationMap} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {filtered.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <div>
                Showing <span className="font-medium text-foreground">{pageStart + 1}</span>–
                <span className="font-medium text-foreground">
                  {Math.min(pageEnd, filtered.length)}
                </span>{" "}
                of <span className="font-medium text-foreground">{filtered.length}</span> orders
              </div>
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Prev
                </Button>
                <span>
                  Page <span className="font-medium text-foreground">{safePage}</span> /{" "}
                  {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(o) => {
          if (!o && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment order?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  This removes the <code>payment_orders</code> row only. Bookings and bills
                  that have already been created remain untouched.
                </div>
                {pendingDelete && (
                  <div className="rounded border bg-muted/40 p-2 text-xs space-y-1">
                    <div>
                      <strong>Order:</strong>{" "}
                      <span className="font-mono">{pendingDelete.provider_order_id}</span>
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      {STATUS_TO_BADGE[pendingDelete.status].label} •{" "}
                      <strong>Amount:</strong> {formatINR(pendingDelete.amount_paise)}
                    </div>
                    {(pendingDelete.materialized_booking_ids || []).length > 0 && (
                      <div className="text-amber-600">
                        ⚠ This order already produced{" "}
                        {(pendingDelete.materialized_booking_ids || []).length} booking
                        {(pendingDelete.materialized_booking_ids || []).length === 1 ? "" : "s"}.
                        Deleting only removes the reconciliation record.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="text-xs text-muted-foreground space-y-1">
        <div>
          <strong>How automatic reconciliation works (3 layers):</strong>
        </div>
        <div>
          1. <strong>Razorpay webhook</strong> — primary real-time path: Razorpay calls our
          webhook the instant a payment is captured.
        </div>
        <div>
          2. <strong>Browser auto-reconciler</strong> — every {AUTO_TICK_MS / 1000}s while this
          tab is open we re-check every pending row directly against Razorpay (no secrets
          needed). Status shown above.
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

/**
 * Expanded booking detail panel.
 *
 * Renders everything the operator might need to triage a stuck or paid
 * order: stations, slots, customer details, pricing breakdown, and links
 * to the materialized bookings/bill so they can jump straight to the
 * actual records.
 */
function BookingDetailsBlock({
  row,
  stationMap,
}: {
  row: PaymentOrder;
  stationMap: Record<string, string>;
}) {
  const payload: BookingPayload = (row.booking_payload || {}) as BookingPayload;
  const stations: string[] = payload.selectedStations || payload.s || [];
  const dateISO: string = payload.selectedDateISO || payload.d || "";
  const slots: BookingSlot[] = payload.slots || payload.t || [];
  const customer = payload.customer || {};
  const pricing = payload.pricing || {};

  const stationLabels =
    stations.length > 0
      ? stations.map((id) => stationMap[id] || id.slice(0, 8))
      : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
      {/* Booking intent */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          Booking intent
        </div>
        <div>
          <strong>Date:</strong>{" "}
          {dateISO ? (
            <span>{dateISO}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <strong>Stations ({stationLabels.length}):</strong>{" "}
          {stationLabels.length > 0 ? (
            <span>{stationLabels.join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <strong>Slots ({slots.length}):</strong>
          {slots.length === 0 ? (
            <span className="text-muted-foreground"> —</span>
          ) : (
            <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
              {slots.map((s, i) => (
                <li key={i}>
                  {s.start_time || s.s || "?"} → {s.end_time || s.e || "?"}
                </li>
              ))}
            </ul>
          )}
        </div>
        {typeof payload.duration === "number" && (
          <div>
            <strong>Duration:</strong> {payload.duration} hr
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          Customer
        </div>
        <div>
          <strong>Name:</strong>{" "}
          {(customer.name as string) || row.customer_name || (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <strong>Phone:</strong>{" "}
          {(customer.phone as string) || row.customer_phone || (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <strong>Email:</strong>{" "}
          {(customer.email as string) || row.customer_email || (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Pricing + outcome */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          Pricing &amp; outcome
        </div>
        {typeof pricing.original === "number" && (
          <div>
            <strong>Original:</strong> ₹{pricing.original}
          </div>
        )}
        {typeof pricing.discount === "number" && pricing.discount > 0 && (
          <div>
            <strong>Discount:</strong> −₹{pricing.discount}
          </div>
        )}
        {typeof pricing.final === "number" && (
          <div>
            <strong>Final:</strong> ₹{pricing.final}
          </div>
        )}
        {typeof pricing.transactionFee === "number" && pricing.transactionFee > 0 && (
          <div>
            <strong>Txn fee:</strong> ₹{pricing.transactionFee}
          </div>
        )}
        {typeof pricing.totalWithFee === "number" && (
          <div>
            <strong>Total charged:</strong> ₹{pricing.totalWithFee}
          </div>
        )}
        {pricing.coupons && (
          <div>
            <strong>Coupons:</strong> {pricing.coupons}
          </div>
        )}

        <div className="pt-2 border-t mt-2">
          <div>
            <strong>Booking IDs:</strong>{" "}
            {(row.materialized_booking_ids || []).length === 0 ? (
              <span className="text-muted-foreground">none yet</span>
            ) : (
              <div className="font-mono text-[10px] mt-1 space-y-0.5">
                {(row.materialized_booking_ids || []).map((id) => (
                  <div key={id} title={id}>
                    {id}
                  </div>
                ))}
              </div>
            )}
          </div>
          {row.materialized_bill_id && (
            <div className="mt-1">
              <strong>Bill ID:</strong>{" "}
              <span className="font-mono text-[10px]">{row.materialized_bill_id}</span>
            </div>
          )}
          <div className="mt-1 text-muted-foreground">
            Expires: {new Date(row.expires_at).toLocaleString()}
          </div>
          {row.last_reconciled_at && (
            <div className="text-muted-foreground">
              Last reconciled: {timeAgo(row.last_reconciled_at)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentReconciliationTab;
