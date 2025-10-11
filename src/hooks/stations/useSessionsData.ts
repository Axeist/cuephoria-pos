import { useState, useEffect, useCallback } from 'react';
import { Session } from '@/types/pos.types';
import { supabase, handleSupabaseError } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to load and manage session data from Supabase
 */
export const useSessionsData = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [sessionsError, setSessionsError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  // Memoize the refreshSessions function to prevent unnecessary recreations
  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    
    try {
      // Optimize query by adding limit if necessary
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching sessions:', error);
        setSessionsError(new Error(`Failed to fetch sessions: ${error.message}`));
        toast({
          title: 'Database Error',
          description: 'Failed to fetch sessions from database',
          variant: 'destructive'
        });
        return;
      }
      
      // Transform data to match our Session type - do this more efficiently
      if (data && data.length > 0) {
        // Use type assertion to handle the TypeScript issues
        const sessionsData = data as any[];
        
        // ✅ FIXED: Include all coupon fields
        const transformedSessions = sessionsData.map(item => ({
          id: item.id,
          stationId: item.station_id,
          customerId: item.customer_id,
          startTime: new Date(item.start_time),
          endTime: item.end_time ? new Date(item.end_time) : undefined,
          duration: item.duration,
          hourlyRate: item.hourly_rate,           // ✅ ADDED
          originalRate: item.original_rate,       // ✅ ADDED
          couponCode: item.coupon_code,           // ✅ ADDED
          discountAmount: item.discount_amount    // ✅ ADDED
        }));
        
        console.log(`Loaded ${transformedSessions.length} total sessions from Supabase`);
        setSessions(transformedSessions);
        
        // Log active sessions (those without end_time)
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
      }
    } catch (error) {
      console.error('Error in fetchSessions:', error);
      setSessionsError(error instanceof Error ? error : new Error('Unknown error fetching sessions'));
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive'
      });
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);
  
  // Add delete session functionality
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
      
      // Update local state to remove the deleted session
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      
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
  
  useEffect(() => {
    console.log('Initial session load triggered');
    // Start loading immediately
    refreshSessions();
    
    // Add listener for page visibility changes to refresh sessions when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing sessions...');
        refreshSessions();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up a regular polling interval to refresh sessions even when page is visible
    // Reduce the polling frequency to once every two minutes for performance
    const intervalId = setInterval(() => {
      console.log('Periodic session refresh');
      refreshSessions();
    }, 120000); // Refresh every two minutes
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
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
