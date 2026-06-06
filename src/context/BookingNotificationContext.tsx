import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/context/LocationContext';
import { useSessionStaffNotificationMonitor } from '@/hooks/useSessionStaffNotificationMonitor';
import { showStaffNotificationPopup } from '@/lib/showStaffNotificationPopup';
import { playStaffNotificationSound } from '@/lib/staffNotificationSound';
import {
  type BookingStaffNotification,
  type SessionStaffNotification,
  type StaffNotification,
  isBookingStaffNotification,
  isSessionStaffNotification,
} from '@/types/staffNotification.types';
import { sanitizeStaffNotifications } from '@/utils/staffNotificationSanitize';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  original_price?: number | null;
  final_price?: number | null;
  discount_percentage?: number | null;
  coupon_code?: string | null;
  booking_group_id?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  payment_mode?: string | null;
  payment_txn_id?: string | null;
  /** When set, notification is shown only for this branch in the bell */
  location_id?: string | null;
  station: {
    name: string;
    type: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    created_at?: string;
  };
  booking_views?: any[];
  created_at?: string;
}

function notificationMatchesActiveBranch(
  n: StaffNotification,
  activeLocationId: string | null,
  locations: { id: string; slug: string }[]
): boolean {
  if (!activeLocationId) return true;
  const mainId = locations.find((l) => l.slug === 'main')?.id;

  if (isSessionStaffNotification(n)) {
    const lid = n.locationId ?? null;
    if (!lid) return mainId != null && activeLocationId === mainId;
    return lid === activeLocationId;
  }

  if (isBookingStaffNotification(n)) {
    const lid = n.booking.location_id ?? null;
    if (!lid) return mainId != null && activeLocationId === mainId;
    return lid === activeLocationId;
  }

  return false;
}

interface BookingNotificationContextType {
  notifications: StaffNotification[];
  unreadCount: number;
  ringSignal: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
}

const BookingNotificationContext = createContext<BookingNotificationContextType | undefined>(undefined);

