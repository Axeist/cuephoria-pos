import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { callAnalyticsRpc } from '@/services/adminRecordsApi';
import { useLocation } from '@/context/LocationContext';

async function analyticsRpc<T>(
  name: string,
  params: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  const viaApi = await callAnalyticsRpc<T>(name, params);
  if (viaApi.ok) return { data: viaApi.data, error: null };
  return { data: null, error: { message: viaApi.error } };
}

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

export type PaymentBreakdownStats = {
  totalRevenue: number;
  totalTransactions: number;
  cashTotal: number;
  upiTotal: number;
  creditTotal: number;
  razorpayTotal: number;
  cashOnlyCount: number;
  upiOnlyCount: number;
  creditOnlyCount: number;
  razorpayOnlyCount: number;
  splitCount: number;
  splitCashTotal: number;
  splitUpiTotal: number;
};

export type TopCustomerRow = {
  customerId: string;
  name: string;
  totalSpent: number;
  billCount: number;
  avgBill: number;
};

export type GamingRevenueStats = {
  ps5Gaming: number;
  eightBallPool: number;
  challengesRevenue: number;
  canteenSales: number;
  totalRevenue: number;
};

export type CanteenProductRow = {
  name: string;
  sales: number;
  quantity: number;
  profit: number;
};

export type CanteenSalesStats = {
  totalSales: number;
  totalProfit: number;
  products: CanteenProductRow[];
};

export type HourlyBucket = {
  hour: number;
  weekday: number;
  weekend: number;
};

export type ProductPerformanceRow = {
  name: string;
  sales: number;
  count: number;
  category: string;
};

export type BillAggregateMetrics = {
  totalRevenue: number;
  transactionCount: number;
  allTransactionCount: number;
  averageBillValue: number;
  totalDiscounts: number;
  cashSales: number;
  upiSales: number;
  creditSales: number;
  razorpaySales: number;
  splitCash: number;
  splitUpi: number;
  complimentarySales: number;
  complimentaryCount: number;
  highestRevenueDay: string | null;
  highestRevenue: number;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  topCustomerId: string | null;
  topCustomerSpend: number;
  returningCustomerCount: number;
  totalUnitsSold: number;
  mostPopularProductId: string | null;
  gaming: GamingRevenueStats;
};

export type LocationAnalytics = {
  stats: BusinessSummaryStats;
  dailySeries: DailyRevenuePoint[];
  payment: PaymentBreakdownStats;
  topCustomers: TopCustomerRow[];
  topCustomersByCount: TopCustomerRow[];
  gaming: GamingRevenueStats;
  canteen: CanteenSalesStats;
  hourly: HourlyBucket[];
  products: ProductPerformanceRow[];
  billMetrics: BillAggregateMetrics | null;
};

type CacheEntry = { data: LocationAnalytics; ts: number };

const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
let globalFetchPromise: Promise<LocationAnalytics> | null = null;
let globalFetchKey: string | null = null;

function cacheKey(locationId: string, start?: Date, end?: Date, includeBillMetrics = false): string {
  return `${locationId}|${start?.toISOString() ?? 'all'}|${end?.toISOString() ?? 'all'}|bm:${includeBillMetrics ? 1 : 0}`;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapSummary(row: Record<string, unknown> | null): BusinessSummaryStats {
  return {
    grossIncome: num(row?.gross_income),
    transactionCount: num(row?.transaction_count),
    avgBillValue: num(row?.avg_bill_value),
    todaySales: num(row?.today_sales),
    yesterdaySales: num(row?.yesterday_sales),
    currentMonthSales: num(row?.current_month_sales),
    cashTotal: num(row?.cash_total),
    upiTotal: num(row?.upi_total),
  };
}

function mapDailySeries(raw: unknown): DailyRevenuePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    day: String((row as { day: string }).day),
    revenue: num((row as { revenue?: number }).revenue),
    txnCount: num((row as { txn_count?: number }).txn_count),
    customerCount: num((row as { customer_count?: number }).customer_count),
  }));
}

function mapPayment(row: Record<string, unknown> | null): PaymentBreakdownStats {
  return {
    totalRevenue: num(row?.total_revenue),
    totalTransactions: num(row?.total_transactions),
    cashTotal: num(row?.cash_total),
    upiTotal: num(row?.upi_total),
    creditTotal: num(row?.credit_total),
    razorpayTotal: num(row?.razorpay_total),
    cashOnlyCount: num(row?.cash_only_count),
    upiOnlyCount: num(row?.upi_only_count),
    creditOnlyCount: num(row?.credit_only_count),
    razorpayOnlyCount: num(row?.razorpay_only_count),
    splitCount: num(row?.split_count),
    splitCashTotal: num(row?.split_cash_total),
    splitUpiTotal: num(row?.split_upi_total),
  };
}

