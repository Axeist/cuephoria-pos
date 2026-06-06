import { useEffect, useRef } from 'react';
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
  type SessionAlertCandidate,
} from '@/utils/sessionStaffNotifications';

const POLL_MS = 30_000;

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
  onNotify: (notification: SessionStaffNotification) => void
): void {
  const { stations, savedCarts, customers } = usePOS();
  const { activeLocationId } = useLocation();
  const { settings } = useAppSettings();
  const firedRef = useRef(loadSessionNotificationFiredKeys());
  const onNotifyRef = useRef(onNotify);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

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
        onNotifyRef.current(toSessionNotification(candidate, activeLocationId));
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
