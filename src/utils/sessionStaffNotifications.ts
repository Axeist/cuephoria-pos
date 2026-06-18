import type { Session } from '@/types/pos.types';
import { getSessionDurationState } from '@/utils/sessionDuration.utils';

export type SessionAlertType = 'ending_soon' | 'overdue_active' | 'unsettled_checkout';

/** Warn staff this many minutes before planned session end. */
export const SESSION_ENDING_SOON_MINUTES = 5;

/** Remind staff this many minutes after planned end if session still active. */
export const SESSION_OVERDUE_ACTIVE_MINUTES = 10;

/** Remind staff this many minutes after session checkout cart saved without payment. */
export const SESSION_UNSETTLED_CHECKOUT_MINUTES = 10;

const FIRED_KEYS_STORAGE = 'session-staff-notification-fired';

export interface SessionAlertCandidate {
  alertType: SessionAlertType;
  sessionId?: string;
  customerId?: string;
  stationId?: string;
  stationName: string;
  customerName: string;
  message: string;
  dedupeKey: string;
}

export function loadSessionNotificationFiredKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEYS_STORAGE);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveSessionNotificationFiredKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(FIRED_KEYS_STORAGE, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

export function sessionAlertTitle(alertType: SessionAlertType): string {
  switch (alertType) {
    case 'ending_soon':
      return 'Session ending soon';
    case 'overdue_active':
      return 'Session overdue — end required';
    case 'unsettled_checkout':
      return 'Unsettled session bill';
  }
}

export function collectActiveSessionAlerts(
  stations: Array<{
    id: string;
    name: string;
    isOccupied: boolean;
    currentSession: Session | null;
  }>,
  customerNamesById: Record<string, string> = {},
  now = new Date()
): SessionAlertCandidate[] {
  const alerts: SessionAlertCandidate[] = [];
  const endingSoonMs = SESSION_ENDING_SOON_MINUTES * 60 * 1000;
  const overdueMs = SESSION_OVERDUE_ACTIVE_MINUTES * 60 * 1000;

  for (const station of stations) {
    const session = station.currentSession;
    if (!station.isOccupied || !session?.plannedDurationMinutes) continue;

    const state = getSessionDurationState(session, now);
    if (!state) continue;

    const customerLabel =
      (session.customerId && customerNamesById[session.customerId]) || 'Walk-in session';

    if (state.remainingMs > 0 && state.remainingMs <= endingSoonMs) {
      const minsLeft = Math.max(1, Math.ceil(state.remainingMs / 60000));
      alerts.push({
        alertType: 'ending_soon',
        sessionId: session.id,
        stationId: station.id,
        customerId: session.customerId,
        stationName: station.name,
        customerName: customerLabel,
        message: `${station.name} has ~${minsLeft} min left on a ${state.plannedMinutes} min session.`,
        dedupeKey: `ending_soon:${session.id}`,
      });
    }

    if (state.remainingMs <= -overdueMs) {
      const overdueMin = Math.ceil(Math.abs(state.remainingMs) / 60000);
      alerts.push({
        alertType: 'overdue_active',
        sessionId: session.id,
        stationId: station.id,
        customerId: session.customerId,
        stationName: station.name,
        customerName: customerLabel,
        message: `${station.name} is ${overdueMin} min past planned end — end the session and send to POS.`,
        dedupeKey: `overdue_active:${session.id}`,
      });
    }
  }

  return alerts;
}

export function collectUnsettledCheckoutAlerts(
  savedCarts: Array<{
    customerId: string;
    customerName: string;
    timestamp: number;
    record?: { items?: Array<{ type?: string }> };
  }>,
  now = new Date()
): SessionAlertCandidate[] {
  const thresholdMs = SESSION_UNSETTLED_CHECKOUT_MINUTES * 60 * 1000;
  const alerts: SessionAlertCandidate[] = [];

  for (const cart of savedCarts) {
    const hasSessionItem = cart.record?.items?.some((item) => item.type === 'session');
    if (!hasSessionItem) continue;

    const ageMs = now.getTime() - cart.timestamp;
    if (ageMs < thresholdMs) continue;

    const waitingMin = Math.floor(ageMs / 60000);
    alerts.push({
      alertType: 'unsettled_checkout',
      customerId: cart.customerId,
      stationName: 'POS checkout',
      customerName: cart.customerName,
      message: `${cart.customerName}'s session bill has waited ${waitingMin} min — complete checkout on POS.`,
      dedupeKey: `unsettled_checkout:${cart.customerId}`,
    });
  }

  return alerts;
}

export function pruneSessionNotificationFiredKeys(
  keys: Set<string>,
  activeSessionIds: Set<string>,
  activeUnsettledCustomerIds: Set<string>
): Set<string> {
  const next = new Set(keys);

  for (const key of keys) {
    if (key.startsWith('ending_soon:') || key.startsWith('overdue_active:')) {
      const sessionId = key.split(':')[1];
      if (sessionId && !activeSessionIds.has(sessionId)) {
        next.delete(key);
      }
    }
    if (key.startsWith('unsettled_checkout:')) {
      const customerId = key.split(':')[1];
      if (customerId && !activeUnsettledCustomerIds.has(customerId)) {
        next.delete(key);
      }
    }
  }

  return next;
}
