import { useState } from 'react';
import { useStartSession } from './useStartSession';
import { useEndSession } from './useEndSession';
import { usePauseSession } from './usePauseSession';
import { SessionActionsProps } from './types';
import { Customer } from '@/types/pos.types';
import { useToast } from '@/hooks/use-toast';
import type { SessionResult } from '@/types/pos.types';

export const useSessionActions = (props: SessionActionsProps) => {
  const { stations, setStations, sessions, setSessions, updateCustomer } = props;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the functionality from existing hooks
  const startSessionHook = useStartSession(props);
  const endSessionHook = useEndSession({...props, updateCustomer});
  const pauseSessionHook = usePauseSession(props);
  
  const startSession = async (
    stationId: string,
    customerId: string,
    finalRate?: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number
  ): Promise<void> => {
    try {
      setIsLoading(true);
      await startSessionHook.startSession(
        stationId,
        customerId,
        finalRate,
        couponCode,
        playerCount,
        perPersonRate
      );
    } catch (error) {
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
  
  const pauseSession = async (stationId: string): Promise<void> => {
    try {
      setIsLoading(true);
      await pauseSessionHook.pauseSession(stationId);
    } catch (error) {
      console.error('Error in pauseSession:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resumeSession = async (stationId: string): Promise<void> => {
    try {
      setIsLoading(true);
      await pauseSessionHook.resumeSession(stationId);
    } catch (error) {
      console.error('Error in resumeSession:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    isLoading
  };
};
