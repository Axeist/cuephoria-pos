import { toast } from 'sonner';
import { StaffNotificationPopup } from '@/components/notifications/StaffNotificationPopup';
import type { StaffNotification } from '@/types/staffNotification.types';
import { isSessionStaffNotification } from '@/types/staffNotification.types';

const POPUP_DURATION_MS = 9000;

export function showStaffNotificationPopup(notification: StaffNotification): void {
  const duration = isSessionStaffNotification(notification)
    ? POPUP_DURATION_MS
    : 7500;

  toast.custom(
    (toastId) => (
      <StaffNotificationPopup notification={notification} toastId={toastId} />
    ),
    {
      id: notification.id,
      duration,
      position: 'top-right',
      unstyled: true,
      classNames: {
        toast: '!p-0 !bg-transparent !border-0 !shadow-none !overflow-visible',
      },
    }
  );
}
