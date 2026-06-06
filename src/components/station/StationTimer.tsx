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
  getUrgencyHeartbeatClass,
  getUrgencyTextColor,
  getUrgencyTimerContainerClass,
  type SessionUrgency,
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
  const [urgency, setUrgency] = useState<SessionUrgency | null>(null);
  const [remainingRatio, setRemainingRatio] = useState<number | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
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
      setRemainingLabel(null);
      setUrgency(null);
      setRemainingRatio(null);
      setIsOverdue(false);
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
        setUrgency(durationState.urgency);
        setRemainingRatio(durationState.remainingRatio);
        setIsOverdue(durationState.isOverdue);
      } else {
        setRemainingLabel(null);
        setUrgency(null);
        setRemainingRatio(null);
        setIsOverdue(false);
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
    ? 'gap-1.5 px-3 py-3 min-h-[130px] w-full max-w-full min-w-0 flex-1'
    : compact
      ? 'gap-0.5 px-2 py-2 min-w-0'
      : 'gap-1 px-4 py-4 min-w-[140px]';

  const timeSizeClass = prominent
    ? 'text-2xl sm:text-3xl leading-none'
    : compact
      ? 'text-xl leading-none'
      : 'text-3xl leading-none';

  const costSizeClass = prominent ? 'text-base' : compact ? 'text-sm' : 'text-lg';

  const hasUrgency = urgency != null && urgency !== 'comfortable' && !isPaused;
  const urgencyContainerClass = hasUrgency && urgency ? getUrgencyTimerContainerClass(urgency) : '';
  const heartbeatClass = hasUrgency && urgency ? getUrgencyHeartbeatClass(urgency) : '';
  const remainingColor =
    remainingRatio != null
      ? getUrgencyTextColor(remainingRatio, isOverdue)
      : isOverdue
        ? 'rgb(248, 113, 113)'
        : 'rgb(110, 231, 183)';

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-300 ${sizeClass} ${
        isPaused
          ? 'bg-amber-950/60 border-amber-500/35'
          : hasUrgency
            ? urgencyContainerClass
            : 'bg-black/55 border-white/10 shadow-inner'
      } ${tick && !isPaused && !prominent ? 'scale-[1.01]' : ''}`}
    >
      {!isPaused && !hasUrgency && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.accent.includes('violet') ? 'rgba(139,92,246,0.3)' : 'rgba(249,115,22,0.2)'}, transparent)`,
          }}
        />
      )}
      {hasUrgency && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${remainingColor}33 0%, transparent 70%)`,
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
        className={`relative max-w-full truncate px-1 font-mono font-bold tabular-nums tracking-wide transition-transform duration-150 ${timeSizeClass} ${
          isPaused ? 'text-amber-100' : 'text-white'
        } ${tick && !prominent ? 'scale-105' : ''}`}
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
          className={`relative inline-flex items-center gap-1 font-bold tabular-nums drop-shadow-sm ${
            prominent ? 'text-base sm:text-lg mt-0.5' : 'text-[10px]'
          } ${heartbeatClass}`}
          style={{ color: remainingColor }}
        >
          {hasUrgency && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: remainingColor,
                boxShadow: `0 0 6px ${remainingColor}`,
              }}
              aria-hidden
            />
          )}
          {remainingLabel.startsWith('+') ? remainingLabel : `${remainingLabel} left`}
        </span>
      )}
    </div>
  );
};

export default StationTimer;
