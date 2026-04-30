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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// The generated Supabase types don't yet know about the `payment_orders`
// table (added by migration 20260602100000). We narrow query results to
// `PaymentOrder[]` locally and use a small typed escape on the from()
// table-name argument only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromPaymentOrders = (): any => (supabase as unknown as { from: (t: string) => unknown }).from("payment_orders");

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

  const recheck = useCallback(
    async (row: PaymentOrder) => {
      setRecheckInProgress((s) => new Set(s).add(row.id));
      try {
        const res = await fetch("/api/razorpay/reconcile", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // The backend accepts manual rechecks via the same x-cron-secret
            // it expects from pg_cron. Operators set this to the public
            // (admin-side) value that matches the server env.
            "x-cron-secret":
              (typeof window !== "undefined" &&
                (window as { __RECONCILE_SECRET?: string }).__RECONCILE_SECRET) ||
              "",
          },
          body: JSON.stringify({ order_id: row.provider_order_id }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; status?: string; message?: string; error?: string }
          | null;
        if (!res.ok || !data?.ok) {
          toast.error(`Re-check failed: ${data?.error || data?.message || res.statusText}`);
        } else {
          toast.success(`Re-check complete: ${data.status || "ok"}`);
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
    [fetchRows],
  );

  return (
    <div className="space-y-6">
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

      <div className="text-xs text-muted-foreground">
        Reconciler runs automatically every 15 seconds via Supabase pg_cron. Razorpay webhook is
        the primary real-time path. Use Re-check above to force an immediate check for a single
        order.
      </div>
    </div>
  );
};

export default PaymentReconciliationTab;