function mapTopCustomers(raw: unknown): TopCustomerRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    customerId: String((row as { customer_id?: string }).customer_id ?? ''),
    name: String((row as { name?: string }).name ?? 'Unknown'),
    totalSpent: num((row as { total_spent?: number }).total_spent),
    billCount: num((row as { bill_count?: number }).bill_count),
    avgBill: num((row as { avg_bill?: number }).avg_bill),
  }));
}

function mapGaming(row: Record<string, unknown> | null): GamingRevenueStats {
  const ps5 = num(row?.ps5_gaming);
  const pool = num(row?.eight_ball_pool);
  const challenges = num(row?.challenges_revenue);
  const canteen = num(row?.canteen_sales);
  return {
    ps5Gaming: ps5,
    eightBallPool: pool,
    challengesRevenue: challenges,
    canteenSales: canteen,
    totalRevenue: ps5 + pool + challenges + canteen,
  };
}

function mapCanteen(row: Record<string, unknown> | null): CanteenSalesStats {
  const productsRaw = row?.products;
  const products: CanteenProductRow[] = Array.isArray(productsRaw)
    ? productsRaw.map((p) => ({
        name: String((p as { name?: string }).name ?? ''),
        sales: num((p as { sales?: number }).sales),
        quantity: num((p as { quantity?: number }).quantity),
        profit: num((p as { profit?: number }).profit),
      }))
    : [];
  return {
    totalSales: num(row?.total_sales),
    totalProfit: num(row?.total_profit),
    products,
  };
}

function mapHourly(raw: unknown): HourlyBucket[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    hour: num((row as { hour?: number }).hour),
    weekday: num((row as { weekday?: number }).weekday),
    weekend: num((row as { weekend?: number }).weekend),
  }));
}

function mapProducts(raw: unknown): ProductPerformanceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    name: String((row as { name?: string }).name ?? ''),
    sales: num((row as { sales?: number }).sales),
    count: num((row as { count?: number }).count),
    category: String((row as { category?: string }).category ?? 'unknown'),
  }));
}

function mapBillMetrics(row: Record<string, unknown> | null): BillAggregateMetrics | null {
  if (!row) return null;
  const gamingRaw = row.gaming as Record<string, unknown> | null;
  return {
    totalRevenue: num(row.total_revenue),
    transactionCount: num(row.transaction_count),
    allTransactionCount: num(row.all_transaction_count),
    averageBillValue: num(row.average_bill_value),
    totalDiscounts: num(row.total_discounts),
    cashSales: num(row.cash_sales),
    upiSales: num(row.upi_sales),
    creditSales: num(row.credit_sales),
    razorpaySales: num(row.razorpay_sales),
    splitCash: num(row.split_cash),
    splitUpi: num(row.split_upi),
    complimentarySales: num(row.complimentary_sales),
    complimentaryCount: num(row.complimentary_count),
    highestRevenueDay: row.highest_revenue_day ? String(row.highest_revenue_day) : null,
    highestRevenue: num(row.highest_revenue),
    loyaltyPointsUsed: num(row.loyalty_points_used),
    loyaltyPointsEarned: num(row.loyalty_points_earned),
    topCustomerId: row.top_customer_id ? String(row.top_customer_id) : null,
    topCustomerSpend: num(row.top_customer_spend),
    returningCustomerCount: num(row.returning_customer_count),
    totalUnitsSold: num(row.total_units_sold),
    mostPopularProductId: row.most_popular_product_id
      ? String(row.most_popular_product_id)
      : null,
    gaming: mapGaming(gamingRaw),
  };
}

export function invalidateLocationAnalyticsCache(): void {
  cache.clear();
}

/** @deprecated use invalidateLocationAnalyticsCache */
export function invalidateBusinessAnalyticsCache(): void {
  invalidateLocationAnalyticsCache();
}

type Options = {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  /** Skip bill aggregate metrics (reports summary uses this separately). */
  includeBillMetrics?: boolean;
  dailyDays?: number;
};

