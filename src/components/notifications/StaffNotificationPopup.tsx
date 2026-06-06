import React from 'react';
import { format } from 'date-fns';
import { Calendar, X } from 'lucide-react';
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
        'animate-notification-pop relative isolate min-w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-l-[3px] backdrop-blur-2xl',
        'bg-[linear-gradient(165deg,color-mix(in_oklab,var(--brand-primary-hex)_18%,rgba(255,255,255,0.05))_0%,rgba(6,4,14,0.94)_55%,rgba(4,3,10,0.98)_100%)]',
        presentation.accentClass
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl opacity-30"
        style={{
          background: 'radial-gradient(circle, var(--brand-primary-hex) 0%, transparent 70%)',
        }}
      />

      <div className="relative p-4 pr-10">
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
              presentation.iconWrapClass
            )}
          >
            <presentation.Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {presentation.badgeLabel}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="text-[10px] tabular-nums text-white/40">
                  {format(timestamp, 'HH:mm:ss')}
                </span>
              </div>
              <p className="font-heading text-[15px] font-semibold leading-snug text-white">
                {presentation.title}
              </p>
              <p className="text-[13px] font-medium text-cuephoria-lightpurple/90">
                {presentation.subtitle}
              </p>
            </div>

            {presentation.detail ? (
              <p className="text-[12px] leading-relaxed text-white/70">{presentation.detail}</p>
            ) : null}

            {presentation.meta ? (
              <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">{presentation.meta}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
