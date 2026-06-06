import type { Session, Station } from '@/types/pos.types';

function toSessionDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : undefined;
  }
  const parsed = new Date(value as string | number);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

/** Restore Date fields after JSON cache/localStorage round-trip. */
export function rehydrateSession(session: Session): Session {
  const startTime = toSessionDate(session.startTime) ?? new Date();
  return {
    ...session,
    startTime,
    endTime: toSessionDate(session.endTime),
    pausedAt: toSessionDate(session.pausedAt),
  };
}

export function rehydrateSessions(sessions: Session[]): Session[] {
  return sessions.map(rehydrateSession);
}

export function rehydrateStation(station: Station): Station {
  if (!station.currentSession) return station;
  return {
    ...station,
    currentSession: rehydrateSession(station.currentSession),
  };
}

export function rehydrateStations(stations: Station[]): Station[] {
  return stations.map(rehydrateStation);
}

/** JSON-safe session payload for stations.currentsession JSONB column */
export function serializeSessionForDb(session: Session): Record<string, unknown> {
  return {
    id: session.id,
    stationId: session.stationId,
    customerId: session.customerId,
    startTime:
      session.startTime instanceof Date
        ? session.startTime.toISOString()
        : session.startTime,
    endTime:
      session.endTime instanceof Date
        ? session.endTime.toISOString()
        : session.endTime ?? undefined,
    duration: session.duration,
    hourlyRate: session.hourlyRate,
    originalRate: session.originalRate,
    couponCode: session.couponCode,
    discountAmount: session.discountAmount,
    playerCount: session.playerCount,
    perPersonRate: session.perPersonRate,
    isPaused: session.isPaused ?? false,
    pausedAt:
      session.pausedAt instanceof Date
        ? session.pausedAt.toISOString()
        : session.pausedAt ?? undefined,
    totalPausedMs: session.totalPausedMs ?? 0,
    plannedDurationMinutes: session.plannedDurationMinutes,
    sessionGroupId: session.sessionGroupId,
    prepaidBooking: session.prepaidBooking,
    timeTierPrice: session.timeTierPrice,
    overtimePerMinute: session.overtimePerMinute,
  };
}