export function useLocationAnalytics(options?: Options) {
  const { activeLocationId } = useLocation();
  const enabled = options?.enabled !== false;
  const startDate = options?.startDate;
  const endDate = options?.endDate;
  const includeBillMetrics = options?.includeBillMetrics ?? false;
  const dailyDays = options?.dailyDays ?? 365;

  const [data, setData] = useState<LocationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchAnalytics = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!activeLocationId || !enabled) {
        setData(null);
        setLoading(false);
        return;
      }

      const key = cacheKey(activeLocationId, startDate, endDate, includeBillMetrics);
      const cached = cache.get(key);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setData(cached.data);
        setLoading(false);
        setError(null);
        return;
      }

      const pStart = startDate?.toISOString() ?? null;
      const pEnd = endDate?.toISOString() ?? null;

      if (globalFetchPromise && globalFetchKey === key) {
        try {
          await globalFetchPromise;
          const after = cache.get(key);
          if (after) setData(after.data);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }

      globalFetchKey = key;
      globalFetchPromise = (async () => {
        const rpcs: Promise<{ data: unknown; error: unknown }>[] = [
          analyticsRpc('get_business_summary_stats', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
            p_today_start: dayBounds.todayStart.toISOString(),
            p_today_end: dayBounds.todayEnd.toISOString(),
            p_yesterday_start: dayBounds.yesterdayStart.toISOString(),
            p_yesterday_end: dayBounds.yesterdayEnd.toISOString(),
            p_month_start: dayBounds.monthStart.toISOString(),
            p_month_end: dayBounds.monthEnd.toISOString(),
          }),
          analyticsRpc('get_daily_revenue_series', {
            p_location_id: activeLocationId,
            p_days: dailyDays,
            p_start: pStart,
            p_end: pEnd,
          }),
          analyticsRpc('get_payment_breakdown_stats', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
          }),
          analyticsRpc('get_top_customers', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
            p_limit: 12,
            p_sort_by: 'spend',
          }),
          analyticsRpc('get_top_customers', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
            p_limit: 5,
            p_sort_by: 'count',
          }),
          analyticsRpc('get_gaming_revenue_breakdown', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
          }),
          analyticsRpc('get_canteen_product_sales', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
          }),
          analyticsRpc('get_hourly_revenue_distribution', {
            p_location_id: activeLocationId,
            p_days: dailyDays,
          }),
          analyticsRpc('get_product_performance', {
            p_location_id: activeLocationId,
            p_start: pStart,
            p_end: pEnd,
            p_limit: 10,
          }),
        ];

        if (includeBillMetrics) {
          rpcs.push(
            analyticsRpc('get_bill_aggregate_metrics', {
              p_location_id: activeLocationId,
              p_start: pStart,
              p_end: pEnd,
            })
          );
        }

        const results = await Promise.all(rpcs);
        for (const r of results) {
          if (r.error) throw r.error;
        }

        const [
          summaryResult,
          seriesResult,
          paymentResult,
          topSpendResult,
          topCountResult,
          gamingResult,
          canteenResult,
          hourlyResult,
          productsResult,
          billMetricsResult,
        ] = results;

        const mapped: LocationAnalytics = {
          stats: mapSummary(summaryResult.data as Record<string, unknown>),
          dailySeries: mapDailySeries(seriesResult.data),
          payment: mapPayment(paymentResult.data as Record<string, unknown>),
          topCustomers: mapTopCustomers(topSpendResult.data),
          topCustomersByCount: mapTopCustomers(topCountResult.data),
          gaming: mapGaming(gamingResult.data as Record<string, unknown>),
          canteen: mapCanteen(canteenResult.data as Record<string, unknown>),
          hourly: mapHourly(hourlyResult.data),
          products: mapProducts(productsResult.data),
          billMetrics: includeBillMetrics
            ? mapBillMetrics(billMetricsResult?.data as Record<string, unknown>)
            : null,
        };

        cache.set(key, { data: mapped, ts: Date.now() });
        return mapped;
      })();

      try {
        const mapped = await globalFetchPromise;
        setData(mapped);
      } catch (err) {
        console.error('useLocationAnalytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        globalFetchPromise = null;
        globalFetchKey = null;
        setLoading(false);
      }
    },
    [
      activeLocationId,
      enabled,
      startDate,
      endDate,
      dayBounds,
      includeBillMetrics,
      dailyDays,
    ]
  );

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    stats: data?.stats ?? null,
    dailySeries: data?.dailySeries ?? [],
    payment: data?.payment ?? null,
    topCustomers: data?.topCustomers ?? [],
    topCustomersByCount: data?.topCustomersByCount ?? [],
    gaming: data?.gaming ?? null,
    canteen: data?.canteen ?? null,
    hourly: data?.hourly ?? [],
    products: data?.products ?? [],
    billMetrics: data?.billMetrics ?? null,
    loading,
    error,
    refresh: () => fetchAnalytics({ silent: true }),
  };
}

/** Backward-compatible wrapper used by BusinessInsightsWidget / BusinessSummarySection. */
export function useBusinessAnalytics(options?: {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}) {
  const { stats, dailySeries, loading, error, refresh } = useLocationAnalytics(options);
  return { stats, dailySeries, loading, error, refresh };
}
