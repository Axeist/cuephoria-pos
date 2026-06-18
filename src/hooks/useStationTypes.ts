import { useCallback, useEffect, useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import type { StationType } from '@/types/stationType.types';
import {
  createStationType,
  deleteStationType,
  fetchStationTypes,
  seedDefaultStationTypes,
  updateStationType,
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
      await seedDefaultStationTypes(activeLocationId);
      const list = await fetchStationTypes(activeLocationId);
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
      setStationTypes((prev) => {
        if (prev.some((t) => t.id === created.id || t.slug === created.slug)) {
          return prev.map((t) => (t.slug === created.slug ? created : t));
        }
        return [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      return created;
    },
    [activeLocationId]
  );

  const removeType = useCallback(async (id: string) => {
    await deleteStationType(id);
    setStationTypes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateType = useCallback(
    async (params: {
      id: string;
      name: string;
      defaultMaxPlayers: number;
      defaultSlotMinutes: number;
    }) => {
      const updated = await updateStationType(params.id, {
        name: params.name,
        defaultMaxPlayers: params.defaultMaxPlayers,
        defaultSlotMinutes: params.defaultSlotMinutes,
      });
      setStationTypes((prev) =>
        prev
          .map((t) => (t.id === updated.id ? updated : t))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
      return updated;
    },
    []
  );

  const getTypeBySlug = useCallback(
    (slug: string) => stationTypes.find((t) => t.slug === slug) ?? null,
    [stationTypes]
  );

  return {
    stationTypes,
    loading,
    refresh,
    addType,
    updateType,
    removeType,
    getTypeBySlug,
  };
}
