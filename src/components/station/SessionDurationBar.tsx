import React, { useEffect, useState } from 'react';
import type { Session } from '@/types/pos.types';
import {
  formatRemainingTime,
  getSessionDurationState,
  getUrgencyBarClass,
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

  const fillPercent = Math.max(0, Math.min(100, state.remainingRatio * 100));
  const label = state.isOverdue
    ? `Over by ${formatRemainingTime(state.remainingMs)}`
    : `${formatRemainingTime(state.remainingMs)} left`;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          Session time
        </span>
        <span
          className={`font-bold tabular-nums ${
            state.isOverdue
              ? 'text-red-400'
              : state.urgency === 'critical'
                ? 'text-red-300'
                : state.urgency === 'warning'
                  ? 'text-amber-300'
                  : 'text-emerald-300'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${getUrgencyBarClass(state.urgency)}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/80 tabular-nums">
        {state.plannedMinutes} min booked
      </p>
    </div>
  );
};

export default SessionDurationBar;
