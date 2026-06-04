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
import { Timer } from 'lucide-react';
import type { StationTheme } from '@/utils/stationTheme';

interface StationTimerProps {
  station: Station;
  theme: StationTheme;
}

function toTimeMs(value: Date | string | undefined): number | null {
  if (value == null) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const StationTimer: React.FC<StationTimerProps> = ({ station, theme }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [cost, setCost] = useState(0);
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

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 border backdrop-blur-sm transition-all duration-150 ${
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
      <div className="relative flex items-center gap-1.5 min-w-0">
        <Timer className={`h-3.5 w-3.5 shrink-0 ${isPaused ? 'text-amber-400' : theme.accent}`} />
        <span
          className={`font-mono text-base font-bold tabular-nums tracking-wide transition-transform duration-150 ${
            isPaused ? 'text-amber-100' : 'text-white'
          } ${tick ? 'scale-105' : ''}`}
        >
          {timeStr}
        </span>
      </div>
      <CurrencyDisplay
        amount={cost}
        className={`relative text-sm font-bold shrink-0 ${
          isPaused ? 'text-amber-300' : 'text-cuephoria-orange drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]'
        }`}
      />
    </div>
  );
};

export default StationTimer;
