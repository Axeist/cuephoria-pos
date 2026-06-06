import { format } from 'date-fns';
import type { CartItem, Session, Station } from '@/types/pos.types';
import type { PrepaidBookingLink, StationBookingRow } from '@/types/prepaidBooking.types';
import { supabase } from '@/integrations/supabase/client';
import { generateId } from '@/utils/pos.utils';

export function isOnlinePrepaidBooking(
  booking: Pick<StationBookingRow, 'payment_mode' | 'payment_txn_id'>
): boolean {
  return Boolean(
    booking.payment_mode && booking.payment_mode !== 'venue' && booking.payment_txn_id
  );
}

export function bookingToPrepaidLink(booking: StationBookingRow): PrepaidBookingLink {
  return {
    bookingId: booking.id,
    paidAmount: Number(booking.final_price ?? 0),
    originalPrice: booking.original_price,
    durationMinutes: Number(booking.duration) || 60,
    slotStartTime: booking.start_time.slice(0, 5),
    slotEndTime: booking.end_time.slice(0, 5),
    paymentMode: booking.payment_mode ?? 'online',
    couponCode: booking.coupon_code,
  };
}

export function parsePrepaidBookingLink(raw: unknown): PrepaidBookingLink | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  if (typeof data.bookingId !== 'string' || !data.bookingId) return undefined;
  return {
    bookingId: data.bookingId,
    paidAmount: Number(data.paidAmount ?? 0),
    originalPrice:
      data.originalPrice != null ? Number(data.originalPrice) : null,
    durationMinutes: Number(data.durationMinutes) || 60,
    slotStartTime: String(data.slotStartTime ?? ''),
    slotEndTime: String(data.slotEndTime ?? ''),
    paymentMode: String(data.paymentMode ?? 'online'),
    couponCode: typeof data.couponCode === 'string' ? data.couponCode : null,
  };
}

export function isPrepaidSession(session: Pick<Session, 'prepaidBooking'> | null | undefined): boolean {
  return Boolean(session?.prepaidBooking?.bookingId);
}

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

export function getPrepaidOvertimeMs(
  session: Pick<
    Session,
    'prepaidBooking' | 'startTime' | 'isPaused' | 'pausedAt' | 'totalPausedMs'
  >,
  billableMs: number
): number {
  const prepaid = session.prepaidBooking;
  if (!prepaid) return 0;
  const coveredMs = prepaid.durationMinutes * 60 * 1000;
  return Math.max(0, billableMs - coveredMs);
}

export function calculatePrepaidOvertimeCost(
  hourlyRate: number,
  overtimeMs: number,
  isMember = false
): { overtimeMinutes: number; cost: number } {
  if (overtimeMs <= 0) {
    return { overtimeMinutes: 0, cost: 0 };
  }
  const overtimeMinutes = Math.max(1, Math.ceil(overtimeMs / 60000));
  let cost = Math.ceil((overtimeMinutes / 60) * hourlyRate);
  if (isMember) {
    cost = Math.ceil(cost * 0.5);
  }
  return { overtimeMinutes, cost };
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

export function sessionNeedsPosCheckout(
  quickShopItemCount: number,
  overtimeMs: number
): boolean {
  return quickShopItemCount > 0 || overtimeMs > 0;
}

export function formatBookingSlotLabel(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
