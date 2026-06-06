import React, { useEffect, useState } from 'react';
import type { Session } from '@/types/pos.types';
import {
  formatRemainingTime,
  getSessionDurationState,
  getUrgencyBarClass,
  getUrgencyBarStyle,
  getUrgencyHeartbeatClass,
  getUrgencyTextColor,
} from '@/utils/sessionDuration.utils';

interface SessionDurationBarProps {
  session: Session;
  className?: string;
}

const SessionDurationBar: React.FC<SessionDurationBarProps> = ({ session, className = '' }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const state = getSessionDurationState(session);
  if (!state) return null;

  void tick;

  const fillPercent = state.isOverdue ? 100 : Math.max(0, Math.min(100, state.remainingRatio * 100));
  const label = state.isOverdue
    ? `Over by ${formatRemainingTime(state.remainingMs)}`
    : `${formatRemainingTime(state.remainingMs)} left`;
  const labelColor = getUrgencyTextColor(state.remainingRatio, state.isOverdue);
  const heartbeatClass =
    state.urgency !== 'comfortable' ? getUrgencyHeartbeatClass(state.urgency) : '';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          Session time
        </span>
        <span
          className={`inline-flex items-center gap-1 font-bold tabular-nums ${heartbeatClass}`}
          style={{ color: labelColor }}
        >
          {state.urgency !== 'comfortable' && (
            <span
              className="inline-block h-1 w-1 shrink-0 rounded-full"
              style={{
                backgroundColor: labelColor,
                boxShadow: `0 0 4px ${labelColor}`,
              }}
              aria-hidden
            />
          )}
          {label}
        </span>
      </div>
      <div
        className={`relative h-2 overflow-hidden rounded-full bg-black/50 ring-1 ${
          state.urgency === 'critical' || state.isOverdue
            ? 'ring-red-500/30'
            : state.urgency === 'warning'
              ? 'ring-amber-400/25'
              : 'ring-white/10'
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${getUrgencyBarClass(state.urgency)}`}
          style={{
            width: `${fillPercent}%`,
            ...getUrgencyBarStyle(state.remainingRatio, state.isOverdue),
          }}
        />
        {state.urgency !== 'comfortable' && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full opacity-40"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${labelColor}44 50%, transparent 100%)`,
              animation: state.isOverdue
                ? 'session-bar-overdue 1.2s ease-in-out infinite'
                : 'session-bar-shimmer 1.8s ease-in-out infinite',
            }}
            aria-hidden
          />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/80 tabular-nums">
        {state.plannedMinutes} min booked
      </p>
    </div>
  );
};

export default SessionDurationBar;
