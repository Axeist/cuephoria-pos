import React, { useState } from 'react';
import { Bell, X, CheckCircle2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBookingNotifications } from '@/context/BookingNotificationContext';
import { format } from 'date-fns';

export const GlobalNotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications
  } = useBookingNotifications();
  
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] max-w-[calc(100vw-2rem)] p-0 z-[100]" 
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Bell className="h-5 w-5 text-cuephoria-lightpurple flex-shrink-0" />
              <h3 className="font-semibold text-sm truncate">Booking Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 flex-shrink-0 text-xs px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-7 w-7 p-0"
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </Button>
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs h-7 px-2"
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="text-xs h-7 px-2"
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">New bookings will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notification) => {
                  const { booking, timestamp, isPaid, isRead } = notification;
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 transition-all duration-200 hover:bg-accent/50 cursor-pointer ${
                        !isRead ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'bg-background'
                      } ${
                        isPaid && !isRead
                          ? 'bg-gradient-to-r from-green-500/5 via-blue-500/5 to-green-500/5'
                          : isPaid
                          ? 'bg-gradient-to-r from-green-500/3 via-transparent to-green-500/3'
                          : ''
                      }`}
                      onClick={() => !isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {isPaid ? (
                            <DollarSign className="h-4 w-4 text-green-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Header Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {booking.customer.name}
                            </span>
                            {isPaid && (
                              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50 text-[10px] px-1.5 py-0 h-4">
                                Paid
                              </Badge>
                            )}
                            {!isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                            )}
                          </div>
                          
                          {/* Details */}
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-start gap-1.5">
                              <span className="font-medium text-foreground/70">Station:</span>
                              <span className="break-words">{booking.station.name}</span>
                            </div>
                            <div className="flex items-start gap-1.5 flex-wrap">
                              <span className="font-medium text-foreground/70">Date:</span>
                              <span>
                                {format(new Date(booking.booking_date), 'MMM dd, yyyy')} • {booking.start_time} - {booking.end_time}
                              </span>
                            </div>
                            {booking.final_price && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground/70">Amount:</span>
                                <span className="font-semibold text-foreground">₹{booking.final_price}</span>
                              </div>
                            )}
                            {isPaid && booking.payment_mode && (
                              <div className="flex items-start gap-1.5 flex-wrap">
                                <span className="font-medium text-foreground/70">Payment:</span>
                                <span>{booking.payment_mode === 'razorpay' ? 'Razorpay' : booking.payment_mode}</span>
                                {booking.payment_txn_id && (
                                  <span className="font-mono text-[10px] opacity-60">({booking.payment_txn_id.slice(-8)})</span>
                                )}
                              </div>
                            )}
                            <div className="text-[10px] opacity-60 pt-0.5">
                              {format(timestamp, 'MMM dd, yyyy HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                        
                        {/* Close Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="h-6 w-6 p-0 flex-shrink-0 opacity-60 hover:opacity-100"
                          title="Remove notification"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 border-t bg-muted/30 text-xs text-muted-foreground text-center">
              {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

