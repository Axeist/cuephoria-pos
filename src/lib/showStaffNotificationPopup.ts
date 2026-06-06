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
      <div className="relative w-[min(100vw-2rem,22rem)] overflow-hidden">
        <StaffNotificationPopup notification={notification} toastId={toastId} />
      </div>
    ),
    {
      id: notification.id,
      duration,
      position: 'top-right',
      unstyled: true,
      classNames: {
        toast:
          '!p-0 !m-0 !w-auto !max-w-none !bg-transparent !border-0 !shadow-none !overflow-hidden',
      },
    }
  );
}
