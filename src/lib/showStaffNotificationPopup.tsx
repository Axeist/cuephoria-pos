import { toast } from 'sonner';
import { StaffNotificationPopup } from '@/components/notifications/StaffNotificationPopup';
import type { StaffNotification } from '@/types/staffNotification.types';
import { isSessionStaffNotification, isBookingStaffNotification, isPlatformStaffNotification } from '@/types/staffNotification.types';

const POPUP_DURATION_MS = 9000;
const PLATFORM_POPUP_DURATION_MS = 14_000;

function staffNotificationToastId(notification: StaffNotification): string {
  if (isBookingStaffNotification(notification)) {
    return `staff-booking-${notification.booking.id}`;
  }
  if (isPlatformStaffNotification(notification) && notification.broadcastId) {
    return `staff-platform-${notification.broadcastId}`;
  }
  return notification.id;
}

export function showStaffNotificationPopup(notification: StaffNotification): void {
  const duration = isPlatformStaffNotification(notification)
    ? PLATFORM_POPUP_DURATION_MS
    : isSessionStaffNotification(notification)
      ? POPUP_DURATION_MS
      : 7500;

  toast.custom(
    (toastId) => (
      <StaffNotificationPopup notification={notification} toastId={toastId} />
    ),
    {
      id: staffNotificationToastId(notification),
      duration,
      position: 'top-right',
      unstyled: true,
      classNames: {
        toast:
          'staff-notification-toast !p-0 !m-0 !h-auto !min-h-0 !w-[min(calc(100vw-2rem),340px)] !max-w-[340px] !bg-transparent !border-0 !shadow-none !overflow-visible',
      },
    }
  );
}
