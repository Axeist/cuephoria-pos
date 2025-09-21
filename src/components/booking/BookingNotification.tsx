import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, Calendar, Clock, MapPin, User, Phone } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationData {
  id: string;
  type: 'new_booking' | 'booking_update' | 'booking_cancel';
  title: string;
  message: string;
  timestamp: Date;
  booking?: {
    id: string;
    customer_name: string;
    customer_phone: string;
    station_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    final_price?: number;
  };
  read: boolean;
}

interface BookingNotificationProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  autoHide?: number;
}

export function BookingNotification({ 
  notification, 
  onDismiss, 
  onMarkAsRead, 
  autoHide = 8000 
}: BookingNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (autoHide > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHide);

      return () => clearTimeout(timer);
    }
  }, [autoHide]);

  useEffect(() => {
    // Play notification sound for new bookings
    if (notification.type === 'new_booking') {
      playNotificationSound();
    }
  }, [notification]);

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(notification.id);
    }, 300);
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'new_booking':
        return <Bell className="h-5 w-5 text-accent" />;
      case 'booking_update':
        return <Clock className="h-5 w-5 text-primary" />;
      case 'booking_cancel':
        return <X className="h-5 w-5 text-destructive" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationColor = () => {
    switch (notification.type) {
      case 'new_booking':
        return 'border-l-accent';
      case 'booking_update':
        return 'border-l-primary';
      case 'booking_cancel':
        return 'border-l-destructive';
      default:
        return 'border-l-muted';
    }
  };

  if (!isVisible) return null;

  return (
    <Card className={`
      fixed top-4 right-4 z-50 min-w-[400px] max-w-[450px] border-l-4 ${getNotificationColor()}
      ${isLeaving ? 'animate-slide-up opacity-0 translate-x-full' : 'animate-slide-down animate-fade-in'}
      ${!notification.read ? 'animate-pulse-glow' : ''}
      transition-all duration-300 ease-in-out cursor-pointer
    `} onClick={handleClick}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {getNotificationIcon()}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">
                  {notification.title}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {notification.message}
              </p>

              {notification.booking && (
                <div className="bg-muted/50 rounded-md p-3 space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{notification.booking.customer_name}</span>
                    <Phone className="h-3 w-3 ml-2" />
                    <span>{notification.booking.customer_phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{notification.booking.station_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(notification.booking.booking_date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{notification.booking.start_time} - {notification.booking.end_time}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      notification.booking.status === 'confirmed' ? 'default' :
                      notification.booking.status === 'cancelled' ? 'destructive' :
                      'secondary'
                    }>
                      {notification.booking.status}
                    </Badge>
                    {notification.booking.final_price && (
                      <span className="text-sm font-semibold">
                        ₹{notification.booking.final_price}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  {format(notification.timestamp, 'HH:mm:ss')}
                </span>
                {!notification.read && (
                  <div className="h-2 w-2 bg-accent rounded-full animate-pulse-soft" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}