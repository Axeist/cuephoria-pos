import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/context/LocationContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { showStaffNotificationPopup } from '@/lib/showStaffNotificationPopup';
import { playStaffNotificationSound } from '@/lib/staffNotificationSound';
import {
  type StaffNotification,
  isBookingStaffNotification,
  isSessionStaffNotification,
} from '@/types/staffNotification.types';
import {
  clearStaffNotificationsForLocation,
  ensureStaffBookingNotification,
  fetchStaffNotifications,
  markAllStaffNotificationsRead,
  markStaffNotificationRead,
  mergeStaffNotification,
  sortStaffNotifications,
  staffNotificationRowToModel,
  syncStaffSessionNotifications,
  type StaffNotificationRow,
} from '@/services/staffNotificationDb';

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

const BookingNotificationContext = createContext<BookingNotificationContextType | undefined>(
  undefined
);

const SESSION_SYNC_MS = 15_000;
const REFETCH_MS = 20_000;
const POPUP_FRESH_MS = 45_000;

export const BookingNotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { activeLocationId, locations } = useLocation();
  const { settings } = useAppSettings();

  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
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
  const soundEnabledRef = useRef(soundEnabled);
  const skipPopupRef = useRef(true);
  const seenPopupIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.removeItem('booking-notifications');
      localStorage.removeItem('booking-previous-ids');
      localStorage.removeItem('session-staff-notification-fired');
    } catch {
      /* ignore legacy cache cleanup */
    }
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('booking-sound-enabled', JSON.stringify(soundEnabled));
    } catch {
      /* ignore */
    }
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
  }, []);

  const presentStaffNotification = useCallback((notification: StaffNotification) => {
    if (notification.isRead) return;
    if (seenPopupIdsRef.current.has(notification.id)) return;

    seenPopupIdsRef.current.add(notification.id);
    showStaffNotificationPopup(notification);
    ringSignalRef.current += 1;
    setRingSignal(ringSignalRef.current);
    if (soundEnabledRef.current) {
      playStaffNotificationSound(notification);
    }
  }, []);

  const presentStaffNotificationRef = useRef(presentStaffNotification);
  useEffect(() => {
    presentStaffNotificationRef.current = presentStaffNotification;
  }, [presentStaffNotification]);

  const handleRealtimeRow = useCallback(
    (row: StaffNotificationRow, event: 'INSERT' | 'UPDATE') => {
      const model = staffNotificationRowToModel(row);
      if (!model) {
        console.warn('Ignored staff notification row — could not parse', row?.id, row?.kind);
        return;
      }

      setNotifications((prev) => sortStaffNotifications(mergeStaffNotification(prev, model)));

      if (event !== 'INSERT' || skipPopupRef.current) return;
      if (model.isRead) return;
      if (Date.now() - model.timestamp.getTime() > POPUP_FRESH_MS) return;
      if (!notificationMatchesActiveBranch(model, activeLocationId, locations)) return;

      queueMicrotask(() => presentStaffNotificationRef.current(model));
    },
    [activeLocationId, locations]
  );

  const applyFetchedNotifications = useCallback(
    (items: StaffNotification[], options: { announceNew?: boolean } = {}) => {
      setNotifications((prev) => {
        const prevIds = new Set(prev.map((n) => n.id));
        const merged = sortStaffNotifications(items);

        if (options.announceNew && !skipPopupRef.current) {
          for (const item of merged) {
            if (prevIds.has(item.id) || item.isRead) continue;
            if (Date.now() - item.timestamp.getTime() > POPUP_FRESH_MS) continue;
            if (!notificationMatchesActiveBranch(item, activeLocationId, locations)) continue;
            queueMicrotask(() => presentStaffNotificationRef.current(item));
          }
        }

        return merged;
      });
    },
    [activeLocationId, locations]
  );

  // Load history + subscribe to global DB notifications for active branch
  useEffect(() => {
    if (!activeLocationId) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    skipPopupRef.current = true;
    seenPopupIdsRef.current = new Set();

    const load = async () => {
      const items = await fetchStaffNotifications(activeLocationId);
      if (cancelled) return;
      applyFetchedNotifications(items);
      skipPopupRef.current = false;
    };

    void load();

    const refetchId = window.setInterval(() => {
      void fetchStaffNotifications(activeLocationId).then((items) => {
        if (cancelled) return;
        applyFetchedNotifications(items, { announceNew: true });
      });
    }, REFETCH_MS);

    const channel = supabase
      .channel(`staff-notifications-${activeLocationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_notifications',
          filter: `location_id=eq.${activeLocationId}`,
        },
        (payload) => {
          handleRealtimeRow(payload.new as StaffNotificationRow, 'INSERT');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff_notifications',
          filter: `location_id=eq.${activeLocationId}`,
        },
        (payload) => {
          handleRealtimeRow(payload.new as StaffNotificationRow, 'UPDATE');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Staff notifications: Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Staff notifications Realtime subscription failed');
        }
      });

    return () => {
      cancelled = true;
      window.clearInterval(refetchId);
      supabase.removeChannel(channel);
    };
  }, [activeLocationId, applyFetchedNotifications, handleRealtimeRow]);

  // Fallback: ensure DB notification row when a booking is inserted (covers missed triggers / Realtime)
  useEffect(() => {
    if (!activeLocationId) return;

    const channel = supabase
      .channel(`staff-booking-fallback-${activeLocationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          const bookingId = (payload.new as { id?: string })?.id;
          if (!bookingId) return;
          void ensureStaffBookingNotification(bookingId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLocationId]);

  // Session timeout alerts: evaluate server-side, broadcast via staff_notifications
  useEffect(() => {
    if (!activeLocationId || !settings.notificationSettings.sessionTimeouts) return;

    const runSync = () => {
      void syncStaffSessionNotifications(activeLocationId);
    };

    runSync();
    const intervalId = window.setInterval(runSync, SESSION_SYNC_MS);
    return () => window.clearInterval(intervalId);
  }, [activeLocationId, settings.notificationSettings.sessionTimeouts]);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((n) =>
        notificationMatchesActiveBranch(n, activeLocationId, locations)
      ),
    [notifications, activeLocationId, locations]
  );

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    void supabase.from('staff_notifications').delete().eq('id', notificationId);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    void markStaffNotificationRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(() => {
    if (!activeLocationId) return;
    setNotifications((prev) =>
      prev.map((n) =>
        notificationMatchesActiveBranch(n, activeLocationId, locations)
          ? { ...n, isRead: true }
          : n
      )
    );
    void markAllStaffNotificationsRead(activeLocationId);
  }, [activeLocationId, locations]);

  const clearAllNotifications = useCallback(() => {
    if (!activeLocationId) return;
    setNotifications((prev) =>
      prev.filter((n) => !notificationMatchesActiveBranch(n, activeLocationId, locations))
    );
    void clearStaffNotificationsForLocation(activeLocationId);
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
        clearAllNotifications,
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
