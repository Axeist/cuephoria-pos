import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

interface BookingNotification {
  id: string;
  booking: Booking;
  timestamp: Date;
  isPaid: boolean;
  isRead?: boolean;
}

interface BookingNotificationContextType {
  notifications: BookingNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
}

const BookingNotificationContext = createContext<BookingNotificationContextType | undefined>(undefined);

export const BookingNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage on mount
  const [notifications, setNotifications] = useState<BookingNotification[]>(() => {
    try {
      const saved = localStorage.getItem('booking-notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = new Date();
        const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);
        
        const loaded = parsed
          .map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
            booking: {
              ...n.booking,
              booking_date: n.booking.booking_date,
              created_at: n.booking.created_at
            }
          }))
          .filter((n: BookingNotification) => n.timestamp.getTime() > oneDayAgo);
        
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

  // Function to play notification sound
  const playNotificationSound = useCallback((isPaid: boolean) => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = isPaid ? 1000 : 600;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);

  // Fetch booking details when a new booking is detected - use ref to avoid recreation
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

  // Add notification function - use ref to avoid recreation
  const addNotificationRef = useRef((booking: Booking) => {
    const isPaid = !!(booking.payment_mode && booking.payment_mode !== 'venue' && booking.payment_txn_id);
    
    setNotifications(prev => {
      // Check if notification already exists
      const existingNotification = prev.find(n => n.booking.id === booking.id);
      if (existingNotification) {
        console.log('🔔 Notification already exists for booking:', booking.id);
        return prev;
      }
      
      const notification: BookingNotification = {
        id: `${booking.id}-${Date.now()}`,
        booking,
        timestamp: new Date(),
        isPaid,
        isRead: false
      };
      
      // Play sound using ref to get current value
      if (soundEnabledRef.current) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = isPaid ? 1000 : 600;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
          console.error('Error playing notification sound:', error);
        }
      }
      
      // Show toast notification
      toast.success(
        `New ${isPaid ? 'Paid' : ''} Booking: ${booking.customer.name}`,
        {
          description: `${booking.station.name} • ${format(new Date(booking.booking_date), 'MMM dd')} • ${booking.start_time}`,
          duration: 5000,
        }
      );
      
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

  // Load existing bookings on mount to populate previousBookingIds
  useEffect(() => {
    const loadExistingBookings = async () => {
      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        if (bookings) {
          const ids = new Set(bookings.map(b => b.id));
          setPreviousBookingIds(ids);
          previousBookingIdsRef.current = ids;
          console.log('🔔 Loaded', ids.size, 'existing booking IDs');
        }
      } catch (error) {
        console.error('Error loading existing bookings:', error);
      }
    };

    loadExistingBookings();
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setPreviousBookingIds(new Set());
    try {
      localStorage.removeItem('booking-notifications');
      localStorage.removeItem('booking-previous-ids');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <BookingNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
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

