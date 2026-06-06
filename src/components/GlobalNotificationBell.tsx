import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { useBookingNotifications } from '@/context/BookingNotificationContext';
import { useLocation } from '@/context/LocationContext';
import { cn } from '@/lib/utils';

export const GlobalNotificationBell: React.FC = () => {
  const { activeLocation } = useLocation();
  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    ringSignal,
  } = useBookingNotifications();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    if (ringSignal <= 0) return;
    setIsRinging(true);
    const timer = window.setTimeout(() => setIsRinging(false), 900);
    return () => window.clearTimeout(timer);
  }, [ringSignal]);

  return (
    <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'relative h-9 w-9 border-white/10 bg-white/[0.04] p-0 shadow-inner shadow-white/[0.03]',
            'transition-all duration-300 hover:border-cuephoria-lightpurple/35 hover:bg-cuephoria-purple/10',
            unreadCount > 0 &&
              'border-cuephoria-lightpurple/30 bg-cuephoria-purple/10 shadow-[0_0_20px_-4px_rgba(155,135,245,0.35)]'
          )}
        >
          <Bell
            className={cn(
              'h-4 w-4 text-cuephoria-lightpurple transition-transform',
              isRinging && 'animate-bell-ring'
            )}
          />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[rgba(6,4,14,0.9)] bg-gradient-to-br from-cuephoria-lightpurple to-cuephoria-purple px-1 text-[10px] font-bold text-white shadow-lg shadow-cuephoria-purple/40">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="glass-card w-[min(100vw-2rem,420px)] overflow-hidden border-white/10 p-0 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.75)] animate-scale-in z-[100]"
        align="end"
        sideOffset={10}
      >
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          activeLocationName={activeLocation?.name}
          activeLocationSlug={activeLocation?.slug}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAllNotifications}
          onMarkRead={markAsRead}
          onRemove={removeNotification}
        />
      </PopoverContent>
    </Popover>
  );
};
