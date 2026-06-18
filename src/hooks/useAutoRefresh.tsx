
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Hook that automatically refreshes data at specified intervals
 * @param intervalMs - Refresh interval in milliseconds (default: 30000 ms = 30 seconds)
 * @param showNotification - Whether to show a notification when refreshing (default: false)
 * @returns Current refresh timestamp
 */
export const useAutoRefresh = (
  intervalMs: number = 30000, 
  showNotification: boolean = false
): Date => {
  const [refreshTimestamp, setRefreshTimestamp] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Function to refresh all data
    const refreshData = () => {
      console.info(`Auto-refreshing data at ${new Date().toLocaleTimeString()}`);
      
      // Invalidate all queries to trigger refetch
      queryClient.invalidateQueries();
      
      // Update timestamp
      setRefreshTimestamp(new Date());
      
      // Show notification if enabled
      if (showNotification) {
        toast.info('Data refreshed', {
          description: 'Application data has been automatically updated',
          duration: 2000,
        });
      }
    };
    
    // Set up interval for periodic refresh
    const intervalId = setInterval(refreshData, intervalMs);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [intervalMs, queryClient, showNotification]);
  
  return refreshTimestamp;
};
