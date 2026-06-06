import type { SessionAlertType } from '@/utils/sessionStaffNotifications';

export interface BookingStaffNotification {
  kind: 'booking';
  id: string;
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: string;
    notes?: string;
    original_price?: number | null;
    final_price?: number | null;
    discount_percentage?: number | null;
    coupon_code?: string | null;
    booking_group_id?: string | null;
    status_updated_at?: string | null;
    status_updated_by?: string | null;
    payment_mode?: string | null;
    payment_txn_id?: string | null;
    location_id?: string | null;
    station: { name: string; type: string };
    customer: {
      name: string;
      phone: string;
      email?: string | null;
      created_at?: string;
    };
    booking_views?: unknown[];
    created_at?: string;
  };
  timestamp: Date;
  isPaid: boolean;
  isRead?: boolean;
}

export interface SessionStaffNotification {
  kind: 'session';
  id: string;
  alertType: SessionAlertType;
  sessionId?: string;
  customerId?: string;
  stationId?: string;
  stationName: string;
  customerName: string;
  message: string;
  locationId: string | null;
  timestamp: Date;
  isRead?: boolean;
}

export type StaffNotification = BookingStaffNotification | SessionStaffNotification;

export function isSessionStaffNotification(
  notification: StaffNotification
): notification is SessionStaffNotification {
  return notification.kind === 'session';
}

export function isBookingStaffNotification(
  notification: StaffNotification
): notification is BookingStaffNotification {
  return notification.kind === 'booking';
}
