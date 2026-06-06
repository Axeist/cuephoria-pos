import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Station } from '@/types/pos.types';
import { STATION_SELECT_FIELDS, transformStationRow } from '@/utils/stationTransform';
import type { OccupancyRates } from '@/utils/stationPricing';
import { totalRateAtMaxOccupancy } from '@/utils/stationPricing';
import type { DurationTier } from '@/utils/timeBasedPricing.utils';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getCachedData, saveToCache, isCacheStale, invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from '@/utils/dataCache';
import { useLocation } from '@/context/LocationContext';

/**
 * Hook to load and manage station data from Supabase
 */
export const useStationsData = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState<boolean>(false);
  const [stationsError, setStationsError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { activeLocationId, loading: locationsLoading, locationResolved } = useLocation();
  const stationsCacheKey = useMemo(
    () => cacheKeyWithLocation(CACHE_KEYS.STATIONS, activeLocationId),
    [activeLocationId]
  );
  const prevLocationIdRef = useRef<string | null>(null);
  
  const refreshStationsFromDB = useCallback(async (silent: boolean = false) => {
    if (!activeLocationId) {
      setStations([]);
      if (!silent) setStationsLoading(false);
      return;
    }

    if (!silent) {
      setStationsLoading(true);
      setStationsError(null);
    }
    
    try {
      const selectFields = STATION_SELECT_FIELDS;
      
      let page = 0;
      const pageSize = 1000;
      let allStationsData: any[] = [];
      let finished = false;

      while (!finished) {
        const { data, error } = await supabase
          .from('stations')
          .select(selectFields)
          .eq('location_id', activeLocationId)
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
          if (data.length < pageSize) {
            finished = true;
          } else {
            page++;
          }
        } else {
          finished = true;
        }
      }
      
      if (allStationsData.length > 0) {
        const transformedStations: Station[] = allStationsData.map((item) =>
          transformStationRow(item as Record<string, unknown>)
        );
        
        setStations(transformedStations);
        saveToCache(stationsCacheKey, transformedStations);
        console.log("✅ Loaded stations from Supabase:", transformedStations.length, "stations");
      } else {
        console.log("No stations found in Supabase");
        setStations([]);
        saveToCache(stationsCacheKey, []);
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
  }, [activeLocationId, stationsCacheKey, toast]);

  const refreshStations = useCallback(async (silent: boolean = false) => {
    // On explicit (non-silent) refresh, bypass cache for fresh data
    if (!silent) {
      await refreshStationsFromDB(false);
      return;
    }
    
    // Silent refresh: use cache if fresh, otherwise hit DB
    const cachedStations = getCachedData<Station[]>(stationsCacheKey);
    if (cachedStations && cachedStations.length > 0) {
      setStations(cachedStations);
      setStationsLoading(false);
      if (isCacheStale(stationsCacheKey)) {
        refreshStationsFromDB(true).catch(err => {
          console.error('Error refreshing stations in background:', err);
        });
      }
      return;
    }
    
    await refreshStationsFromDB(silent);
  }, [stationsCacheKey, refreshStationsFromDB]);
  
  const updateStation = async (
    stationId: string,
    updates: {
      name: string;
      hourlyRate: number;
      maxPlayers?: number;
      occupancyRates?: OccupancyRates;
      slotDuration?: number | null;
      eventEnabled?: boolean;
      category?: string | null;
      type?: string;
      pricingMode?: 'static' | 'per_player' | 'time_based';
      durationTiers?: DurationTier[];
    }
  ) => {
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

      const maxPlayers = updates.maxPlayers ?? station.maxPlayers;
      const occupancyRates = updates.occupancyRates ?? station.occupancyRates;
      const hourlyRate =
        updates.hourlyRate ??
        totalRateAtMaxOccupancy(maxPlayers, occupancyRates, station.hourlyRate);

      const updateData: Record<string, unknown> = {
        name: updates.name,
        hourly_rate: hourlyRate,
        max_players: maxPlayers,
        occupancy_rates: occupancyRates,
        slot_duration: updates.slotDuration ?? station.slotDuration,
        event_enabled: updates.eventEnabled ?? station.eventEnabled,
        category: updates.category !== undefined ? updates.category : station.category,
      };
      if (updates.type !== undefined) {
        updateData.type = updates.type;
      }
      if (updates.pricingMode !== undefined) {
        updateData.pricing_mode = updates.pricingMode;
      }
      if (updates.durationTiers !== undefined) {
        updateData.duration_tiers = updates.durationTiers;
      }
      
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
          ? {
              ...s,
              name: updates.name,
              hourlyRate: updates.hourlyRate ?? hourlyRate,
              maxPlayers,
              occupancyRates,
              slotDuration: (updateData.slot_duration as number | null | undefined) ?? s.slotDuration,
              eventEnabled: (updateData.event_enabled as boolean | null | undefined) ?? s.eventEnabled,
              category: (updateData.category as string | null | undefined) ?? s.category,
              type: updates.type ?? s.type,
              pricingMode: updates.pricingMode ?? s.pricingMode,
              durationTiers: updates.durationTiers ?? s.durationTiers,
            }
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
          .eq('station_id', stationId)
          .eq('location_id', activeLocationId);
          
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
            .eq('item_type', 'session')
            .eq('location_id', activeLocationId);
            
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
  
  // Cache-first on branch switch: instant paint from local cache, background refresh if stale.
  useEffect(() => {
    if (locationsLoading || !locationResolved) {
      if (!locationsLoading && locationResolved && !activeLocationId) {
        setStations([]);
        setStationsLoading(false);
      }
      return;
    }

    if (!activeLocationId) {
      setStations([]);
      setStationsLoading(false);
      return;
    }

    const locationChanged = prevLocationIdRef.current !== activeLocationId;
    prevLocationIdRef.current = activeLocationId;
    if (locationChanged) {
      setStations([]);
    }

    const cachedStations = getCachedData<Station[]>(stationsCacheKey);
    if (cachedStations !== null && cachedStations.length > 0) {
      setStations(cachedStations);
      setStationsLoading(false);
      if (isCacheStale(stationsCacheKey)) {
        refreshStationsFromDB(true).catch(err => {
          console.error('Error refreshing stations in background:', err);
        });
      }
      return;
    }

    if (cachedStations !== null && cachedStations.length === 0) {
      invalidateCache(stationsCacheKey);
    }

    void refreshStationsFromDB(false);
  }, [
    activeLocationId,
    locationsLoading,
    locationResolved,
    stationsCacheKey,
    refreshStationsFromDB,
  ]);

  // ── REALTIME: listen to any stations row change and refresh immediately ──
  useEffect(() => {
    if (!activeLocationId) return;

    let refreshTimeout: NodeJS.Timeout | null = null;

    const channel: RealtimeChannel = supabase
      .channel(`stations-changes-${activeLocationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stations',
          filter: `location_id=eq.${activeLocationId}`,
        },
        (payload) => {
          console.log('📡 Station change detected via Realtime:', payload.eventType);
          // Debounce so rapid consecutive writes (start → verify) collapse into one refresh
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => {
            console.log('🔄 Refreshing stations after Realtime change');
            // Bypass cache — realtime means DB already has the new state
            invalidateCache(stationsCacheKey);
            refreshStationsFromDB(true);
          }, 300);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to stations Realtime channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to stations Realtime channel');
        }
      });

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [activeLocationId, stationsCacheKey, refreshStationsFromDB]);
  
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
