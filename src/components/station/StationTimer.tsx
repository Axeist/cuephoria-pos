import React, { useState, useEffect, useRef } from 'react';
import { Station } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/context/POSContext';
import { Session } from '@/types/pos.types';
import {
  calculateSessionCost,
  formatBillableTime,
  getBillableMs,
} from '@/utils/sessionTimer.utils';
import { Clock } from 'lucide-react';

interface StationTimerProps {
  station: Station;
  compact?: boolean;
}

function toTimeMs(value: Date | string | undefined): number | null {
  if (value == null) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const StationTimer: React.FC<StationTimerProps> = ({ station }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [cost, setCost] = useState(0);
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

    let sessionSnapshot: Session = {
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

      setSeconds(time.seconds);
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
    station.category,
    station.slotDuration,
    station.type,
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
      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ${
        isPaused
          ? 'bg-amber-950/50 ring-1 ring-amber-500/30'
          : 'bg-black/50 ring-1 ring-white/10'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Clock className={`h-3.5 w-3.5 shrink-0 ${isPaused ? 'text-amber-400' : 'text-white/60'}`} />
        <span
          className={`font-mono text-base font-bold tabular-nums ${
            isPaused ? 'text-amber-100' : 'text-white'
          }`}
        >
          {timeStr}
        </span>
      </div>
      <CurrencyDisplay
        amount={cost}
        className={`text-sm font-bold shrink-0 ${isPaused ? 'text-amber-300' : 'text-cuephoria-orange'}`}
      />
    </div>
  );
};

export default StationTimer;
