import React, { useState, useEffect, useRef } from 'react';
import { Station } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';

interface StationTimerProps {
  station: Station;
}

const StationTimer: React.FC<StationTimerProps> = ({ station }) => {
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const { toast } = useToast();
  const { customers } = usePOS();
  const timerRef = useRef<number | null>(null);
  const sessionDataRef = useRef<{
    sessionId: string;
    startTime: Date;
    stationId: string;
    customerId: string;
    hourlyRate: number;
  } | null>(null);

  useEffect(() => {
    if (!station.isOccupied || !station.currentSession) {
      setHours(0);
      setMinutes(0);
      setSeconds(0);
      setCost(0);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      sessionDataRef.current = null;
      return;
    }

    // ✅ UPDATED: Store the session data including coupon-discounted rate
    if (station.currentSession && !sessionDataRef.current) {
      sessionDataRef.current = {
        sessionId: station.currentSession.id,
        startTime: new Date(station.currentSession.startTime),
        stationId: station.id,
        customerId: station.currentSession.customerId,
        hourlyRate: station.currentSession.hourlyRate || station.hourlyRate  // Use session rate if available
      };
    }

    // Find the customer to check if they are a member
    const customer = customers.find(c => c.id === station.currentSession?.customerId);
    const isMember = customer?.isMember || false;

    // Initial calculation based on local session data
    const updateTimerFromLocalData = () => {
      if (!sessionDataRef.current) return;
      
      const startTime = sessionDataRef.current.startTime;
      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      
      const secondsTotal = Math.floor(elapsedMs / 1000);
      const minutesTotal = Math.floor(secondsTotal / 60);
      const hoursTotal = Math.floor(minutesTotal / 60);
      
      setSeconds(secondsTotal % 60);
      setMinutes(minutesTotal % 60);
      setHours(hoursTotal);
      
      // ✅ UPDATED: Use session's hourly rate (which may be discounted from coupon)
      const sessionRate = station.currentSession?.hourlyRate || station.hourlyRate;
      const durationMinutes = Math.ceil(elapsedMs / (1000 * 60));
      
      // Calculate cost based on station type and slot duration
      let calculatedCost: number;
      if (station.category === 'nit_event' && station.slotDuration) {
        // Event stations: Bill per slot (rounded up)
        const slotsPlayed = Math.ceil(durationMinutes / station.slotDuration);
        calculatedCost = slotsPlayed * sessionRate;
      } else if (station.type === 'vr') {
        // Regular VR: 15-minute slots
        const slotsPlayed = Math.ceil(durationMinutes / 15);
        calculatedCost = slotsPlayed * sessionRate;
      } else {
        // Regular stations: Bill per hour
        const hoursElapsed = elapsedMs / (1000 * 60 * 60);
        calculatedCost = Math.ceil(hoursElapsed * sessionRate);
      }
      
      // Apply 50% discount for members - IMPORTANT: Same logic as in useEndSession
      if (isMember) {
        calculatedCost = Math.ceil(calculatedCost * 0.5); // 50% discount
      }
      
      setCost(calculatedCost);
      
      console.log("Timer update:", {
        sessionId: sessionDataRef.current.sessionId,
        startTime: startTime.toISOString(),
        elapsedMs,
        secondsTotal,
        minutesTotal,
        hoursTotal,
        durationMinutes,
        sessionRate,  // ✅ UPDATED: Shows discounted rate
        originalRate: station.hourlyRate,
        stationCategory: station.category,
        slotDuration: station.slotDuration,
        stationType: station.type,
        couponCode: station.currentSession?.couponCode,
        isMember,
        discountApplied: isMember,
        calculatedCost
      });
    };

    // Try to get session data from Supabase
    const fetchSessionData = async () => {
      try {
        if (!station.currentSession) return;
        
        const sessionId = station.currentSession.id;
        console.log("Fetching session data for ID:", sessionId);
        
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
          
        if (error) {
          console.error("Error fetching session data:", error);
          // Fallback to local data
          updateTimerFromLocalData();
          return;
        }
        
        if (data) {
          // Use type assertion since we know this data should exist
          const sessionData = data as any;
          
          if (sessionData && sessionData.start_time) {
            const startTime = new Date(sessionData.start_time);
            // ✅ UPDATED: Get hourly rate from DB (with coupon discount)
            const dbHourlyRate = sessionData.hourly_rate || station.hourlyRate;
            
            console.log("Session start time from Supabase:", startTime);
            console.log("Session hourly rate from Supabase:", dbHourlyRate);
            
            // Update the sessionDataRef with data from Supabase
            if (sessionDataRef.current) {
              sessionDataRef.current.startTime = startTime;
              sessionDataRef.current.hourlyRate = dbHourlyRate;  // ✅ UPDATED
            } else {
              sessionDataRef.current = {
                sessionId,
                startTime,
                stationId: station.id,
                customerId: station.currentSession.customerId,
                hourlyRate: dbHourlyRate  // ✅ UPDATED
              };
            }
            
            updateTimerFromLocalData();
          } else {
            // Fallback to local data
            updateTimerFromLocalData();
          }
        } else {
          // Fallback to local data
          updateTimerFromLocalData();
        }
      } catch (error) {
        console.error("Error in fetchSessionData:", error);
        // Fallback to local data
        updateTimerFromLocalData();
      }
    };
    
    // Fetch data initially
    fetchSessionData();
    
    // Set up interval for regular updates that persists
    if (timerRef.current === null) {
      timerRef.current = window.setInterval(() => {
        updateTimerFromLocalData();
      }, 1000);
    }
    
    // Clean up on unmount
    return () => {
      // Don't clear the interval - let the timer continue running
      // This is intentional to keep the session running in the background
      // even if component unmounts
    };
  }, [station, customers]);

  // Add a cleanup function for component unmount
  useEffect(() => {
    return () => {
      // This will only run when the component is truly unmounted (not page change)
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTimeDisplay = () => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!station.isOccupied || !station.currentSession) {
    return null;
  }

  // ✅ NEW: Check if coupon discount is applied
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
      {/* ✅ NEW: Show rate information with discount indicator */}
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
