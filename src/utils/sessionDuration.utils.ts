import type { CSSProperties } from 'react';
import type { Session, Station } from '@/types/pos.types';
import { getBillableMs } from '@/utils/sessionTimer.utils';
import { getEffectivePlannedDurationMinutes } from '@/utils/prepaidBooking.core';

export type SessionUrgency = 'comfortable' | 'warning' | 'critical' | 'overdue';

export interface SessionDurationState {
  plannedMinutes: number;
  plannedMs: number;
  billableMs: number;
  remainingMs: number;
  elapsedRatio: number;
  remainingRatio: number;
  urgency: SessionUrgency;
  isOverdue: boolean;
}

export function getDurationPresets(
  slotDuration?: number | null,
  durationTiers?: { minutes: number }[]
): number[] {
  if (durationTiers && durationTiers.length > 0) {
    return durationTiers.map((t) => t.minutes).sort((a, b) => a - b);
  }
  const slot = slotDuration ?? 60;
  if (slot <= 15) return [15, 30, 45, 60];
  if (slot <= 30) return [30, 60, 90];
  return [30, 60, 90, 120];
}

export function getDefaultPlannedDuration(
  slotDuration?: number | null,
  durationTiers?: { minutes: number }[]
): number {
  const presets = getDurationPresets(slotDuration, durationTiers);
  return presets[0] ?? slotDuration ?? 60;
}

export function hasPlannedDuration(session: Pick<Session, 'plannedDurationMinutes'>): boolean {
  return (session.plannedDurationMinutes ?? 0) > 0;
}

export function getSessionDurationState(
  session: Session,
  now = new Date(),
  station?: Pick<Station, 'type' | 'slotDuration'>
): SessionDurationState | null {
  const plannedMinutes = getEffectivePlannedDurationMinutes(session, station);
  if (!plannedMinutes || plannedMinutes <= 0) return null;

  const plannedMs = plannedMinutes * 60 * 1000;
  const billableMs = getBillableMs(session, now);
  const remainingMs = plannedMs - billableMs;
  const elapsedRatio = Math.min(1, billableMs / plannedMs);
  const remainingRatio = Math.max(0, 1 - elapsedRatio);
  const isOverdue = remainingMs <= 0;

  let urgency: SessionUrgency = 'comfortable';
  if (isOverdue) urgency = 'overdue';
  else if (remainingRatio <= 0.15) urgency = 'critical';
  else if (remainingRatio <= 0.35) urgency = 'warning';

  return {
    plannedMinutes,
    plannedMs,
    billableMs,
    remainingMs,
    elapsedRatio,
    remainingRatio,
    urgency,
    isOverdue,
  };
}

