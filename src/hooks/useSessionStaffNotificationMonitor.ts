import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLocation } from '@/context/LocationContext';
import { usePOS } from '@/context/POSContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { SessionStaffNotification } from '@/types/staffNotification.types';
import {
  collectActiveSessionAlerts,
  collectUnsettledCheckoutAlerts,
  loadSessionNotificationFiredKeys,
  pruneSessionNotificationFiredKeys,
  saveSessionNotificationFiredKeys,
  sessionAlertTitle,
  type SessionAlertCandidate,
} from '@/utils/sessionStaffNotifications';

const POLL_MS = 30_000;

function playSessionAlertSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 750;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.28, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.35);
  } catch {
    /* ignore */
  }
}

function toSessionNotification(
  candidate: SessionAlertCandidate,
  locationId: string | null
): SessionStaffNotification {
  return {
    kind: 'session',
    id: `${candidate.dedupeKey}-${Date.now()}`,
    alertType: candidate.alertType,
    sessionId: candidate.sessionId,
    customerId: candidate.customerId,
    stationId: candidate.stationId,
    stationName: candidate.stationName,
    customerName: candidate.customerName,
    message: candidate.message,
    locationId,
    timestamp: new Date(),
    isRead: false,
  };
}

export function useSessionStaffNotificationMonitor(
  onNotify: (notification: SessionStaffNotification) => void,
  soundEnabled: boolean
): void {
  const { stations, savedCarts, customers } = usePOS();
  const { activeLocationId } = useLocation();
  const { settings } = useAppSettings();
  const firedRef = useRef(loadSessionNotificationFiredKeys());
  const onNotifyRef = useRef(onNotify);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!settings.notificationSettings.sessionTimeouts) return;

    const runCheck = () => {
      if (!activeLocationId) return;

      const now = new Date();
      const customerNamesById = Object.fromEntries(
        customers.map((c) => [c.id, c.name])
      );
      const sessionAlerts = collectActiveSessionAlerts(stations, customerNamesById, now);
      const unsettledAlerts = collectUnsettledCheckoutAlerts(savedCarts, now);
      const candidates = [...sessionAlerts, ...unsettledAlerts];

      const activeSessionIds = new Set(
        stations
          .filter((s) => s.isOccupied && s.currentSession?.id)
          .map((s) => s.currentSession!.id)
      );
      const activeUnsettledCustomerIds = new Set(
        savedCarts
          .filter((c) => c.record?.items?.some((i) => i.type === 'session'))
          .map((c) => c.customerId)
      );

      firedRef.current = pruneSessionNotificationFiredKeys(
        firedRef.current,
        activeSessionIds,
        activeUnsettledCustomerIds
      );

      for (const candidate of candidates) {
        if (firedRef.current.has(candidate.dedupeKey)) continue;

        firedRef.current.add(candidate.dedupeKey);
        const notification = toSessionNotification(candidate, activeLocationId);
        onNotifyRef.current(notification);

        if (soundEnabledRef.current) {
          playSessionAlertSound();
        }

        toast.warning(sessionAlertTitle(candidate.alertType), {
          description: candidate.message,
          duration: 6000,
        });
      }

      saveSessionNotificationFiredKeys(firedRef.current);
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [
    activeLocationId,
    savedCarts,
    settings.notificationSettings.sessionTimeouts,
    customers,
    stations,
  ]);
}
