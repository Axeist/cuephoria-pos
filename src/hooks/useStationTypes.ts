import { useCallback, useEffect, useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import type { StationType } from '@/types/stationType.types';
import {
  createStationType,
  deleteStationType,
  fetchStationTypes,
  seedDefaultStationTypes,
} from '@/services/stationTypesService';

export function useStationTypes() {
  const { activeLocationId } = useLocation();
  const [stationTypes, setStationTypes] = useState<StationType[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeLocationId) {
      setStationTypes([]);
      return;
    }

    setLoading(true);
    try {
      let list = await fetchStationTypes(activeLocationId);
      if (list.length === 0) {
        list = await seedDefaultStationTypes(activeLocationId);
      }
      setStationTypes(list);
    } catch (error) {
      console.error('useStationTypes refresh failed:', error);
      setStationTypes([]);
    } finally {
      setLoading(false);
    }
  }, [activeLocationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addType = useCallback(
    async (params: { name: string; defaultMaxPlayers?: number; defaultSlotMinutes?: number }) => {
      if (!activeLocationId) throw new Error('No branch selected');
      const created = await createStationType({ locationId: activeLocationId, ...params });
      setStationTypes((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      return created;
    },
    [activeLocationId]
  );

  const removeType = useCallback(async (id: string) => {
    await deleteStationType(id);
    setStationTypes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTypeBySlug = useCallback(
    (slug: string) => stationTypes.find((t) => t.slug === slug) ?? null,
    [stationTypes]
  );

  return {
    stationTypes,
    loading,
    refresh,
    addType,
    removeType,
    getTypeBySlug,
  };
}
