import { useState } from 'react';
import { useStartSession } from './useStartSession';
import { useEndSession } from './useEndSession';
import { SessionActionsProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/utils/pos.utils';
import { Session, SessionResult, Customer } from '@/types/pos.types';
import { isMembershipActive } from '@/utils/membership.utils';

export const useSessionActions = (props: SessionActionsProps) => {
  const { stations, setStations, sessions, setSessions, updateCustomer } = props;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the functionality from existing hooks
  const startSessionHook = useStartSession(props);
  const endSessionHook = useEndSession({...props, updateCustomer});
  
  // UPDATED: Added finalRate and couponCode parameters
  const startSession = async (
    stationId: string, 
    customerId: string,
    finalRate?: number,
    couponCode?: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting session for station:', stationId, 'customer:', customerId);
      
      // Find the station
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.error('Station not found:', stationId);
        throw new Error('Station not found');
      }
      
      if (station.isOccupied) {
        console.error('Station is already occupied:', stationId);
        throw new Error('Station is already occupied');
      }
      
      // Create a new session
      const now = new Date();
      const sessionId = generateId();
      
      // UPDATED: Calculate session rate if finalRate provided
      const sessionRate = finalRate !== undefined ? finalRate : station.hourlyRate;
      const originalRate = station.hourlyRate;
      const discountAmount = originalRate - sessionRate;
      
      const newSession: Session = {
        id: sessionId,
        stationId: stationId,
        customerId: customerId,
        startTime: now,
        hourlyRate: sessionRate,        // ADDED
        originalRate: originalRate,     // ADDED
        couponCode: couponCode,         // ADDED
        discountAmount: discountAmount, // ADDED
        // No endTime or duration, will be set when explicitly ended
      };
      
      // Check if stationId is in UUID format for Supabase
      const isUUID = stationId.includes('-') && 
                    stationId.split('-').length === 5 && 
                    stationId.length >= 36;
                    
      console.log(`Station ID ${stationId} is ${isUUID ? '' : 'not '}a valid UUID`);
      
      // For database operations, use a valid UUID
      const dbStationId = isUUID ? stationId : sessionId;
      
      // Insert into Supabase
      try {
        // Use type assertion to work around TypeScript issues with Supabase
        const { data, error } = await supabase
          .from('sessions' as any)
          .insert({
            id: newSession.id,
            station_id: dbStationId, // Use a valid UUID for database
            customer_id: newSession.customerId,
            start_time: newSession.startTime.toISOString(),
            hourly_rate: sessionRate,        // ADDED
            original_rate: originalRate,     // ADDED
            coupon_code: couponCode,         // ADDED
            discount_amount: discountAmount, // ADDED
            // No end_time or duration, making it persist until explicitly ended
          } as any)
          .select();
          
        if (error) {
          console.error('Error inserting session into Supabase:', error);
          console.log('Continuing with local state updates only');
        } else {
          console.log('Session inserted into Supabase:', data);
        }
      } catch (error) {
        console.error('Supabase insert error:', error);
        console.log('Continuing with local state updates only');
      }
      
      // Update station
      const updatedStation = {
        ...station,
        isOccupied: true,
        currentSession: newSession
      };
      
      // Update Supabase station only if ID is in valid UUID format
      if (isUUID) {
        try {
          const { error: stationError } = await supabase
            .from('stations')
            .update({
              is_occupied: true
            })
            .eq('id', stationId);
            
          if (stationError) {
            console.error('Error updating station in Supabase:', stationError);
          }
        } catch (error) {
          console.error('Supabase station update error:', error);
        }
      }
      
      // Update local state
      setStations(stations.map(s => s.id === stationId ? updatedStation : s));
      setSessions([...sessions, newSession]);
      
      // UPDATED: Show coupon info if applied
      const couponText = couponCode ? ` with ${couponCode}` : '';
      toast({
        title: 'Session Started',
        description: `Session started for station ${station.name}${couponText}`,
      });
      
      console.log('Session started successfully');
      
    } catch (error) {
      console.error('Error in startSession:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start session',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // End an active session (NO CHANGES)
  const endSession = async (stationId: string, customersList?: Customer[]): Promise<SessionResult | undefined> => {
    try {
      setIsLoading(true);
      console.log('Ending session for station:', stationId);
      
      // Find the station
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.error('Station not found:', stationId);
        throw new Error('Station not found');
      }
      
      if (!station.isOccupied || !station.currentSession) {
        console.error('No active session found for this station:', stationId);
        throw new Error('No active session found');
      }
      
      // Call the original hook implementation to handle session ending
      const result = await endSessionHook.endSession(stationId, customersList);
      console.log("Session ended successfully, result:", result);
      
      return result;
      
    } catch (error) {
      console.error('Error in endSession:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to end session',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    startSession,
    endSession,
    isLoading
  };
};
