import { Session, Station } from '@/types/pos.types';

type BillableSession = Pick<
  Session,
  'startTime' | 'isPaused' | 'pausedAt' | 'totalPausedMs'
>;

/** Elapsed play time excluding all paused intervals. */
export function getBillableMs(session: BillableSession, now = new Date()): number {
  const start = new Date(session.startTime).getTime();
  let pausedMs = session.totalPausedMs ?? 0;

  if (session.isPaused && session.pausedAt) {
    pausedMs += now.getTime() - new Date(session.pausedAt).getTime();
  }

  return Math.max(0, now.getTime() - start - pausedMs);
}

export function getBillableDurationMinutes(session: BillableSession, now = new Date()): number {
  return Math.ceil(getBillableMs(session, now) / (1000 * 60));
}

export function formatBillableTime(billableMs: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const secondsTotal = Math.floor(billableMs / 1000);
  const hours = Math.floor(secondsTotal / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
}

/** Normalize session before billing when ending while still paused. */
export function resolveSessionForBilling(session: Session, endTime = new Date()): Session {
  if (!session.isPaused || !session.pausedAt) {
    return session;
  }

  const pauseDuration = endTime.getTime() - new Date(session.pausedAt).getTime();
  return {
    ...session,
    isPaused: false,
    pausedAt: undefined,
    totalPausedMs: (session.totalPausedMs ?? 0) + pauseDuration,
  };
}

export function calculateSessionCost(
  station: Pick<Station, 'category' | 'slotDuration' | 'type'>,
  sessionRate: number,
  billableMs: number,
  isMember = false
): number {
  const durationMinutes = Math.ceil(billableMs / (1000 * 60));

  let cost: number;
  if (station.category === 'nit_event' && station.slotDuration) {
    const slotsPlayed = Math.ceil(durationMinutes / station.slotDuration);
    cost = slotsPlayed * sessionRate;
  } else if (station.type === 'vr') {
    const slotsPlayed = Math.ceil(durationMinutes / 15);
    cost = slotsPlayed * sessionRate;
  } else {
    const hoursElapsed = billableMs / (1000 * 60 * 60);
    cost = Math.ceil(hoursElapsed * sessionRate);
  }

  if (isMember) {
    cost = Math.ceil(cost * 0.5);
  }

  return cost;
}
