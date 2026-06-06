import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStaffNotificationPresentation } from '@/components/notifications/staffNotificationPresentation';
import type { StaffNotification } from '@/types/staffNotification.types';
import { cn } from '@/lib/utils';

interface NotificationListItemProps {
  notification: StaffNotification;
  index: number;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationListItem({
  notification,
  index,
  onMarkRead,
  onRemove,
}: NotificationListItemProps) {
  const { isRead = false, id, timestamp } = notification;
  const presentation = getStaffNotificationPresentation(notification);
  const displayTime =
    timestamp instanceof Date ? timestamp : new Date(timestamp);

  return (
    <div
      className={cn(
        'group relative overflow-hidden py-3 pr-3 transition-all duration-200',
        'glass-card-interactive cursor-pointer border-0 border-b border-white/[0.06] last:border-b-0',
        !isRead
          ? 'border-l-2 border-l-cuephoria-lightpurple/70 bg-gradient-to-r from-white/[0.05] to-transparent pl-3.5'
          : 'pl-3.5 hover:bg-white/[0.03]'
      )}
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={() => !isRead && onMarkRead(id)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
            presentation.iconWrapClass
          )}
        >
          <presentation.Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                {presentation.badgeLabel}
              </span>
              <Badge
                variant="outline"
                className="h-4 border-white/10 bg-white/[0.03] px-1.5 text-[10px] text-white/55"
              >
                {format(displayTime, 'h:mm a')}
              </Badge>
              {!isRead ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cuephoria-lightpurple opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cuephoria-lightpurple" />
                </span>
              ) : null}
            </div>

            <p className="text-[13px] font-semibold leading-snug text-white/95">
              {presentation.title}
            </p>
            {presentation.subtitle ? (
              <p className="truncate text-[12px] font-medium text-cuephoria-lightpurple/85">
                {presentation.subtitle}
              </p>
            ) : null}
          </div>

          {presentation.detailRows.length > 0 ? (
            <div className="space-y-1 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2">
              {presentation.detailRows.slice(0, 2).map((row) => (
                <div
                  key={`${row.label}-${row.value}`}
                  className="grid grid-cols-[64px_1fr] gap-2 text-[11px]"
                >
                  <span className="text-white/35">{row.label}</span>
                  <span
                    className={cn(
                      'truncate text-white/65',
                      row.emphasize && 'font-medium text-emerald-300/90'
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.08]"
          title="Remove notification"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
