import { supabase } from '@/integrations/supabase/client';
import type { Bill, Session } from '@/types/pos.types';
import type { StationMaintenancePeriod } from '@/types/stationMaintenance.types';
import { transformMaintenancePeriodRow } from '@/utils/stationMaintenance.utils';

const PARALLEL_PAGES = 4;
const BILLS_PAGE_SIZE = 100;
const SESSIONS_PAGE_SIZE = 500;

const BILL_SELECT = `
  id,
  customer_id,
  subtotal,
  discount,
  discount_value,
  discount_type,
  loyalty_points_used,
  loyalty_points_earned,
  total,
  payment_method,
  status,
  comp_note,
  is_split_payment,
  cash_amount,
  upi_amount,
  taxable_amount,
  tax_amount,
  tax_rate,
  gstin_snapshot,
  created_at,
  bill_items (
    id,
    item_id,
    name,
    price,
    quantity,
    total,
    item_type
  )
`;

const SESSION_SELECT =
  'id, station_id, customer_id, start_time, end_time, duration, hourly_rate, original_rate, coupon_code, discount_amount, is_paused, paused_at, total_paused_time';

type RawBillItemRow = {
  item_id: string;
  item_type: string;
  name: string;
  price: number | string | null;
  quantity: number;
  total: number | string | null;
};

export type RawBillRow = {
  id: string;
  customer_id: string;
  subtotal: number | string | null;
  discount: number | string | null;
  discount_value: number | string | null;
  discount_type: string | null;
  loyalty_points_used: number | null;
  loyalty_points_earned: number | null;
  total: number | string | null;
  payment_method: string | null;
  status?: string | null;
  comp_note?: string | null;
  is_split_payment?: boolean | null;
  cash_amount?: number | string | null;
  upi_amount?: number | string | null;
  taxable_amount?: number | string | null;
  tax_amount?: number | string | null;
  tax_rate?: number | string | null;
  gstin_snapshot?: string | null;
  created_at: string;
  bill_items?: RawBillItemRow[] | null;
};

export function transformReportBills(rawBills: RawBillRow[]): Bill[] {
  return (rawBills || []).map((bill) => ({
    id: bill.id,
    customerId: bill.customer_id,
    items: (bill.bill_items || []).map((item) => ({
      id: item.item_id,
      type: (item.item_type as 'product' | 'session') || 'product',
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      total: Number(item.total),
    })),
    subtotal: Number(bill.subtotal),
    discount: Number(bill.discount),
    discountValue: Number(bill.discount_value),
    discountType: (bill.discount_type as 'percentage' | 'fixed') || 'fixed',
    loyaltyPointsUsed: bill.loyalty_points_used || 0,
    loyaltyPointsEarned: bill.loyalty_points_earned || 0,
    total: Number(bill.total),
    paymentMethod: (bill.payment_method as Bill['paymentMethod']) || 'cash',
    status: (bill.status as Bill['status']) || 'completed',
    compNote: bill.comp_note || undefined,
    isSplitPayment: bill.is_split_payment || false,
    cashAmount: bill.cash_amount ? Number(bill.cash_amount) : 0,
    upiAmount: bill.upi_amount ? Number(bill.upi_amount) : 0,
    taxableAmount: bill.taxable_amount != null ? Number(bill.taxable_amount) : undefined,
    taxAmount: bill.tax_amount != null ? Number(bill.tax_amount) : undefined,
    taxRate: bill.tax_rate != null ? Number(bill.tax_rate) : undefined,
    gstinSnapshot: bill.gstin_snapshot || undefined,
    createdAt: new Date(bill.created_at),
  }));
}

export function mergeBillsByIdDesc(prevBills: Bill[], incomingBills: Bill[]): Bill[] {
  const map = new Map<string, Bill>();
  for (const b of prevBills) map.set(b.id, b);
  for (const b of incomingBills) map.set(b.id, b);
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

type RangeParams = {
  from: Date;
  to: Date;
  locationId: string | null;
  allLocations: boolean;
};

type FetchOptions = {
  onBatch: (batch: Bill[]) => void;
  signal?: { cancelled: boolean };
};

/** Fetch bills for a date range with parallel pages; calls onBatch after each batch. */
export async function fetchBillsForDateRange(
  params: RangeParams,
  options: FetchOptions
): Promise<void> {
  const { from, to, locationId, allLocations } = params;
  const { onBatch, signal } = options;

  let page = 0;
  let finished = false;

  while (!finished) {
    if (signal?.cancelled) return;

    const pagesToFetch = Array.from({ length: PARALLEL_PAGES }, (_, i) => page + i);
    const results = await Promise.all(
      pagesToFetch.map(async (p) => {
        let query = supabase
          .from('bills')
          .select(BILL_SELECT)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString())
          .order('created_at', { ascending: false })
          .range(p * BILLS_PAGE_SIZE, (p + 1) * BILLS_PAGE_SIZE - 1);

        if (!allLocations && locationId) {
          query = query.eq('location_id', locationId);
        }

        return query;
      })
    );

    const batchError = results.find((r) => r.error)?.error;
    if (batchError) throw batchError;

    let batchRows: RawBillRow[] = [];
    for (const result of results) {
      const rows = (result.data as unknown as RawBillRow[]) || [];
      if (rows.length === 0) {
        finished = true;
        break;
      }
      batchRows = batchRows.concat(rows);
      if (rows.length < BILLS_PAGE_SIZE) {
        finished = true;
        break;
      }
    }

    if (batchRows.length === 0) {
      finished = true;
      break;
    }

    if (signal?.cancelled) return;
    onBatch(transformReportBills(batchRows));
    page += pagesToFetch.length;
  }
}

