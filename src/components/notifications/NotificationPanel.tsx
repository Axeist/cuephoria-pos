import { Bell, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import type { StaffNotification } from '@/types/staffNotification.types';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  notifications: StaffNotification[];
  unreadCount: number;
  activeLocationName?: string;
  activeLocationSlug?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  activeLocationName,
  activeLocationSlug,
  soundEnabled,
  onToggleSound,
  onMarkAllAsRead,
  onClearAll,
  onMarkRead,
  onRemove,
}: NotificationPanelProps) {
  return (
    <div className="flex max-h-[min(70vh,640px)] flex-col overflow-hidden">
      <div className="relative border-b border-white/10 px-4 py-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(120% 140% at 0% -20%, color-mix(in oklab, var(--brand-primary-hex) 28%, transparent) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cuephoria-lightpurple/25 bg-cuephoria-purple/15">
              <Bell className="h-4 w-4 text-cuephoria-lightpurple" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-heading text-sm font-semibold text-white">Notifications</h3>
              {activeLocationName ? (
                <p className="truncate text-[10px] text-white/45">
                  {activeLocationName}
                  {activeLocationSlug === 'lite' ? ' · Lite branch' : ' · Main branch'}
                </p>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <Badge className="ml-1 shrink-0 border-cuephoria-lightpurple/30 bg-cuephoria-purple/25 px-1.5 text-[10px] text-cuephoria-lightpurple">
                {unreadCount} new
              </Badge>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSound}
              className={cn(
                'h-8 w-8 p-0 border border-transparent hover:border-white/10 hover:bg-white/[0.06]',
                soundEnabled ? 'text-cuephoria-lightpurple' : 'text-white/40'
              )}
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {notifications.length > 0 ? (
              <>
                {unreadCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAllAsRead}
                    className="h-8 px-2 text-[11px] text-white/70 hover:bg-white/[0.06] hover:text-white"
                  >
                    Mark read
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 px-2 text-[11px] text-white/70 hover:bg-white/[0.06] hover:text-white"
                >
                  Clear
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Bell className="h-7 w-7 text-cuephoria-lightpurple/50" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[rgba(6,4,14,0.95)] bg-cuephoria-lightpurple/80" />
            </div>
            <p className="text-sm font-medium text-white/80">All caught up</p>
            <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-white/45">
              Bookings and session alerts will pop up here when something needs your attention.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in divide-y divide-white/[0.04]">
            {notifications.map((notification, index) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                index={index}
                onMarkRead={onMarkRead}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="border-t border-white/10 bg-white/[0.02] px-3 py-2 text-center text-[11px] text-white/40">
          {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
        </div>
      ) : null}
    </div>
  );
}
