import React, { useState, useEffect } from 'react';
import { Station } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/context/POSContext';

interface StationTimerProps {
  station: Station;
}

const StationTimer: React.FC<StationTimerProps> = ({ station }) => {
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const { customers } = usePOS();

  useEffect(() => {
    if (!station.isOccupied || !station.currentSession) {
      setHours(0);
      setMinutes(0);
      setSeconds(0);
      setCost(0);
      return;
    }

    let startTime = new Date(station.currentSession.startTime);
    let sessionRate = station.currentSession.hourlyRate || station.hourlyRate;

    const customer = customers.find(c => c.id === station.currentSession?.customerId);
    const isMember = customer?.isMember || false;

    const updateTimer = () => {
      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();

      const secondsTotal = Math.floor(elapsedMs / 1000);
      const minutesTotal = Math.floor(secondsTotal / 60);
      const hoursTotal = Math.floor(minutesTotal / 60);

      setSeconds(secondsTotal % 60);
      setMinutes(minutesTotal % 60);
      setHours(hoursTotal);

      const durationMinutes = Math.ceil(elapsedMs / (1000 * 60));

      let calculatedCost: number;
      if (station.category === 'nit_event' && station.slotDuration) {
        const slotsPlayed = Math.ceil(durationMinutes / station.slotDuration);
        calculatedCost = slotsPlayed * sessionRate;
      } else if (station.type === 'vr') {
        const slotsPlayed = Math.ceil(durationMinutes / 15);
        calculatedCost = slotsPlayed * sessionRate;
      } else {
        const hoursElapsed = elapsedMs / (1000 * 60 * 60);
        calculatedCost = Math.ceil(hoursElapsed * sessionRate);
      }

      if (isMember) {
        calculatedCost = Math.ceil(calculatedCost * 0.5);
      }

      setCost(calculatedCost);
    };

    const fetchSessionData = async () => {
      try {
        const sessionId = station.currentSession!.id;

        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error || !data?.start_time) {
          updateTimer();
          return;
        }

        startTime = new Date(data.start_time);
        sessionRate = data.hourly_rate || station.hourlyRate;
        updateTimer();
      } catch {
        updateTimer();
      }
    };

    fetchSessionData();
    updateTimer();

    const intervalId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    station.isOccupied,
    station.currentSession?.id,
    station.currentSession?.startTime,
    station.currentSession?.customerId,
    station.currentSession?.hourlyRate,
    station.hourlyRate,
    station.category,
    station.slotDuration,
    station.type,
    customers,
  ]);

  const formatTimeDisplay = () => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!station.isOccupied || !station.currentSession) {
    return null;
  }

  const hasCoupon = station.currentSession?.couponCode;
  const sessionRate = station.currentSession?.hourlyRate || station.hourlyRate;
  const isDiscounted = hasCoupon && sessionRate !== station.hourlyRate;

  return (
    <div className="space-y-4 bg-black/70 p-3 rounded-lg">
      <div className="text-center">
        <span className="font-mono text-2xl bg-black px-4 py-2 rounded-lg text-white font-bold inline-block w-full">
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
