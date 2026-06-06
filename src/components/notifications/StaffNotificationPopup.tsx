import React from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { StaffNotification } from '@/types/staffNotification.types';
import { getStaffNotificationPresentation } from '@/components/notifications/staffNotificationPresentation';
import { cn } from '@/lib/utils';

interface StaffNotificationPopupProps {
  notification: StaffNotification;
  toastId: string | number;
}

export const StaffNotificationPopup: React.FC<StaffNotificationPopupProps> = ({
  notification,
  toastId,
}) => {
  const presentation = getStaffNotificationPresentation(notification);
  const timestamp =
    notification.timestamp instanceof Date
      ? notification.timestamp
      : new Date(notification.timestamp);

  return (
    <div
      className={cn(
        'animate-notification-pop relative isolate w-full overflow-hidden rounded-2xl',
        'border border-white/10 bg-[rgba(8,6,18,0.96)] backdrop-blur-2xl',
        'shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)_inset]'
      )}
    >
      <div
        aria-hidden
        className={cn(
          'h-[2px] w-full bg-gradient-to-r',
          presentation.stripClass
        )}
      />

      <div className="relative px-4 pb-4 pt-3.5">
        <div className="mb-3 flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
              presentation.iconWrapClass
            )}
          >
            <presentation.Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-[0.14em]',
                  presentation.isPlatform
                    ? 'bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent'
                    : 'text-white/45'
                )}
              >
                {presentation.badgeLabel}
              </span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" />
              <span className="text-[10px] tabular-nums text-white/40">
                {format(timestamp, 'h:mm a')}
              </span>
            </div>

            <p className="mt-1 font-heading text-[16px] font-semibold leading-tight tracking-tight text-white">
              {presentation.title}
            </p>

            {presentation.subtitle ? (
              <p
                className={cn(
                  'mt-0.5 truncate text-[13px] font-medium',
                  presentation.isPlatform
                    ? 'bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent'
                    : 'text-cuephoria-lightpurple/90'
                )}
              >
                {presentation.subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => toast.dismiss(toastId)}
            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {presentation.detailRows.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            {presentation.detailRows.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="grid grid-cols-[72px_1fr] items-baseline gap-x-3 gap-y-0.5"
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-white/35">
                  {row.label}
                </span>
                <span
                  className={cn(
                    'text-[12px] leading-snug text-white/80',
                    row.emphasize && 'font-semibold text-emerald-300'
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