export const BookingNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeLocationId, locations } = useLocation();
  const mainLocationId = useMemo(
    () => locations.find((l) => l.slug === 'main')?.id ?? null,
    [locations]
  );

  // Load from localStorage on mount
  const [notifications, setNotifications] = useState<StaffNotification[]>(() => {
    try {
      const saved = localStorage.getItem('booking-notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = new Date();
        const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);
        
        const loaded = sanitizeStaffNotifications(parsed).filter(
          (n) => n.timestamp.getTime() > oneDayAgo
        );
        
        if (loaded.length < parsed.length) {
          localStorage.setItem('booking-notifications', JSON.stringify(loaded));
        }
        
        return loaded;
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
    return [];
  });

  const [previousBookingIds, setPreviousBookingIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('booking-previous-ids');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading previous booking IDs from localStorage:', error);
    }
    return new Set();
  });

  // Use ref to track previousBookingIds without causing subscription re-creation
  const previousBookingIdsRef = useRef<Set<string>>(previousBookingIds);
  const activeLocationIdRef = useRef<string | null>(activeLocationId);
  const mainLocationIdRef = useRef<string | null>(mainLocationId);

  useEffect(() => {
    activeLocationIdRef.current = activeLocationId;
  }, [activeLocationId]);
  useEffect(() => {
    mainLocationIdRef.current = mainLocationId;
  }, [mainLocationId]);

  // Keep ref in sync with state
  useEffect(() => {
    previousBookingIdsRef.current = previousBookingIds;
  }, [previousBookingIds]);

  const [soundEnabled, setSoundEnabledState] = useState(() => {
    try {
      const saved = localStorage.getItem('booking-sound-enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [ringSignal, setRingSignal] = useState(0);
  const ringSignalRef = useRef(0);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('booking-notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('booking-previous-ids', JSON.stringify(Array.from(previousBookingIds)));
    } catch (error) {
      console.error('Error saving previous booking IDs to localStorage:', error);
    }
  }, [previousBookingIds]);

  useEffect(() => {
    try {
      localStorage.setItem('booking-sound-enabled', JSON.stringify(soundEnabled));
    } catch (error) {
      console.error('Error saving sound setting to localStorage:', error);
    }
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
  }, []);

  const presentStaffNotification = useCallback((notification: StaffNotification) => {
    showStaffNotificationPopup(notification);
    ringSignalRef.current += 1;
    setRingSignal(ringSignalRef.current);
    if (soundEnabledRef.current) {
      playStaffNotificationSound(notification);
    }
  }, []);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((n) =>
        notificationMatchesActiveBranch(n, activeLocationId, locations)
      ),
    [notifications, activeLocationId, locations]
  );

  const fetchBookingDetailsRef = useRef(async (bookingId: string): Promise<Booking | null> => {
    try {
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          status,
          notes,
          original_price,
          final_price,
          discount_percentage,
          coupon_code,
          booking_group_id,
          status_updated_at,
          status_updated_by,
          payment_mode,
          payment_txn_id,
          location_id,
          station_id,
          customer_id,
          created_at,
          booking_views!booking_id (
            id,
            booking_id,
            access_code,
            created_at,
            last_accessed_at
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      if (!bookingData) return null;

      // Fetch station and customer details
      const [{ data: stationData }, { data: customerData }] = await Promise.all([
        supabase.from('stations').select('id, name, type').eq('id', bookingData.station_id).single(),
        supabase.from('customers').select('id, name, phone, email, created_at').eq('id', bookingData.customer_id).single()
      ]);

      const booking: Booking = {
        id: bookingData.id,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        duration: bookingData.duration,
        status: bookingData.status,
        notes: bookingData.notes ?? undefined,
        original_price: bookingData.original_price ?? null,
        final_price: bookingData.final_price ?? null,
        discount_percentage: bookingData.discount_percentage ?? null,
        coupon_code: bookingData.coupon_code ?? null,
        booking_group_id: bookingData.booking_group_id ?? null,
        status_updated_at: bookingData.status_updated_at ?? null,
        status_updated_by: bookingData.status_updated_by ?? null,
        payment_mode: bookingData.payment_mode ?? null,
        payment_txn_id: bookingData.payment_txn_id ?? null,
        location_id: (bookingData as { location_id?: string }).location_id ?? null,
        created_at: bookingData.created_at,
        booking_views: bookingData.booking_views || [],
        station: { 
          name: stationData?.name || 'Unknown', 
          type: stationData?.type || 'unknown' 
        },
        customer: { 
          name: customerData?.name || 'Unknown', 
          phone: customerData?.phone || '', 
          email: customerData?.email ?? null,
          created_at: customerData?.created_at
        }
      };

      return booking;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return null;
    }
  });

  // Use ref to track soundEnabled without causing subscription recreation
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const presentStaffNotificationRef = useRef(presentStaffNotification);
  useEffect(() => {
    presentStaffNotificationRef.current = presentStaffNotification;
  }, [presentStaffNotification]);

  // Add notification function - use ref to avoid recreation
  const addNotificationRef = useRef((booking: Booking) => {
    const isPaid = !!(booking.payment_mode && booking.payment_mode !== 'venue' && booking.payment_txn_id);
    const activeId = activeLocationIdRef.current;
    const mainId = mainLocationIdRef.current;
    const bookingLoc = booking.location_id ?? null;
    const isForActiveBranch =
      !activeId ||
      (bookingLoc ? bookingLoc === activeId : mainId != null && activeId === mainId);

    setNotifications((prev) => {
      const existingNotification = prev.find(
        (n) =>
          isBookingStaffNotification(n) &&
          n.booking?.id != null &&
          n.booking.id === booking.id
      );
      if (existingNotification) {
        console.log('🔔 Notification already exists for booking:', booking.id);
        return prev;
      }

      const notification: BookingStaffNotification = {
        kind: 'booking',
        id: `${booking.id}-${Date.now()}`,
        booking,
        timestamp: new Date(),
        isPaid,
        isRead: false,
      };

      if (isForActiveBranch) {
        queueMicrotask(() => presentStaffNotificationRef.current(notification));
      }

      return [notification, ...prev];
    });
  });

  // Set up real-time subscription - match exact pattern from sessions which works
  useEffect(() => {
    let isSubscribed = false;
    
    // Match the exact pattern used by sessions subscription which works
    const channel = supabase
      .channel('global-booking-notifications')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen to all events like sessions does
          schema: 'public', 
          table: 'bookings' 
        },
        async (payload) => {
          // Only process INSERT events
          if (payload.eventType !== 'INSERT') {
            return;
          }
          
          const bookingId = (payload.new as any)?.id;
          
          if (!bookingId) {
            return;
          }
          
          // Check if we've already seen this booking using ref
          if (previousBookingIdsRef.current.has(bookingId)) {
            return;
          }
          
          // Small delay to ensure booking is fully committed
          setTimeout(async () => {
            try {
              const booking = await fetchBookingDetailsRef.current(bookingId);
              if (booking) {
                addNotificationRef.current(booking);
                setPreviousBookingIds(prev => {
                  const newSet = new Set([...prev, bookingId]);
                  previousBookingIdsRef.current = newSet;
                  return newSet;
                });
              } else {
                console.error('🔔 Failed to fetch booking details for:', bookingId);
              }
            } catch (error) {
              console.error('🔔 Error processing booking notification:', error);
            }
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          console.log('✅ Booking notifications: Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to booking notifications');
          console.error('💡 Enable replication for bookings table in Supabase Dashboard');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Booking notifications subscription timed out');
        } else if (status === 'CLOSED') {
          isSubscribed = false;
        }
      });

    return () => {
      if (isSubscribed) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty deps - use refs for functions to avoid recreation

  const addSessionNotification = useCallback((notification: SessionStaffNotification) => {
    setNotifications((prev) => {
      const duplicate = prev.some(
        (n) =>
          isSessionStaffNotification(n) &&
          n.alertType === notification.alertType &&
          ((notification.sessionId && n.sessionId === notification.sessionId) ||
            (notification.customerId &&
              n.customerId === notification.customerId &&
              notification.alertType === 'unsettled_checkout'))
      );
      if (duplicate) return prev;

      queueMicrotask(() => presentStaffNotificationRef.current(notification));
      return [notification, ...prev];
    });
  }, []);

  useSessionStaffNotificationMonitor(addSessionNotification);

  // Load existing bookings for the active branch to populate previousBookingIds (no duplicate alerts)
  useEffect(() => {
    const loadExistingBookings = async () => {
      if (!activeLocationId) return;
      try {
        // Fetch all bookings using pagination to bypass 1000 record limit
        let page = 0;
        const pageSize = 1000;
        let allBookingsData: any[] = [];
        let finished = false;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        while (!finished) {
          const { data: bookings, error } = await supabase
            .from('bookings')
            .select('id')
            .eq('location_id', activeLocationId)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;
          
          if (bookings && bookings.length > 0) {
            allBookingsData = [...allBookingsData, ...bookings];
            // If we got less than pageSize, we've reached the end
            if (bookings.length < pageSize) {
              finished = true;
            } else {
              page++;
            }
          } else {
            finished = true;
          }
        }

        if (allBookingsData.length > 0) {
          const ids = new Set(allBookingsData.map(b => b.id));
          setPreviousBookingIds(ids);
          previousBookingIdsRef.current = ids;
          console.log('🔔 Loaded', ids.size, 'existing booking IDs');
        }
      } catch (error) {
        console.error('Error loading existing bookings:', error);
      }
    };

    loadExistingBookings();
  }, [activeLocationId]);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        notificationMatchesActiveBranch(n, activeLocationId, locations)
          ? { ...n, isRead: true }
          : n
      )
    );
  }, [activeLocationId, locations]);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) =>
      prev.filter(
        (n) => !notificationMatchesActiveBranch(n, activeLocationId, locations)
      )
    );
    setPreviousBookingIds(new Set());
    try {
      localStorage.removeItem('booking-notifications');
      localStorage.removeItem('booking-previous-ids');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, [activeLocationId, locations]);

  const unreadCount = visibleNotifications.filter((n) => !n.isRead).length;

  return (
    <BookingNotificationContext.Provider
      value={{
        notifications: visibleNotifications,
        unreadCount,
        ringSignal,
        soundEnabled,
        setSoundEnabled,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAllNotifications
      }}
    >
      {children}
    </BookingNotificationContext.Provider>
  );
};

export const useBookingNotifications = () => {
  const context = useContext(BookingNotificationContext);
  if (context === undefined) {
    throw new Error('useBookingNotifications must be used within a BookingNotificationProvider');
  }
  return context;
};

