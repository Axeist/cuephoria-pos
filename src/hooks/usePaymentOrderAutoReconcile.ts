import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string): any =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

/** Client-side safety net while Booking Management is open. */
const AUTO_TICK_MS = 5_000;
const MIN_AGE_FOR_AUTO_MS = 5_000;
const MAX_PARALLEL_RECHECKS = 4;

export type AutoReconcileResult = { checked: number; flipped: number };

export type AutoReconcileStatus = {
  lastTickAt: number | null;
  lastResult: AutoReconcileResult | null;
};

async function recheckOne(orderId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/razorpay/reconcile", {
      method: "POST",
      headers: { "content-type": "application/json", "x-source": "ui-auto" },
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; status?: string } | null;
    if (!res.ok || !data?.ok) return null;
    return data.status || null;
  } catch {
    return null;
  }
}

/**
 * Polls pending Razorpay payment_orders and calls /api/razorpay/reconcile.
 * Always enabled when `enabled` is true — there is no pause toggle.
 */
export function usePaymentOrderAutoReconcile(options: {
  activeLocationId?: string | null;
  enabled?: boolean;
  onResolved?: () => void;
}): AutoReconcileStatus {
  const { activeLocationId = null, enabled = true, onResolved } = options;
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<AutoReconcileResult | null>(null);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        let q = fromTable("payment_orders")
          .select("provider_order_id, status, created_at")
          .in("status", ["created", "pending"])
          .order("created_at", { ascending: false })
          .limit(100);
        if (activeLocationId) q = q.eq("location_id", activeLocationId);

        const { data, error } = (await q) as {
          data: Array<{ provider_order_id: string; status: string; created_at: string }> | null;
          error: { message: string } | null;
        };
        if (error || cancelled) return;

        const now = Date.now();
        const candidates = (data || []).filter((row) => {
          const age = now - new Date(row.created_at).getTime();
          return age >= MIN_AGE_FOR_AUTO_MS;
        });

        let checked = 0;
        let flipped = 0;
        for (let i = 0; i < candidates.length; i += MAX_PARALLEL_RECHECKS) {
          if (cancelled) break;
          const chunk = candidates.slice(i, i + MAX_PARALLEL_RECHECKS);
          const results = await Promise.all(
            chunk.map((row) => recheckOne(row.provider_order_id)),
          );
          checked += chunk.length;
          for (const status of results) {
            if (
              status === "paid" ||
              status === "reconciled" ||
              status === "expired" ||
              status === "failed"
            ) {
              flipped += 1;
            }
          }
        }

        setLastTickAt(Date.now());
        setLastResult({ checked, flipped });
        if (flipped > 0) onResolvedRef.current?.();
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
  }, [enabled, activeLocationId]);

  return { lastTickAt, lastResult };
}

export const PAYMENT_AUTO_RECONCILE_TICK_MS = AUTO_TICK_MS;
