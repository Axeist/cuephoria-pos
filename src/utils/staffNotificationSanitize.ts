import type {
  BookingStaffNotification,
  PlatformStaffNotification,
  SessionStaffNotification,
  StaffNotification,
} from '@/types/staffNotification.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

export function isSessionStaffNotification(
  notification: StaffNotification
): notification is SessionStaffNotification {
  return (
    notification?.kind === 'session' &&
    typeof notification.alertType === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.stationName === 'string'
  );
}

export function isBookingStaffNotification(
  notification: StaffNotification
): notification is BookingStaffNotification {
  const booking = isRecord(notification) ? notification.booking : undefined;
  const bookingId = isRecord(booking) ? booking.id : null;
  return (
    notification?.kind === 'booking' &&
    isRecord(booking) &&
    bookingId != null &&
    String(bookingId).length > 0 &&
    isRecord(booking.customer) &&
    isRecord(booking.station)
  );
}

export function isPlatformStaffNotification(
  notification: StaffNotification
): notification is PlatformStaffNotification {
  return (
    notification?.kind === 'platform' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string'
  );
}

const PLATFORM_SEVERITIES = new Set(['info', 'warning', 'critical', 'success']);

export function sanitizeStaffNotification(raw: unknown): StaffNotification | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;

  const timestamp =
    raw.timestamp instanceof Date
      ? raw.timestamp
      : new Date(String(raw.timestamp ?? Date.now()));
  if (Number.isNaN(timestamp.getTime())) return null;

  if (raw.kind === 'platform') {
    const severity = typeof raw.severity === 'string' ? raw.severity : 'info';
    return {
      kind: 'platform',
      id: raw.id,
      title: typeof raw.title === 'string' ? raw.title : 'Platform notice',
      message: typeof raw.message === 'string' ? raw.message : '',
      severity: PLATFORM_SEVERITIES.has(severity)
        ? (severity as PlatformStaffNotification['severity'])
        : 'info',
      broadcastId: typeof raw.broadcastId === 'string' ? raw.broadcastId : undefined,
      fromLabel: typeof raw.fromLabel === 'string' ? raw.fromLabel : 'Cuetronix Platform',
      adminName: typeof raw.adminName === 'string' ? raw.adminName : undefined,
      adminEmail: typeof raw.adminEmail === 'string' ? raw.adminEmail : undefined,
      targetType:
        raw.targetType === 'organization' || raw.targetType === 'all'
          ? raw.targetType
          : undefined,
      organizationName:
        typeof raw.organizationName === 'string' ? raw.organizationName : null,
      locationId: typeof raw.locationId === 'string' ? raw.locationId : null,
      timestamp,
      isRead: Boolean(raw.isRead),
    };
  }

  if (raw.kind === 'session') {
    if (typeof raw.alertType !== 'string' || typeof raw.message !== 'string') return null;
    return {
      kind: 'session',
      id: raw.id,
      alertType: raw.alertType as SessionStaffNotification['alertType'],
      sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : undefined,
      customerId: typeof raw.customerId === 'string' ? raw.customerId : undefined,
      stationId: typeof raw.stationId === 'string' ? raw.stationId : undefined,
      stationName: typeof raw.stationName === 'string' ? raw.stationName : 'Station',
      customerName: typeof raw.customerName === 'string' ? raw.customerName : 'Customer',
      message: raw.message,
      locationId: typeof raw.locationId === 'string' ? raw.locationId : null,
      timestamp,
      isRead: Boolean(raw.isRead),
    };
  }

  const booking = isRecord(raw.booking) ? raw.booking : null;
  if (!booking || booking.id == null || String(booking.id).length === 0) return null;

  const bookingId = String(booking.id);

  const station = isRecord(booking.station) ? booking.station : { name: 'Unknown', type: 'unknown' };
  const customer = isRecord(booking.customer)
    ? booking.customer
    : { name: 'Unknown', phone: '' };

  return {
    kind: 'booking',
    id: raw.id,
    booking: {
      ...(booking as BookingStaffNotification['booking']),
      id: bookingId,
      station: {
        name: typeof station.name === 'string' ? station.name : 'Unknown',
        type: typeof station.type === 'string' ? station.type : 'unknown',
      },
      customer: {
        name: typeof customer.name === 'string' ? customer.name : 'Unknown',
        phone: typeof customer.phone === 'string' ? customer.phone : '',
        email: typeof customer.email === 'string' ? customer.email : null,
        created_at: typeof customer.created_at === 'string' ? customer.created_at : undefined,
      },
      location_id:
        typeof booking.location_id === 'string' ? booking.location_id : null,
    },
    timestamp,
    isPaid: Boolean(raw.isPaid),
    isRead: Boolean(raw.isRead),
  };
}

export function sanitizeStaffNotifications(items: unknown[]): StaffNotification[] {
  return items
    .map((item) => sanitizeStaffNotification(item))
    .filter((item): item is StaffNotification => item != null);
}