type SessionRow = {
  id: string;
  station_id: string;
  customer_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  hourly_rate: number | null;
  original_rate: number | null;
  coupon_code: string | null;
  discount_amount: number | null;
  is_paused: boolean | null;
  paused_at: string | null;
  total_paused_time: number | null;
};

function transformSessionRow(item: SessionRow): Session {
  return {
    id: item.id,
    stationId: item.station_id,
    customerId: item.customer_id,
    startTime: new Date(item.start_time),
    endTime: item.end_time ? new Date(item.end_time) : undefined,
    duration: item.duration ?? undefined,
    hourlyRate: item.hourly_rate ?? undefined,
    originalRate: item.original_rate ?? undefined,
    couponCode: item.coupon_code ?? undefined,
    discountAmount: item.discount_amount ?? undefined,
    isPaused: item.is_paused ?? false,
    pausedAt: item.paused_at ? new Date(item.paused_at) : undefined,
    totalPausedMs: item.total_paused_time ?? 0,
  };
}

type SessionFetchOptions = {
  onBatch: (batch: Session[]) => void;
  signal?: { cancelled: boolean };
};

/** Fetch sessions whose start_time falls within the date range. */
export async function fetchSessionsForDateRange(
  params: RangeParams,
  options: SessionFetchOptions
): Promise<void> {
  const { from, to, locationId, allLocations } = params;
  const { onBatch, signal } = options;

  let page = 0;
  let finished = false;

  while (!finished) {
    if (signal?.cancelled) return;

    const pagesToFetch = Array.from({ length: PARALLEL_PAGES }, (_, i) => page + i);
    const results = await Promise.all(
      pagesToFetch.map(async (p) => {
        let query = supabase
          .from('sessions')
          .select(SESSION_SELECT)
          .gte('start_time', from.toISOString())
          .lte('start_time', to.toISOString())
          .order('start_time', { ascending: false })
          .range(p * SESSIONS_PAGE_SIZE, (p + 1) * SESSIONS_PAGE_SIZE - 1);

        if (!allLocations && locationId) {
          query = query.eq('location_id', locationId);
        }

        return query;
      })
    );

    const batchError = results.find((r) => r.error)?.error;
    if (batchError) throw batchError;

    let batchRows: SessionRow[] = [];
    for (const result of results) {
      const rows = (result.data as SessionRow[]) || [];
      if (rows.length === 0) {
        finished = true;
        break;
      }
      batchRows = batchRows.concat(rows);
      if (rows.length < SESSIONS_PAGE_SIZE) {
        finished = true;
        break;
      }
    }

    if (batchRows.length === 0) {
      finished = true;
      break;
    }

    if (signal?.cancelled) return;
    onBatch(batchRows.map(transformSessionRow));
    page += pagesToFetch.length;
  }
}

const MAINTENANCE_PAGE_SIZE = 500;

/** Fetch maintenance periods overlapping the date range. */
export async function fetchMaintenanceForDateRange(
  params: RangeParams,
  options: SessionFetchOptions
): Promise<StationMaintenancePeriod[]> {
  const { from, to, locationId, allLocations } = params;
  const { signal } = options;
  const results: StationMaintenancePeriod[] = [];
  let page = 0;
  let finished = false;

  while (!finished) {
    if (signal?.cancelled) break;

    let query = supabase
      .from('station_maintenance_periods')
      .select('id, station_id, location_id, started_at, planned_end_at, ended_at, started_by_name')
      .lte('started_at', to.toISOString())
      .or(`ended_at.gte.${from.toISOString()},ended_at.is.null`)
      .order('started_at', { ascending: false })
      .range(page * MAINTENANCE_PAGE_SIZE, (page + 1) * MAINTENANCE_PAGE_SIZE - 1);

    if (!allLocations && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) break;

    results.push(...rows.map(transformMaintenancePeriodRow));
    if (rows.length < MAINTENANCE_PAGE_SIZE) finished = true;
    page += 1;
  }

  return results;
}

// Short-lived in-memory cache so tab switches / remounts feel instant.
const cache = new Map<string, { bills: Bill[]; sessions: Session[]; maintenance: StationMaintenancePeriod[]; ts: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export function reportCacheKey(
  kind: 'bills' | 'sessions' | 'maintenance',
  from: Date,
  to: Date,
  locationId: string | null,
  allLocations: boolean
): string {
  return `${kind}|${allLocations ? 'all' : locationId ?? 'none'}|${from.toISOString()}|${to.toISOString()}`;
}

export function getReportCache(key: string): Bill[] | Session[] | StationMaintenancePeriod[] | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) return null;
  if (key.startsWith('bills|')) return entry.bills;
  if (key.startsWith('maintenance|')) return entry.maintenance;
  return entry.sessions;
}

export function setReportBillsCache(key: string, bills: Bill[]): void {
  const existing = cache.get(key);
  cache.set(key, { bills, sessions: existing?.sessions ?? [], maintenance: existing?.maintenance ?? [], ts: Date.now() });
}

export function setReportSessionsCache(key: string, sessions: Session[]): void {
  const existing = cache.get(key);
  cache.set(key, { bills: existing?.bills ?? [], sessions, maintenance: existing?.maintenance ?? [], ts: Date.now() });
}

export function setReportMaintenanceCache(key: string, maintenance: StationMaintenancePeriod[]): void {
  const existing = cache.get(key);
  cache.set(key, { bills: existing?.bills ?? [], sessions: existing?.sessions ?? [], maintenance, ts: Date.now() });
}

export function invalidateReportCache(prefix: 'bills' | 'sessions' | 'maintenance'): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${prefix}|`)) cache.delete(key);
  }
}
