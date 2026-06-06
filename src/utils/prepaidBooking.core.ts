import type { CartItem, Session } from '@/types/pos.types';
import type { PrepaidBookingLink, StationBookingRow } from '@/types/prepaidBooking.types';

/** Pure helpers safe for Edge/server bundles (no Supabase client). */

const VENUE_TZ = 'Asia/Kolkata';

export function bookingTodayDate(timeZone = VENUE_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export function normalizeBookingPhone(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function isOnlinePrepaidBooking(
  booking: Pick<StationBookingRow, 'payment_mode' | 'payment_txn_id' | 'final_price'>
): boolean {
  const mode = booking.payment_mode?.toLowerCase();
  if (!mode || mode === 'venue') return false;

  if (booking.payment_txn_id) return true;

  // Razorpay / online rows should count even if txn id is missing from a partial select
  if (mode === 'razorpay' || mode === 'upi' || mode === 'online') {
    return Number(booking.final_price ?? 0) > 0;
  }

  return Number(booking.final_price ?? 0) > 0;
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

export function pickDefaultPrepaidBooking(
  bookings: StationBookingRow[]
): { booking: StationBookingRow; link: PrepaidBookingLink } | null {
  const prepaid = bookings.filter(isOnlinePrepaidBooking);
  if (prepaid.length !== 1) return null;
  const booking = prepaid[0];
  return { booking, link: bookingToPrepaidLink(booking) };
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

export function isPrepaidSession(
  session: Pick<Session, 'prepaidBooking'> | null | undefined
): boolean {
  return Boolean(session?.prepaidBooking?.bookingId);
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

export function sessionNeedsPosCheckout(
  quickShopItemCount: number,
  overtimeMs: number
): boolean {
  return quickShopItemCount > 0 || overtimeMs > 0;
}

/** Items with a positive total — used to avoid opening POS for ₹0 after pre-paid sessions. */
export function getChargeableCartItems(items: CartItem[]): CartItem[] {
  return items.filter((item) => Number(item.total ?? item.price ?? 0) > 0);
}

export function prepaidCheckoutHasExtraCharges(
  quickShopItemCount: number,
  overtimeMs: number,
  incomingItems: CartItem[]
): boolean {
  if (quickShopItemCount > 0 || overtimeMs > 0) return true;
  return getChargeableCartItems(incomingItems).length > 0;
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
