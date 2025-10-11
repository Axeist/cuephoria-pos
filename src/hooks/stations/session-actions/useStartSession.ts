import { Session, Station } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SessionActionsProps } from './types';
import React from 'react';
import { generateId } from '@/utils/pos.utils';

/**
 * Hook to provide session start functionality
 */
export const useStartSession = ({
  stations,
  setStations,
  sessions,
  setSessions
}: SessionActionsProps) => {
  const { toast } = useToast();
  
  /**
   * Start a new session for a station
   */
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
      
      // Check if the station is already occupied
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
      
      // Calculate session rate and discount
      const sessionRate = finalRate !== undefined ? finalRate : station.hourlyRate;
      const originalRate = station.hourlyRate;
      const discountAmount = originalRate - sessionRate;
      
      console.log("💰 Rate calculation:", {
        originalRate,
        sessionRate,
        discountAmount,
        couponCode
      });
      
      // Create new session object
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
      
      console.log("📦 Created new session object:", newSession);
      
      // Update local state FIRST for immediate UI update
      setSessions(prev => [...prev, newSession]);
      setStations(prev => prev.map(s => 
        s.id === stationId 
          ? { ...s, isOccupied: true, currentSession: newSession } 
          : s
      ));
      
      console.log("✅ Local state updated");
      
      // Then try to create session in Supabase sessions table
      try {
        const dbStationId = stationId.includes('-') ? stationId : sessionId;
        
        console.log("💾 Saving to sessions table with station_id:", dbStationId);
        
        const { data, error } = await supabase
          .from('sessions')
          .insert({
            id: sessionId,
            station_id: dbStationId,
            customer_id: customerId,
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
      
      // CRITICAL: Update station in Supabase with currentSession
      try {
        // Check if station ID is a valid UUID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId);
        
        console.log("🔍 Station ID validation:", {
          stationId,
          isValidUUID,
          length: stationId.length
        });
        
        if (isValidUUID) {
          console.log("💾 Updating stations table with currentsession...");
          
          const { error: stationError, data: stationData } = await supabase
            .from('stations')
            .update({ 
              is_occupied: true,
              currentsession: newSession  // Store as JSONB
            })
            .eq('id', stationId)
            .select();
          
          if (stationError) {
            console.error('❌ Error updating station in Supabase:', stationError);
            toast({
              title: 'Warning',
              description: 'Session started but database sync failed',
              variant: 'destructive'
            });
          } else {
            console.log("✅ SUCCESS! Station updated in Supabase:", stationData);
            
            // Verify the update
            const { data: verifyData, error: verifyError } = await supabase
              .from('stations')
              .select('currentsession, is_occupied')
              .eq('id', stationId)
              .single();
            
            if (verifyError) {
              console.error('❌ Error verifying update:', verifyError);
            } else {
              console.log("✅ Verified data in DB:", verifyData);
              if (!verifyData?.currentsession) {
                console.error("❌ WARNING: currentsession is still NULL in database!");
              }
            }
          }
        } else {
          console.warn("⚠️ Station ID is not a valid UUID, cannot update database:", stationId);
          toast({
            title: 'Warning',
            description: 'Session started locally only (invalid station ID format)',
          });
        }
      } catch (supabaseError) {
        console.error('❌ Error updating station in Supabase:', supabaseError);
      }
      
      // Show success message
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
