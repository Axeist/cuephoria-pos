import { format, parse } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  Megaphone,
  Receipt,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { StaffNotification } from '@/types/staffNotification.types';
import { isBookingStaffNotification, isSessionStaffNotification, isPlatformStaffNotification } from '@/types/staffNotification.types';
import { sessionAlertTitle } from '@/utils/sessionStaffNotifications';

export type StaffNotificationTone =
  | 'booking'
  | 'booking-paid'
  | 'session-warning'
  | 'session-danger'
  | 'session-info'
  | 'platform-info'
  | 'platform-warning'
  | 'platform-critical'
  | 'platform-success';

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
  /** Platform admin broadcasts get distinct chrome in list + popup. */
  isPlatform?: boolean;
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
  if (isPlatformStaffNotification(notification)) {
    const tone: StaffNotificationTone =
      notification.severity === 'critical'
        ? 'platform-critical'
        : notification.severity === 'warning'
          ? 'platform-warning'
          : notification.severity === 'success'
            ? 'platform-success'
            : 'platform-info';

    const stripClass =
      tone === 'platform-critical'
        ? 'from-rose-400 via-red-500/90 to-fuchsia-500/70'
        : tone === 'platform-warning'
          ? 'from-amber-400 via-orange-500/80 to-yellow-400/60'
          : tone === 'platform-success'
            ? 'from-emerald-400 via-teal-500/80 to-cyan-400/60'
            : 'from-indigo-400 via-violet-500/90 to-cyan-400/70';

    const iconWrapClass =
      tone === 'platform-critical'
        ? 'bg-gradient-to-br from-rose-500/25 to-red-600/15 text-rose-200 ring-rose-400/35 shadow-[0_0_20px_-4px_rgba(244,63,94,0.45)]'
        : tone === 'platform-warning'
          ? 'bg-gradient-to-br from-amber-500/25 to-orange-600/15 text-amber-100 ring-amber-400/35'
          : tone === 'platform-success'
            ? 'bg-gradient-to-br from-emerald-500/25 to-teal-600/15 text-emerald-100 ring-emerald-400/35'
            : 'bg-gradient-to-br from-indigo-500/30 via-violet-600/20 to-cyan-500/15 text-cyan-100 ring-indigo-400/40 shadow-[0_0_22px_-4px_rgba(99,102,241,0.5)]';

    const detailRows: StaffNotificationDetailRow[] = [
      { label: 'Message', value: notification.message },
    ];
    if (notification.adminName) {
      detailRows.push({ label: 'Sent by', value: notification.adminName });
    }
    if (notification.targetType === 'organization' && notification.organizationName) {
      detailRows.push({ label: 'Workspace', value: notification.organizationName });
    }

    return {
      tone,
      title: notification.title,
      subtitle: notification.fromLabel,
      detailRows,
      Icon: tone === 'platform-critical' ? Shield : Megaphone,
      stripClass,
      iconWrapClass,
      badgeLabel: 'Cuetronix Platform',
      isPlatform: true,
    };
  }

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
