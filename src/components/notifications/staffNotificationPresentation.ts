import { format } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  Calendar,
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

export interface StaffNotificationPresentation {
  tone: StaffNotificationTone;
  title: string;
  subtitle: string;
  detail?: string;
  meta?: string;
  Icon: LucideIcon;
  accentClass: string;
  iconWrapClass: string;
  badgeLabel: string;
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

    const accentClass =
      tone === 'session-danger'
        ? 'from-red-500/80 via-rose-500/50 to-transparent border-red-400/35 shadow-[0_0_40px_-8px_rgba(239,68,68,0.45)]'
        : tone === 'session-warning'
          ? 'from-amber-500/80 via-orange-500/45 to-transparent border-amber-400/35 shadow-[0_0_40px_-8px_rgba(245,158,11,0.4)]'
          : 'from-cuephoria-lightpurple/80 via-cuephoria-purple/45 to-transparent border-cuephoria-lightpurple/35 shadow-[0_0_40px_-8px_rgba(155,135,245,0.45)]';

    const iconWrapClass =
      tone === 'session-danger'
        ? 'bg-red-500/15 text-red-300 ring-red-400/25'
        : tone === 'session-warning'
          ? 'bg-amber-500/15 text-amber-300 ring-amber-400/25'
          : 'bg-cuephoria-purple/20 text-cuephoria-lightpurple ring-cuephoria-lightpurple/25';

    return {
      tone,
      title: sessionAlertTitle(notification.alertType),
      subtitle: notification.customerName,
      detail: notification.message,
      meta: notification.stationName,
      Icon,
      accentClass,
      iconWrapClass,
      badgeLabel: 'Session',
    };
  }

  if (isBookingStaffNotification(notification)) {
    const { booking, isPaid } = notification;
    const customerName = booking.customer?.name ?? 'Customer';
    const stationName = booking.station?.name ?? 'Station';
    const bookingDate = booking.booking_date
      ? format(new Date(booking.booking_date), 'MMM dd')
      : '—';
    const accentClass = isPaid
      ? 'from-emerald-500/80 via-green-500/45 to-transparent border-emerald-400/35 shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)]'
      : 'from-cuephoria-lightpurple/80 via-sky-500/40 to-transparent border-cuephoria-lightpurple/35 shadow-[0_0_40px_-8px_rgba(155,135,245,0.45)]';

    const iconWrapClass = isPaid
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25'
      : 'bg-cuephoria-purple/20 text-cuephoria-lightpurple ring-cuephoria-lightpurple/25';

    return {
      tone: isPaid ? 'booking-paid' : 'booking',
      title: isPaid ? 'New paid booking' : 'New booking',
      subtitle: customerName,
      detail: `${stationName} · ${bookingDate} · ${booking.start_time ?? '—'}`,
      meta: booking.final_price ? `₹${booking.final_price}` : undefined,
      Icon: isPaid ? DollarSign : CheckCircle2,
      accentClass,
      iconWrapClass,
      badgeLabel: 'Booking',
    };
  }

  return {
    tone: 'booking',
    title: 'Notification',
    subtitle: '',
    Icon: Bell,
    accentClass:
      'from-cuephoria-lightpurple/80 via-cuephoria-purple/45 to-transparent border-cuephoria-lightpurple/35',
    iconWrapClass: 'bg-cuephoria-purple/20 text-cuephoria-lightpurple ring-cuephoria-lightpurple/25',
    badgeLabel: 'Alert',
  };
}
