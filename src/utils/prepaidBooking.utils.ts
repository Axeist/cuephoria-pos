import { format } from 'date-fns';
import type { CartItem, Station } from '@/types/pos.types';
import type { PrepaidBookingLink, StationBookingRow } from '@/types/prepaidBooking.types';
import { supabase } from '@/integrations/supabase/client';
import { generateId } from '@/utils/pos.utils';

export {
  bookingToPrepaidLink,
  calculatePrepaidOvertimeCost,
  formatBookingSlotLabel,
  getPrepaidOvertimeMs,
  isOnlinePrepaidBooking,
  isPrepaidSession,
  parsePrepaidBookingLink,
  sessionNeedsPosCheckout,
} from '@/utils/prepaidBooking.core';

export async function fetchTodayBookingsForStationCustomer(
  stationId: string,
  customerId: string,
  locationId: string
): Promise<StationBookingRow[]> {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, booking_date, start_time, end_time, duration, status, final_price, original_price, coupon_code, payment_mode, payment_txn_id, customer_id, station_id'
    )
    .eq('station_id', stationId)
    .eq('customer_id', customerId)
    .eq('location_id', locationId)
    .eq('booking_date', today)
    .in('status', ['confirmed', 'in-progress'])
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch today bookings for session start:', error);
    return [];
  }

  return (data ?? []) as StationBookingRow[];
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
