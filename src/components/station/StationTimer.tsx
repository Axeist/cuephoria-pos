import React, { useState, useEffect, useRef } from 'react';
import { Station } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { usePOS } from '@/context/POSContext';
import { Session } from '@/types/pos.types';
import {
  calculateSessionCost,
  formatBillableTime,
  getBillableMs,
} from '@/utils/sessionTimer.utils';
import {
  formatRemainingTime,
  getSessionDurationState,
} from '@/utils/sessionDuration.utils';
import { Timer } from 'lucide-react';
import type { StationTheme } from '@/utils/stationTheme';

interface StationTimerProps {
  station: Station;
  theme: StationTheme;
  compact?: boolean;
  prominent?: boolean;
}

function toTimeMs(value: Date | string | undefined): number | null {
  if (value == null) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const StationTimer: React.FC<StationTimerProps> = ({
  station,
  theme,
  compact = false,
  prominent = false,
}) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [cost, setCost] = useState(0);
  const [remainingLabel, setRemainingLabel] = useState<string | null>(null);
  const [tick, setTick] = useState(false);
  const { customers } = usePOS();
  const customersRef = useRef(customers);
  customersRef.current = customers;

  const session = station.currentSession;
  const sessionId = session?.id;
  const startTimeMs = toTimeMs(session?.startTime);
  const pausedAtMs = toTimeMs(session?.pausedAt);
  const isPaused = session?.isPaused ?? false;
  const totalPausedMs = session?.totalPausedMs ?? 0;
  const sessionRate = session?.hourlyRate ?? station.hourlyRate;

  useEffect(() => {
    if (!station.isOccupied || !sessionId || startTimeMs == null) {
      setHours(0);
      setMinutes(0);
      setSeconds(0);
      setCost(0);
      return;
    }

    const sessionSnapshot: Session = {
      ...session!,
      startTime: new Date(startTimeMs),
      pausedAt: pausedAtMs != null ? new Date(pausedAtMs) : undefined,
      isPaused,
      totalPausedMs,
      hourlyRate: sessionRate,
    };

    const updateTimer = () => {
      const customer = customersRef.current.find((c) => c.id === sessionSnapshot.customerId);
      const isMember = customer?.isMember || false;
      const billableMs = getBillableMs(sessionSnapshot);
      const time = formatBillableTime(billableMs);
      const rate = sessionSnapshot.hourlyRate || station.hourlyRate;

      setSeconds((prev) => {
        if (time.seconds !== prev) {
          setTick(true);
          setTimeout(() => setTick(false), 150);
        }
        return time.seconds;
      });
      setMinutes(time.minutes);
      setHours(time.hours);
      setCost(calculateSessionCost(station, rate, billableMs, isMember));

      const durationState = getSessionDurationState(sessionSnapshot);
      if (durationState) {
        setRemainingLabel(
          durationState.isOverdue
            ? `+${formatRemainingTime(durationState.remainingMs)}`
            : formatRemainingTime(durationState.remainingMs)
        );
      } else {
        setRemainingLabel(null);
      }
    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    station.isOccupied,
    sessionId,
    startTimeMs,
    pausedAtMs,
    isPaused,
    totalPausedMs,
    sessionRate,
    station.hourlyRate,
    station,
    session,
  ]);

  if (!station.isOccupied || !session || startTimeMs == null) {
    return null;
  }

  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const sizeClass = prominent
    ? 'gap-2 px-4 py-5 min-h-[168px] w-full flex-1'
    : compact
      ? 'gap-0.5 px-2 py-2 min-w-0'
      : 'gap-1 px-4 py-4 min-w-[140px]';

  const timeSizeClass = prominent
    ? 'text-4xl sm:text-5xl'
    : compact
      ? 'text-xl'
      : 'text-3xl';

  const costSizeClass = prominent ? 'text-xl' : compact ? 'text-sm' : 'text-lg';

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-150 ${sizeClass} ${
        isPaused
          ? 'bg-amber-950/60 border-amber-500/35'
          : 'bg-black/55 border-white/10 shadow-inner'
      } ${tick && !isPaused ? 'scale-[1.01]' : ''}`}
    >
      {!isPaused && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.accent.includes('violet') ? 'rgba(139,92,246,0.3)' : 'rgba(249,115,22,0.2)'}, transparent)`,
          }}
        />
      )}
      <div className="relative flex items-center gap-1.5">
        <Timer className={`shrink-0 ${prominent ? 'h-4 w-4' : 'h-3 w-3'} ${isPaused ? 'text-amber-400' : theme.accent}`} />
        <span className={`font-semibold uppercase tracking-widest text-muted-foreground ${prominent ? 'text-xs' : 'text-[9px]'}`}>
          {isPaused ? 'Paused' : 'Elapsed'}
        </span>
      </div>
      <span
        className={`relative font-mono font-bold tabular-nums tracking-wider transition-transform duration-150 ${timeSizeClass} ${
          isPaused ? 'text-amber-100' : 'text-white'
        } ${tick ? 'scale-105' : ''}`}
      >
        {timeStr}
      </span>
      <CurrencyDisplay
        amount={cost}
        className={`relative font-bold ${costSizeClass} ${
          isPaused ? 'text-amber-300' : 'text-cuephoria-orange drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]'
        }`}
      />
      {remainingLabel && (
        <span
          className={`relative font-semibold tabular-nums ${
            prominent ? 'text-sm' : 'text-[10px]'
          } ${
            remainingLabel.startsWith('+')
              ? 'text-red-400'
              : 'text-emerald-300/90'
          }`}
        >
          {remainingLabel.startsWith('+') ? remainingLabel : `${remainingLabel} left`}
        </span>
      )}
    </div>
  );
};

export default StationTimer;
