import type { CartItem, Station } from '@/types/pos.types';
import type { PrepaidBookingLink, StationBookingRow } from '@/types/prepaidBooking.types';
import { supabase } from '@/integrations/supabase/client';
import { generateId } from '@/utils/pos.utils';
import {
  bookingTodayDate,
  normalizeBookingPhone,
} from '@/utils/prepaidBooking.core';

export {
  bookingToPrepaidLink,
  bookingTodayDate,
  calculatePrepaidOvertimeCost,
  formatBookingSlotLabel,
  getEffectivePlannedDurationMinutes,
  getPrepaidOvertimeMs,
  isOnlinePrepaidBooking,
  isPrepaidSession,
  normalizeBookingPhone,
  parsePrepaidBookingLink,
  pickDefaultPrepaidBooking,
  resolvePrepaidPlayDurationMinutes,
  sessionNeedsPosCheckout,
  getChargeableCartItems,
  prepaidCheckoutHasExtraCharges,
} from '@/utils/prepaidBooking.core';

export interface PrepaidBookingCustomerRef {
  id: string;
  phone?: string | null;
}

const BOOKING_SELECT =
  'id, booking_date, start_time, end_time, duration, status, final_price, original_price, coupon_code, payment_mode, payment_txn_id, customer_id, station_id, location_id';

async function resolveCustomerIdsForBookingLookup(
  customer: PrepaidBookingCustomerRef,
  locationId: string
): Promise<string[]> {
  const ids = new Set<string>([customer.id]);
  const phone = normalizeBookingPhone(customer.phone);

  if (phone) {
    const { data: atBranch } = await supabase
      .from('customers')
      .select('id')
      .eq('location_id', locationId)
      .eq('phone', phone);

    for (const row of atBranch ?? []) {
      if (row.id) ids.add(String(row.id));
    }

    // Legacy rows without location_id on customer
    const { data: byPhone } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone);

    for (const row of byPhone ?? []) {
      if (row.id) ids.add(String(row.id));
    }
  }

  return [...ids];
}

function dedupeBookings(rows: StationBookingRow[]): StationBookingRow[] {
  const seen = new Set<string>();
  const out: StationBookingRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export async function fetchTodayBookingsForStationCustomer(
  stationId: string,
  customer: PrepaidBookingCustomerRef,
  locationId: string
): Promise<StationBookingRow[]> {
  const today = bookingTodayDate();
  const customerIds = await resolveCustomerIdsForBookingLookup(customer, locationId);

  if (customerIds.length === 0) return [];

  const baseQuery = () =>
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('station_id', stationId)
      .eq('booking_date', today)
      .in('status', ['confirmed', 'in-progress'])
      .in('customer_id', customerIds)
      .order('start_time', { ascending: true });

  const { data: atLocation, error: locError } = await baseQuery().eq(
    'location_id',
    locationId
  );

  if (locError) {
    console.error('Failed to fetch today bookings (branch):', locError);
  }

  const collected: StationBookingRow[] = [...((atLocation ?? []) as StationBookingRow[])];

  if (collected.length === 0) {
    const { data: nullLocation, error: nullLocError } = await baseQuery().is(
      'location_id',
      null
    );
    if (nullLocError) {
      console.error('Failed to fetch today bookings (null location):', nullLocError);
    } else if (nullLocation?.length) {
      collected.push(...(nullLocation as StationBookingRow[]));
    }
  }

  if (collected.length === 0) {
    const { data: anyLocation, error: anyError } = await baseQuery();
    if (anyError) {
      console.error('Failed to fetch today bookings (fallback):', anyError);
      return [];
    }
    return dedupeBookings((anyLocation ?? []) as StationBookingRow[]);
  }

  return dedupeBookings(collected);
}

export async function markPrepaidBookingInProgress(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'in-progress' })
    .eq('id', bookingId)
    .in('status', ['confirmed']);

  if (error) {
    console.warn('Could not mark booking in-progress:', error);
  }
}

export async function markPrepaidBookingCompleted(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId);

  if (error) {
    console.warn('Could not mark booking completed:', error);
  }
}

export function buildPrepaidOvertimeCartItem(
  station: Pick<Station, 'name'>,
  customerName: string,
  overtimeMinutes: number,
  cost: number,
  prepaid: PrepaidBookingLink
): CartItem {
  return {
    id: generateId(),
    name: `${station.name} (${customerName}) · ${overtimeMinutes} min overtime (pre-paid ${prepaid.durationMinutes} min)`,
    price: cost,
    quantity: 1,
    total: cost,
    type: 'session',
    stationName: station.name,
  };
}
