import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/context/LocationContext';

export type BusinessSummaryStats = {
  grossIncome: number;
  transactionCount: number;
  avgBillValue: number;
  todaySales: number;
  yesterdaySales: number;
  currentMonthSales: number;
  cashTotal: number;
  upiTotal: number;
};

export type DailyRevenuePoint = {
  day: string;
  revenue: number;
  txnCount: number;
  customerCount: number;
};

type RpcSummaryRow = {
  gross_income?: number;
  transaction_count?: number;
  avg_bill_value?: number;
  today_sales?: number;
  yesterday_sales?: number;
  current_month_sales?: number;
  cash_total?: number;
  upi_total?: number;
};

type CacheEntry = {
  stats: BusinessSummaryStats;
  dailySeries: DailyRevenuePoint[];
  ts: number;
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(
  locationId: string,
  start?: Date,
  end?: Date
): string {
  return `${locationId}|${start?.toISOString() ?? 'all'}|${end?.toISOString() ?? 'all'}`;
}

function mapSummary(row: RpcSummaryRow | null): BusinessSummaryStats {
  return {
    grossIncome: Number(row?.gross_income ?? 0),
    transactionCount: Number(row?.transaction_count ?? 0),
    avgBillValue: Number(row?.avg_bill_value ?? 0),
    todaySales: Number(row?.today_sales ?? 0),
    yesterdaySales: Number(row?.yesterday_sales ?? 0),
    currentMonthSales: Number(row?.current_month_sales ?? 0),
    cashTotal: Number(row?.cash_total ?? 0),
    upiTotal: Number(row?.upi_total ?? 0),
  };
}

function mapDailySeries(raw: unknown): DailyRevenuePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    day: String((row as { day: string }).day),
    revenue: Number((row as { revenue?: number }).revenue ?? 0),
    txnCount: Number((row as { txn_count?: number }).txn_count ?? 0),
    customerCount: Number((row as { customer_count?: number }).customer_count ?? 0),
  }));
}

export function useBusinessAnalytics(options?: {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}) {
  const { activeLocationId } = useLocation();
  const enabled = options?.enabled !== false;
  const startDate = options?.startDate;
  const endDate = options?.endDate;

  const [stats, setStats] = useState<BusinessSummaryStats | null>(null);
  const [dailySeries, setDailySeries] = useState<DailyRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const dayBounds = useMemo(() => {
    const now = new Date();
    return {
      todayStart: startOfDay(now),
      todayEnd: endOfDay(now),
      yesterdayStart: startOfDay(subDays(now, 1)),
      yesterdayEnd: endOfDay(subDays(now, 1)),
      monthStart: startOfMonth(now),
      monthEnd: endOfMonth(now),
    };
  }, []);

  const fetchAnalytics = useCallback(async (opts?: { silent?: boolean }) => {
    if (!activeLocationId || !enabled) {
      setStats(null);
      setDailySeries([]);
      setLoading(false);
      return;
    }

    const key = cacheKey(activeLocationId, startDate, endDate);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setStats(cached.stats);
      setDailySeries(cached.dailySeries);
      setLoading(false);
      setError(null);
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const [summaryResult, seriesResult] = await Promise.all([
        supabase.rpc('get_business_summary_stats', {
          p_location_id: activeLocationId,
          p_start: startDate?.toISOString() ?? null,
          p_end: endDate?.toISOString() ?? null,
          p_today_start: dayBounds.todayStart.toISOString(),
          p_today_end: dayBounds.todayEnd.toISOString(),
          p_yesterday_start: dayBounds.yesterdayStart.toISOString(),
          p_yesterday_end: dayBounds.yesterdayEnd.toISOString(),
          p_month_start: dayBounds.monthStart.toISOString(),
          p_month_end: dayBounds.monthEnd.toISOString(),
        }),
        supabase.rpc('get_daily_revenue_series', {
          p_location_id: activeLocationId,
          p_days: 365,
        }),
      ]);

      if (summaryResult.error) throw summaryResult.error;
      if (seriesResult.error) throw seriesResult.error;

      const mappedStats = mapSummary(summaryResult.data as RpcSummaryRow);
      const mappedSeries = mapDailySeries(seriesResult.data);

      cache.set(key, { stats: mappedStats, dailySeries: mappedSeries, ts: Date.now() });
      setStats(mappedStats);
      setDailySeries(mappedSeries);
    } catch (err) {
      console.error('useBusinessAnalytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [activeLocationId, enabled, startDate, endDate, dayBounds]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    stats,
    dailySeries,
    loading,
    error,
    refresh: () => fetchAnalytics({ silent: true }),
  };
}

export function invalidateBusinessAnalyticsCache(): void {
  cache.clear();
}
