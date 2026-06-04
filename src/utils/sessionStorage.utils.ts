import type { Session } from '@/types/pos.types';

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
  };
}