export function formatRemainingTime(remainingMs: number): string {
  const absMs = Math.abs(remainingMs);
  const totalSeconds = Math.ceil(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Smooth green → amber → red based on how much session time remains (1 = full, 0 = none). */
export function getUrgencyHue(remainingRatio: number): number {
  const clamped = Math.max(0, Math.min(1, remainingRatio));
  return Math.round(clamped * 142);
}

export function getUrgencyTextColor(remainingRatio: number, isOverdue: boolean): string {
  if (isOverdue) return 'rgb(248, 113, 113)';
  const hue = getUrgencyHue(remainingRatio);
  return `hsl(${hue}, 82%, 58%)`;
}

export function getUrgencyBarStyle(remainingRatio: number, isOverdue: boolean): CSSProperties {
  if (isOverdue) {
    return {
      width: '100%',
      background: 'linear-gradient(90deg, rgb(220, 38, 38), rgb(248, 113, 113), rgb(220, 38, 38))',
      backgroundSize: '200% 100%',
    };
  }
  const hue = getUrgencyHue(remainingRatio);
  const hue2 = Math.max(0, hue - 18);
  return {
    background: `linear-gradient(90deg, hsl(${hue}, 78%, 46%), hsl(${hue2}, 85%, 58%))`,
  };
}

export function getUrgencyBarClass(urgency: SessionUrgency): string {
  switch (urgency) {
    case 'overdue':
      return 'animate-session-bar-overdue';
    case 'critical':
      return 'animate-session-bar-shimmer';
    case 'warning':
      return '';
    default:
      return '';
  }
}

export function getUrgencyRingClass(urgency: SessionUrgency): string {
  switch (urgency) {
    case 'overdue':
      return 'ring-2 ring-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.45)] animate-session-card-glow-overdue';
    case 'critical':
      return 'ring-2 ring-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-session-card-glow-critical';
    case 'warning':
      return 'ring-2 ring-amber-400/50 shadow-[0_0_14px_rgba(251,191,36,0.25)]';
    default:
      return '';
  }
}

export function getUrgencyHeartbeatClass(urgency: SessionUrgency): string {
  switch (urgency) {
    case 'overdue':
      return 'animate-session-heartbeat-overdue';
    case 'critical':
      return 'animate-session-heartbeat-critical';
    case 'warning':
      return 'animate-session-heartbeat-warning';
    default:
      return '';
  }
}

export function getUrgencyTimerContainerClass(urgency: SessionUrgency): string {
  switch (urgency) {
    case 'overdue':
      return 'border-red-500/55 bg-red-950/45 animate-session-timer-glow-overdue';
    case 'critical':
      return 'border-red-500/40 bg-red-950/30 animate-session-timer-glow-critical';
    case 'warning':
      return 'border-amber-400/35 bg-amber-950/25';
    default:
      return '';
  }
}

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number): string => {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const dateToTimeStr = (date: Date): string =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

const dateToYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function rangesOverlapMinutes(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  const a2 = endA === 0 ? 24 * 60 : endA;
  const b2 = endB === 0 ? 24 * 60 : endB;
  return startA < b2 && startB < a2;
}

export interface BookingConflict {
  id: string;
  startTime: string;
  endTime: string;
}

/** True when adding extraMinutes would overlap a confirmed booking after current planned end. */
export function wouldExtensionConflict(
  bookings: BookingConflict[],
  session: Session,
  extraMinutes: number,
  now = new Date()
): { blocked: boolean; conflict?: BookingConflict } {
  const state = getSessionDurationState(session, now);
  if (!state) return { blocked: false };

  const newPlannedMinutes = state.plannedMinutes + extraMinutes;
  const newRemainingMs = newPlannedMinutes * 60 * 1000 - state.billableMs;
  const extensionStart = state.remainingMs > 0
    ? new Date(now.getTime() + state.remainingMs)
    : now;
  const extensionEnd = new Date(now.getTime() + Math.max(0, newRemainingMs));

  if (extensionEnd <= extensionStart) return { blocked: false };

  const extStartMin = timeToMinutes(dateToTimeStr(extensionStart));
  const extEndMin = timeToMinutes(dateToTimeStr(extensionEnd));

  for (const booking of bookings) {
    const bStart = timeToMinutes(booking.startTime.slice(0, 5));
    const bEnd = timeToMinutes(booking.endTime.slice(0, 5));
    if (rangesOverlapMinutes(extStartMin, extEndMin, bStart, bEnd)) {
      return { blocked: true, conflict: booking };
    }
  }

  return { blocked: false };
}

/** Wall-clock window the session will occupy on a station after a move (from now until planned end). */
export function getSessionMoveBlockWindow(
  session: Session,
  now = new Date()
): { startMin: number; endMin: number } {
  const state = getSessionDurationState(session, now);
  const startMin = timeToMinutes(dateToTimeStr(now));

  if (state) {
    const plannedEnd = new Date(
      new Date(session.startTime).getTime() + state.plannedMs
    );
    const blockEnd =
      plannedEnd > now ? plannedEnd : new Date(now.getTime() + 15 * 60 * 1000);
    let endMin = timeToMinutes(dateToTimeStr(blockEnd));
    if (endMin <= startMin) endMin = startMin + 15;
    return { startMin, endMin };
  }

  const fallbackEnd = new Date(now.getTime() + 60 * 60 * 1000);
  return { startMin, endMin: timeToMinutes(dateToTimeStr(fallbackEnd)) };
}

/** True when moving the session to a station would overlap a confirmed booking there. */
export function wouldSessionMoveConflict(
  bookings: BookingConflict[],
  session: Session,
  now = new Date()
): { blocked: boolean; conflict?: BookingConflict } {
  const { startMin, endMin } = getSessionMoveBlockWindow(session, now);

  for (const booking of bookings) {
    const bStart = timeToMinutes(booking.startTime.slice(0, 5));
    const bEnd = timeToMinutes(booking.endTime.slice(0, 5));
    if (rangesOverlapMinutes(startMin, endMin, bStart, bEnd)) {
      return { blocked: true, conflict: booking };
    }
  }

  return { blocked: false };
}

export function stationsMatchForMove(a: { type: string }, b: { type: string }): boolean {
  return (a.type || '').toLowerCase() === (b.type || '').toLowerCase();
}

export { dateToYmd, dateToTimeStr, minutesToTime };
