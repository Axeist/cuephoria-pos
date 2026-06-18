import { Session, Station } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SessionActionsProps } from './types';
import React from 'react';
import { generateId } from '@/utils/pos.utils';
import { useLocation } from '@/context/LocationContext';

/**
 * Hook to provide session start functionality with full debugging
 */
export const useStartSession = ({
  stations,
  setStations,
  sessions,
  setSessions
}: SessionActionsProps) => {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  
  const startSession = async (
    stationId: string, 
    customerId: string,
    finalRate?: number,
    couponCode?: string
  ): Promise<Session | undefined> => {
    try {
      console.log("🚀 Starting session for station:", stationId, "for customer:", customerId);
      console.log("🎟️ Coupon details:", { finalRate, couponCode });
      
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.error("❌ Station not found");
        toast({
          title: "Station Error",
          description: "Station not found",
          variant: "destructive"
        });
        throw new Error("Station not found");
      }
      
      if (!activeLocationId) {
        toast({
          title: "Branch required",
          description: "Select a branch before starting a session.",
          variant: "destructive",
        });
        throw new Error("No branch selected");
      }

      if (station.isOccupied || station.currentSession) {
        console.error("❌ Station already occupied");
        toast({
          title: "Station Error",
          description: "Station is already occupied",
          variant: "destructive"
        });
        throw new Error("Station already occupied");
      }
      
      const startTime = new Date();
      const sessionId = generateId();
      console.log("🆔 Generated session ID:", sessionId);
      
      const sessionRate = finalRate !== undefined ? finalRate : station.hourlyRate;
      const originalRate = station.hourlyRate;
      const discountAmount = originalRate - sessionRate;
      
      console.log("💰 Rate calculation:", {
        originalRate,
        sessionRate,
        discountAmount,
        couponCode
      });
      
      const newSession: Session = {
        id: sessionId,
        stationId,
        customerId,
        startTime,
        hourlyRate: sessionRate,
        originalRate: originalRate,
        couponCode: couponCode,
        discountAmount: discountAmount,
      };
      
      console.log("📦 Created new session object:", JSON.stringify(newSession, null, 2));
      
      // Update local state FIRST
      setSessions(prev => [...prev, newSession]);
      setStations(prev => prev.map(s => 
        s.id === stationId 
          ? { ...s, isOccupied: true, currentSession: newSession } 
          : s
      ));
      
      console.log("✅ Local state updated");
      
      // Save to sessions table
      try {
        const dbStationId = stationId.includes('-') ? stationId : sessionId;
        
        console.log("💾 Saving to sessions table with station_id:", dbStationId);
        
        const { data, error } = await supabase
          .from('sessions')
          .insert({
            id: sessionId,
            station_id: dbStationId,
            customer_id: customerId,
            location_id: activeLocationId,
            start_time: startTime.toISOString(),
            hourly_rate: sessionRate,
            original_rate: originalRate,
            coupon_code: couponCode,
            discount_amount: discountAmount,
          } as any)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Error creating session in Supabase:', error);
        } else {
          console.log("✅ Session saved to sessions table:", data);
        }
      } catch (supabaseError) {
        console.error('❌ Error in Supabase sessions operation:', supabaseError);
      }
      
      // CRITICAL: Update station with currentsession
      try {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId);
        
        console.log("🔍 Station ID validation:", {
          stationId,
          isValidUUID,
          stationType: typeof stationId,
          length: stationId.length
        });
        
        if (!isValidUUID) {
          console.error("❌❌❌ CRITICAL: Station ID is not a valid UUID!");
          console.error("❌ Cannot save to database. Coupon will be LOST on refresh!");
          console.error("❌ Station ID received:", stationId);
          
          alert(`CRITICAL ERROR: Invalid station ID format!\nStation ID: ${stationId}\nCoupon data will NOT persist after refresh!`);
          
          toast({
            title: 'Critical Warning',
            description: 'Session started but will NOT persist after refresh (invalid station ID)',
            variant: 'destructive'
          });
        } else {
          console.log("💾 Station ID is valid. Updating stations table...");
          console.log("💾 Data to save:", { 
            is_occupied: true, 
            currentsession: newSession 
          });
          
          const { error: stationError, data: updateResult } = await supabase
            .from('stations')
            .update({ 
              is_occupied: true,
              currentsession: newSession
            })
            .eq('id', stationId)
            .eq('location_id', activeLocationId)
            .select();
          
          if (stationError) {
            console.error('❌❌❌ CRITICAL ERROR updating station in Supabase!');
            console.error('❌ Error message:', stationError.message);
            console.error('❌ Error code:', stationError.code);
            console.error('❌ Error details:', stationError.details);
            console.error('❌ Error hint:', stationError.hint);
            
            alert(`DATABASE UPDATE FAILED!\n\nError: ${stationError.message}\n\nCoupon will be lost on refresh!`);
            
            toast({
              title: 'Database Error',
              description: `Failed to save session: ${stationError.message}`,
              variant: 'destructive'
            });
          } else {
            console.log("✅✅✅ SUCCESS! Station table updated!");
            console.log("✅ Update result:", updateResult);
            
            // Verify the save
            console.log("🔍 Verifying database save...");
            const { data: verifyData, error: verifyError } = await supabase
              .from('stations')
              .select('id, name, currentsession, is_occupied')
              .eq('id', stationId)
              .single();
            
            if (verifyError) {
              console.error('❌ Error verifying update:', verifyError);
            } else {
              console.log("✅ Verification data:", verifyData);
              
              if (!verifyData?.currentsession) {
                console.error("❌❌❌ WARNING: currentsession is NULL in database after save!");
                console.error("❌ This means the data was NOT saved!");
                alert('WARNING: Session saved but currentsession is NULL in database!');
              } else {
                console.log("✅✅✅ PERFECT! currentsession is saved in database:");
                console.log("✅ Saved data:", JSON.stringify(verifyData.currentsession, null, 2));
                
                // Check if coupon data is present
                if (verifyData.currentsession.couponCode) {
                  console.log("✅ Coupon code confirmed in DB:", verifyData.currentsession.couponCode);
                  console.log("✅ Discounted rate in DB:", verifyData.currentsession.hourlyRate);
                } else {
                  console.warn("⚠️ Coupon code is missing in DB!");
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Exception in station update:', error);
        alert('Exception during database update: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
      
      const couponText = couponCode 
        ? ` with ${couponCode} (₹${discountAmount} saved)` 
        : '';
      
      toast({
        title: 'Success',
        description: `Session started successfully${couponText}`,
      });
      
      console.log("🎉 Session start complete!");
      
      return newSession;
    } catch (error) {
      console.error('❌ Error in startSession:', error);
      toast({
        title: 'Error',
        description: 'Failed to start session: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive'
      });
      return undefined;
    }
  };
  
  return { startSession };
};
