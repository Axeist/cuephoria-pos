import { format, parse } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import type { StaffNotification } from '@/types/staffNotification.types';
import { isBookingStaffNotification, isSessionStaffNotification } from '@/types/staffNotification.types';
import { sessionAlertTitle } from '@/utils/sessionStaffNotifications';

export type StaffNotificationTone = 'booking' | 'booking-paid' | 'session-warning' | 'session-danger' | 'session-info';

export interface StaffNotificationDetailRow {
  label: string;
  value: string;
  emphasize?: boolean;
}

export interface StaffNotificationPresentation {
  tone: StaffNotificationTone;
  title: string;
  subtitle: string;
  detailRows: StaffNotificationDetailRow[];
  Icon: LucideIcon;
  stripClass: string;
  iconWrapClass: string;
  badgeLabel: string;
}

function formatBookingTime(time: string): string {
  try {
    const parsed = parse(time.slice(0, 8), 'HH:mm:ss', new Date());
    return format(parsed, 'h:mm a');
  } catch {
    return time;
  }
}

export function getStaffNotificationPresentation(
  notification: StaffNotification
): StaffNotificationPresentation {
  if (isSessionStaffNotification(notification)) {
    const tone: StaffNotificationTone =
      notification.alertType === 'overdue_active'
        ? 'session-danger'
        : notification.alertType === 'unsettled_checkout'
          ? 'session-warning'
          : 'session-info';

    const Icon =
      notification.alertType === 'unsettled_checkout'
        ? Receipt
        : notification.alertType === 'overdue_active'
          ? AlertTriangle
          : Clock;

    const stripClass =
      tone === 'session-danger'
        ? 'from-red-400 via-rose-500/80 to-transparent'
        : tone === 'session-warning'
          ? 'from-amber-400 via-orange-500/70 to-transparent'
          : 'from-cuephoria-lightpurple via-cuephoria-purple/80 to-transparent';

    const iconWrapClass =
      tone === 'session-danger'
        ? 'bg-red-500/15 text-red-300 ring-red-400/20'
        : tone === 'session-warning'
          ? 'bg-amber-500/15 text-amber-300 ring-amber-400/20'
          : 'bg-cuephoria-purple/20 text-cuephoria-lightpurple ring-cuephoria-lightpurple/20';

    return {
      tone,
      title: sessionAlertTitle(notification.alertType),
      subtitle: notification.customerName,
      detailRows: [
        { label: 'Station', value: notification.stationName },
        { label: 'Details', value: notification.message },
      ],
      Icon,
      stripClass,
      iconWrapClass,
      badgeLabel: 'Session',
    };
  }

  if (isBookingStaffNotification(notification)) {
    const { booking, isPaid } = notification;
    const customerName = booking.customer?.name ?? 'Customer';
    const stationName = booking.station?.name ?? 'Station';
    const bookingDate = booking.booking_date
      ? format(new Date(booking.booking_date), 'EEE, MMM d')
      : '—';
    const bookingTime = booking.start_time
      ? formatBookingTime(booking.start_time)
      : '—';

    const stripClass = isPaid
      ? 'from-emerald-400 via-green-500/70 to-transparent'
      : 'from-cuephoria-lightpurple via-cuephoria-purple/80 to-transparent';

    const iconWrapClass = isPaid
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20'
      : 'bg-cuephoria-purple/20 text-cuephoria-lightpurple ring-cuephoria-lightpurple/20';

    const detailRows: StaffNotificationDetailRow[] = [
      { label: 'Station', value: stationName },
      { label: 'When', value: `${bookingDate} · ${bookingTime}` },
    ];

    if (booking.final_price) {
      detailRows.push({
        label: isPaid ? 'Paid' : 'Amount',
        value: `₹${booking.final_price}`,
        emphasize: true,
      });
    }

    return {
      tone: isPaid ? 'booking-paid' : 'booking',
      title: isPaid ? 'New paid booking' : 'New booking',
      subtitle: customerName,
      detailRows,
      Icon: isPaid ? DollarSign : CheckCircle2,
      stripClass,
      iconWrapClass,
      badgeLabel: isPaid ? 'Paid booking' : 'Booking',
    };
  }

  return {
    tone: 'booking',
    title: 'Notification',
    subtitle: '',
    detailRows: [],
    Icon: Bell,
    stripClass: 'from-cuephoria-lightpurple via-cuephoria-purple/80 to-transparent',
    iconWrapClass: 'bg-cuephoria-purple/20 text-cuephoria-lightpurple ring-cuephoria-lightpurple/20',
    badgeLabel: 'Alert',
  };
}
