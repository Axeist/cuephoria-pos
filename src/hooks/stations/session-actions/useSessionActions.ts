import { useState } from 'react';
import { useStartSession } from './useStartSession';
import { useEndSession } from './useEndSession';
import { usePauseSession } from './usePauseSession';
import { useExtendSession } from './useExtendSession';
import { useMoveSession } from './useMoveSession';
import { SessionActionsProps } from './types';
import { Customer } from '@/types/pos.types';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import { useToast } from '@/hooks/use-toast';
import type { SessionResult, SessionGroupResult } from '@/types/pos.types';
import type { EarlyEndBillingMode } from './useEndSession';

export const useSessionActions = (props: SessionActionsProps) => {
  const { stations, setStations, sessions, setSessions, updateCustomer } = props;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const startSessionHook = useStartSession(props);
  const endSessionHook = useEndSession({...props, updateCustomer});
  const pauseSessionHook = usePauseSession(props);
  const extendSessionHook = useExtendSession(props);
  const moveSessionHook = useMoveSession(props);
  
  const startSession = async (
    stationId: string,
    customerId: string,
    finalRate?: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number,
    plannedDurationMinutes?: number,
    prepaidBooking?: PrepaidBookingLink,
    sessionGroupId?: string,
    customStartTime?: Date
  ): Promise<void> => {
    try {
      setIsLoading(true);
      await startSessionHook.startSession(
        stationId,
        customerId,
        finalRate,
        couponCode,
        playerCount,
        perPersonRate,
        plannedDurationMinutes,
        prepaidBooking,
        sessionGroupId,
        customStartTime
      );
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const extendSession = async (stationId: string, extraMinutes: number): Promise<void> => {
    try {
      setIsLoading(true);
      await extendSessionHook.extendSession(stationId, extraMinutes);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const moveSession = async (fromStationId: string, toStationId: string): Promise<void> => {
    try {
      setIsLoading(true);
      await moveSessionHook.moveSession(fromStationId, toStationId);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const endSession = async (stationId: string, customersList?: Customer[], billingMode?: EarlyEndBillingMode): Promise<SessionResult | undefined> => {
    try {
      setIsLoading(true);
      console.log('Ending session for station:', stationId);
      
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.error('Station not found:', stationId);
        throw new Error('Station not found');
      }
      
      if (!station.isOccupied || !station.currentSession) {
        console.error('No active session found for this station:', stationId);
        throw new Error('No active session found');
      }
      
      const result = await endSessionHook.endSession(stationId, customersList, { billingMode });
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

  const endSessionGroup = async (stationId: string, customersList?: Customer[]): Promise<SessionGroupResult | undefined> => {
    try {
      setIsLoading(true);
      return await endSessionHook.endSessionGroup(stationId, customersList);
    } catch (error) {
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
    endSessionGroup,
    pauseSession,
    resumeSession,
    extendSession,
    moveSession,
    isLoading
  };
};
