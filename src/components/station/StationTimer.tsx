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

interface StationTimerProps {
  station: Station;
}

function toTimeMs(value: Date | string | undefined): number | null {
  if (value == null) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const StationTimer: React.FC<StationTimerProps> = ({ station }) => {
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
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
      const customer = customersRef.current.find(
        (c) => c.id === sessionSnapshot.customerId
      );
      const isMember = customer?.isMember || false;
      const billableMs = getBillableMs(sessionSnapshot);
      const time = formatBillableTime(billableMs);
      const rate = sessionSnapshot.hourlyRate || station.hourlyRate;

      setSeconds(time.seconds);
      setMinutes(time.minutes);
      setHours(time.hours);
      setCost(calculateSessionCost(station, rate, billableMs, isMember));
    };

    const fetchSessionData = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('start_time, hourly_rate, is_paused, paused_at, total_paused_time')
          .eq('id', sessionId)
          .single();

        if (error || !data?.start_time) {
          updateTimer();
          return;
        }

        sessionSnapshot = {
          ...sessionSnapshot,
          startTime: new Date(data.start_time),
          hourlyRate: data.hourly_rate || station.hourlyRate,
          isPaused: data.is_paused ?? false,
          pausedAt: data.paused_at ? new Date(data.paused_at) : undefined,
          totalPausedMs: data.total_paused_time ?? 0,
        };
        updateTimer();
      } catch {
        updateTimer();
      }
    };

    void fetchSessionData();
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
  ]);

  const formatTimeDisplay = () => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!station.isOccupied || !session) {
    return null;
  }

  if (startTimeMs == null) {
    return (
      <div className="rounded-lg bg-black/70 p-3 text-center text-sm text-white/50">
        Loading session timer…
      </div>
    );
  }

  const hasCoupon = session.couponCode;
  const isDiscounted = hasCoupon && sessionRate !== station.hourlyRate;

  return (
    <div className={`space-y-4 p-3 rounded-lg ${isPaused ? 'bg-amber-950/50 ring-1 ring-amber-500/40' : 'bg-black/70'}`}>
      {isPaused && (
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
            Paused
          </span>
        </div>
      )}
      <div className="text-center">
        <span className={`font-mono text-2xl px-4 py-2 rounded-lg font-bold inline-block w-full ${
          isPaused ? 'bg-amber-950 text-amber-100' : 'bg-black text-white'
        }`}>
          {formatTimeDisplay()}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white">Current Cost:</span>
        <CurrencyDisplay 
          amount={cost} 
          className={`font-bold text-lg ${isDiscounted ? 'text-orange-400' : 'text-cuephoria-orange'}`} 
        />
      </div>
      <div className="text-xs text-gray-400 text-center">
        @ ₹{sessionRate}/hr
        {isDiscounted && (
          <span className="ml-1 line-through text-gray-500">
            ₹{station.hourlyRate}/hr
          </span>
        )}
      </div>
    </div>
  );
};

export default StationTimer;
