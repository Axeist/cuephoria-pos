import { useState, useEffect, useCallback, useMemo } from 'react';
import { Session } from '@/types/pos.types';
import { supabase, handleSupabaseError } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getCachedData, saveToCache, isCacheStale, invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from '@/utils/dataCache';
import { useLocation } from '@/context/LocationContext';

/**
 * ✅ OPTIMIZED: Hook to load and manage session data from Supabase
 * Uses Realtime subscriptions instead of polling to reduce egress by 60-80%
 */
export const useSessionsData = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [sessionsError, setSessionsError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const sessionsCacheKey = useMemo(
    () => cacheKeyWithLocation(CACHE_KEYS.SESSIONS, activeLocationId),
    [activeLocationId]
  );

  const refreshSessionsFromDB = useCallback(async (silent: boolean = false) => {
    if (!activeLocationId) {
      setSessions([]);
      if (!silent) setSessionsLoading(false);
      return;
    }

    if (!silent) {
      setSessionsLoading(true);
      setSessionsError(null);
    }
    
    try {
      // ✅ OPTIMIZED: Select only required fields instead of '*'
      // ✅ OPTIMIZED: Added .limit(100) to fetch only recent sessions
      const { data, error } = await supabase
        .from('sessions')
        .select('id, station_id, customer_id, start_time, end_time, duration, hourly_rate, original_rate, coupon_code, discount_amount')
        .eq('location_id', activeLocationId)
        .order('created_at', { ascending: false })
        .limit(100); // Only fetch 100 most recent sessions
        
      if (error) {
        console.error('Error fetching sessions:', error);
        if (!silent) {
          setSessionsError(new Error(`Failed to fetch sessions: ${error.message}`));
          toast({
            title: 'Database Error',
            description: 'Failed to fetch sessions from database',
            variant: 'destructive'
          });
        }
        return;
      }
      
      if (data && data.length > 0) {
        const sessionsData = data as any[];
        
        const transformedSessions = sessionsData.map(item => ({
          id: item.id,
          stationId: item.station_id,
          customerId: item.customer_id,
          startTime: new Date(item.start_time),
          endTime: item.end_time ? new Date(item.end_time) : undefined,
          duration: item.duration,
          hourlyRate: item.hourly_rate,
          originalRate: item.original_rate,
          couponCode: item.coupon_code,
          discountAmount: item.discount_amount
        }));
        
        console.log(`✅ Loaded ${transformedSessions.length} sessions from Supabase (limited to 100)`);
        setSessions(transformedSessions);
        // ✅ Save to cache
        saveToCache(sessionsCacheKey, transformedSessions);
        
        const activeSessions = transformedSessions.filter(s => !s.endTime);
        console.log(`Found ${activeSessions.length} active sessions in loaded data`);
        activeSessions.forEach(s => {
          console.log(`- Active session ID: ${s.id}, Station ID: ${s.stationId}`);
          if (s.couponCode) {
            console.log(`  ✅ Coupon: ${s.couponCode}, Rate: ${s.hourlyRate}`);
          }
        });
      } else {
        console.log("No sessions found in Supabase");
        setSessions([]);
        saveToCache(sessionsCacheKey, []);
      }
    } catch (error) {
      console.error('Error in fetchSessions:', error);
      if (!silent) {
        setSessionsError(error instanceof Error ? error : new Error('Unknown error fetching sessions'));
        toast({
          title: 'Error',
          description: 'Failed to load sessions',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) {
        setSessionsLoading(false);
      }
    }
  }, [toast, activeLocationId, sessionsCacheKey]);

  const refreshSessions = useCallback(async (silent: boolean = false) => {
    const cachedSessions = getCachedData<Session[]>(sessionsCacheKey);

    if (cachedSessions && cachedSessions.length > 0 && !silent) {
      console.log('📦 Using cached sessions');
      setSessions(cachedSessions);
      setSessionsLoading(false);

      if (isCacheStale(sessionsCacheKey)) {
        refreshSessionsFromDB(true).catch(err => {
          console.error('Error refreshing sessions in background:', err);
        });
      }
      return;
    }

    await refreshSessionsFromDB(silent);
  }, [sessionsCacheKey, refreshSessionsFromDB]);
  
  const deleteSession = async (sessionId: string): Promise<boolean> => {
    try {
      setSessionsLoading(true);
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
        
      if (error) {
        throw new Error(handleSupabaseError(error, 'delete session'));
      }
      
      setSessions(prevSessions => {
        const updated = prevSessions.filter(session => session.id !== sessionId);
        // ✅ Update cache
        saveToCache(sessionsCacheKey, updated);
        return updated;
      });
      
      // ✅ Invalidate cache
      invalidateCache(sessionsCacheKey);
      
      toast({
        title: 'Success',
        description: 'Session deleted successfully',
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete session',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSessionsLoading(false);
    }
  };
  
  // Clear stale data immediately when branch changes
  useEffect(() => {
    setSessions([]);
  }, [activeLocationId]);

  useEffect(() => {
    console.log('Setting up Realtime subscription for sessions');
    
    // Initial load
    refreshSessions();
    
    // Debounce timer for Realtime subscription refreshes
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    // ✅ OPTIMIZED: Replace polling with Realtime subscription
    // This only fetches data when actual database changes occur
    // Eliminates 720 daily polling requests (every 2 minutes)
    const channel: RealtimeChannel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'sessions' 
        },
        (payload) => {
          console.log('Session change detected via Realtime:', payload.eventType);
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
          refreshTimeout = setTimeout(() => {
            console.log('Refreshing sessions after Realtime change (debounced)');
            // Bypass cache — DB already has the new state
            invalidateCache(sessionsCacheKey);
            refreshSessionsFromDB(true);
          }, 300);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to sessions Realtime channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to sessions Realtime channel');
        }
      });
    
    // ❌ REMOVED: setInterval polling (was 120000ms / 2 minutes)
    // ❌ REMOVED: handleVisibilityChange listener
    // These are replaced by the Realtime subscription above
    
    return () => {
      console.log('Cleaning up Realtime subscription');
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [refreshSessions]);
  
  return {
    sessions,
    setSessions,
    sessionsLoading,
    sessionsError,
    refreshSessions,
    deleteSession
  };
};
