import { useState, useEffect } from 'react';
import { Station, Session } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/utils/pos.utils';
import { getCachedData, saveToCache, isCacheStale, invalidateCache, CACHE_KEYS } from '@/utils/dataCache';

/**
 * Hook to load and manage station data from Supabase
 */
export const useStationsData = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState<boolean>(false);
  const [stationsError, setStationsError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  const refreshStations = async (silent: boolean = false) => {
    // ✅ Check cache first
    const cachedStations = getCachedData<Station[]>(CACHE_KEYS.STATIONS);
    
    if (cachedStations && cachedStations.length > 0 && !silent) {
      console.log('📦 Using cached stations');
      setStations(cachedStations);
      setStationsLoading(false);
      
      // Background refresh if cache is stale
      if (isCacheStale(CACHE_KEYS.STATIONS)) {
        refreshStationsFromDB(true).catch(err => {
          console.error('Error refreshing stations in background:', err);
        });
      }
      return;
    }
    
    await refreshStationsFromDB(silent);
  };
  
  const refreshStationsFromDB = async (silent: boolean = false) => {
    if (!silent) {
      setStationsLoading(true);
      setStationsError(null);
    }
    
    try {
      // ✅ OPTIMIZED: Select only needed columns (including event fields)
      const selectFields = 'id,name,type,hourly_rate,is_occupied,currentsession,created_at,category,event_enabled,slot_duration';
      
      // Fetch all stations using pagination to bypass 1000 record limit
      let page = 0;
      const pageSize = 1000;
      let allStationsData: any[] = [];
      let finished = false;

      while (!finished) {
        const { data, error } = await supabase
          .from('stations')
          .select(selectFields) // ✅ Only fetch needed columns
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
          
        if (error) {
          console.error('Error fetching stations:', error);
          setStationsError(new Error(`Failed to fetch stations: ${error.message}`));
          toast({
            title: 'Database Error',
            description: 'Failed to fetch stations from database',
            variant: 'destructive'
          });
          setStations([]);
          return;
        }
        
        if (data && data.length > 0) {
          allStationsData = [...allStationsData, ...data];
          // If we got less than pageSize, we've reached the end
          if (data.length < pageSize) {
            finished = true;
          } else {
            page++;
          }
        } else {
          finished = true;
        }
      }
      
      // Transform data to match our Station type
      if (allStationsData.length > 0) {
        const data = allStationsData;
        const transformedStations: Station[] = data.map(item => {
          // ✅ Parse currentSession from database
          let currentSession: Session | null = null;
          
          if (item.currentsession) {
            try {
              // Parse if it's a string, or use directly if it's already an object
              const sessionData = typeof item.currentsession === 'string' 
                ? JSON.parse(item.currentsession) 
                : item.currentsession;
              
              console.log('✅ Parsed session data for', item.name, ':', sessionData);
              
              if (sessionData && sessionData.id) {
                currentSession = {
                  id: sessionData.id,
                  stationId: sessionData.stationId || sessionData.station_id || item.id,
                  customerId: sessionData.customerId || sessionData.customer_id,
                  startTime: new Date(sessionData.startTime || sessionData.start_time),
                  endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined,
                  duration: sessionData.duration,
                  hourlyRate: sessionData.hourlyRate,
                  originalRate: sessionData.originalRate,
                  couponCode: sessionData.couponCode,
                  discountAmount: sessionData.discountAmount
                };
                
                console.log('✅ Created currentSession with coupon:', currentSession.couponCode);
              }
            } catch (error) {
              console.error('❌ Error parsing currentSession:', error, item.currentsession);
            }
          }
          
          return {
            id: item.id,
            name: item.name,
            type: item.type as 'ps5' | '8ball' | 'vr',
            hourlyRate: item.hourly_rate,
            isOccupied: item.is_occupied,
            currentSession: currentSession,
            category: item.category || null,
            eventEnabled: item.event_enabled || false,
            slotDuration: item.slot_duration || null
          };
        });
        
        setStations(transformedStations);
        // ✅ Save to cache
        saveToCache(CACHE_KEYS.STATIONS, transformedStations);
        console.log("✅ Loaded stations from Supabase:", transformedStations.length, "stations");
      } else {
        console.log("No stations found in Supabase");
        if (!silent) {
          toast({
            title: 'Info',
            description: 'No stations found in database. Please add stations.',
          });
        }
        setStations([]);
        saveToCache(CACHE_KEYS.STATIONS, []);
      }
    } catch (error) {
      console.error('Error in fetchStations:', error);
      if (!silent) {
        setStationsError(error instanceof Error ? error : new Error('Unknown error fetching stations'));
        toast({
          title: 'Error',
          description: 'Failed to load stations',
          variant: 'destructive'
        });
      }
      setStations([]);
    } finally {
      if (!silent) {
        setStationsLoading(false);
      }
    }
  };
  
  const updateStation = async (stationId: string, name: string, hourlyRate: number) => {
    try {
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.error('Station not found:', stationId);
        toast({
          title: 'Error',
          description: 'Station not found',
          variant: 'destructive'
        });
        return false;
      }
      
      const updateData = {
        name,
        hourly_rate: hourlyRate
      };
      
      const { error } = await supabase
        .from('stations')
        .update(updateData)
        .eq('id', stationId);
        
      if (error) {
        console.error('Error updating station in Supabase:', error);
        toast({
          title: 'Database Error',
          description: 'Failed to update station in database',
          variant: 'destructive'
        });
        return false;
      }
      
      setStations(prev => prev.map(s => 
        s.id === stationId 
          ? { ...s, name, hourlyRate } 
          : s
      ));
      
      toast({
        title: 'Station Updated',
        description: 'The station has been updated successfully',
      });
      
      return true;
    } catch (error) {
      console.error('Error in updateStation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update station',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  const deleteStation = async (stationId: string) => {
    try {
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.error('Station not found:', stationId);
        toast({
          title: 'Error',
          description: 'Station not found',
          variant: 'destructive'
        });
        return false;
      }
      
      if (station.isOccupied) {
        toast({
          title: 'Cannot Delete',
          description: 'Cannot delete an occupied station. End the current session first.',
          variant: 'destructive'
        });
        return false;
      }
      
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId);
      
      if (isValidUUID) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('id')
          .eq('station_id', stationId);
          
        if (sessionsError) {
          console.error('Error checking sessions:', sessionsError);
          toast({
            title: 'Database Error',
            description: 'Failed to check for existing sessions',
            variant: 'destructive'
          });
          return false;
        }
        
        if (sessionsData && sessionsData.length > 0) {
          const sessionIds = sessionsData.map(session => session.id);
          
          const { data: billItemsData, error: billItemsError } = await supabase
            .from('bill_items')
            .select('bill_id')
            .in('item_id', sessionIds)
            .eq('item_type', 'session');
            
          if (billItemsError) {
            console.error('Error checking bill items:', billItemsError);
            toast({
              title: 'Database Error',
              description: 'Failed to check for related transactions',
              variant: 'destructive'
            });
            return false;
          }
          
          if (billItemsData && billItemsData.length > 0) {
            toast({
              title: 'Cannot Delete Station',
              description: `This station has ${sessionsData.length} session(s) with ${billItemsData.length} related transaction(s). Please delete the transactions first.`,
              variant: 'destructive'
            });
            return false;
          }
          
          toast({
            title: 'Sessions Found',
            description: `This station has ${sessionsData.length} session(s) that will be deleted. Please delete sessions manually first.`,
            variant: 'destructive'
          });
          return false;
        }
        
        const { error } = await supabase
          .from('stations')
          .delete()
          .eq('id', stationId);
          
        if (error) {
          console.error('Error deleting station from Supabase:', error);
          toast({
            title: 'Database Error',
            description: `Failed to delete station: ${error.message}`,
            variant: 'destructive'
          });
          return false;
        }
      } else {
        console.log('Skipping Supabase delete for non-UUID station ID:', stationId);
      }
      
      setStations(prev => prev.filter(station => station.id !== stationId));
      
      toast({
        title: 'Station Deleted',
        description: 'The station has been removed successfully',
      });
      
      return true;
    } catch (error) {
      console.error('Error in deleteStation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete station',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  useEffect(() => {
    refreshStations();
  }, []);
  
  return {
    stations,
    setStations,
    stationsLoading,
    stationsError,
    refreshStations,
    deleteStation,
    updateStation
  };
};
