import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/LocationContext';
import type { Station } from '@/types/pos.types';
import { isMissingColumnError, parseMissingColumnName } from '@/utils/supabaseColumn.utils';
import { isMaintenanceExpired } from '@/utils/stationMaintenance.utils';

type MaintenanceHookProps = {
  stations: Station[];
  setStations: React.Dispatch<React.SetStateAction<Station[]>>;
};

function applyMaintenancePatch(
  station: Station,
  patch: {
    maintenanceMode: boolean;
    maintenanceStartedAt?: Date | null;
    maintenancePlannedEndAt?: Date | null;
    maintenanceStartedBy?: string | null;
  }
): Station {
  return {
    ...station,
    maintenanceMode: patch.maintenanceMode,
    maintenanceStartedAt: patch.maintenanceStartedAt ?? null,
    maintenancePlannedEndAt: patch.maintenancePlannedEndAt ?? null,
    maintenanceStartedBy: patch.maintenanceStartedBy ?? null,
  };
}

export function useStationMaintenance({ stations, setStations }: MaintenanceHookProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const endingRef = useRef<Set<string>>(new Set());

  const endMaintenance = useCallback(
    async (stationId: string, options?: { silent?: boolean }) => {
      if (endingRef.current.has(stationId)) return;
      endingRef.current.add(stationId);

      const station = stations.find((s) => s.id === stationId);
      if (!station?.maintenanceMode) {
        endingRef.current.delete(stationId);
        return;
      }

      try {
        const nowIso = new Date().toISOString();

        await supabase
          .from('station_maintenance_periods')
          .update({ ended_at: nowIso })
          .eq('station_id', stationId)
          .is('ended_at', null);

        const stationUpdate: Record<string, unknown> = {
          maintenance_mode: false,
          maintenance_started_at: null,
          maintenance_planned_end_at: null,
          maintenance_started_by: null,
        };

        let { error } = await supabase.from('stations').update(stationUpdate).eq('id', stationId);

        for (let attempt = 0; attempt < 5 && error && isMissingColumnError(error); attempt++) {
          const missingCol = parseMissingColumnName(error);
          if (!missingCol || !(missingCol in stationUpdate)) break;
          delete stationUpdate[missingCol];
          ({ error } = await supabase.from('stations').update(stationUpdate).eq('id', stationId));
        }

        if (error) throw error;

        setStations((prev) =>
          prev.map((s) =>
            s.id === stationId
              ? applyMaintenancePatch(s, {
                  maintenanceMode: false,
                  maintenanceStartedAt: null,
                  maintenancePlannedEndAt: null,
                  maintenanceStartedBy: null,
                })
              : s
          )
        );

        if (!options?.silent) {
          toast({
            title: 'Maintenance ended',
            description: `${station.name} is open again for sessions and public booking.`,
          });
        }
      } catch (error) {
        console.error('Failed to end maintenance:', error);
        if (!options?.silent) {
          toast({
            title: 'Error',
            description: 'Could not end maintenance mode.',
            variant: 'destructive',
          });
        }
      } finally {
        endingRef.current.delete(stationId);
      }
    },
    [stations, setStations, toast]
  );

  const startMaintenance = useCallback(
    async (stationId: string, durationMinutes: number, startedByName: string) => {
      const station = stations.find((s) => s.id === stationId);
      if (!station) {
        toast({ title: 'Error', description: 'Station not found.', variant: 'destructive' });
        return false;
      }
      if (station.isOccupied || station.currentSession) {
        toast({
          title: 'Station in use',
          description: 'End the active session before starting maintenance.',
          variant: 'destructive',
        });
        return false;
      }
      if (station.maintenanceMode) {
        toast({
          title: 'Already in maintenance',
          description: 'End the current maintenance window first.',
          variant: 'destructive',
        });
        return false;
      }
      if (!activeLocationId) {
        toast({ title: 'Branch required', description: 'Select a branch first.', variant: 'destructive' });
        return false;
      }

      const trimmedName = startedByName.trim();
      if (!trimmedName) {
        toast({ title: 'Name required', description: 'Enter who started maintenance.', variant: 'destructive' });
        return false;
      }

      const startedAt = new Date();
      const plannedEndAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

      try {
        const { data: period, error: periodError } = await supabase
          .from('station_maintenance_periods')
          .insert({
            station_id: stationId,
            location_id: activeLocationId,
            started_at: startedAt.toISOString(),
            planned_end_at: plannedEndAt.toISOString(),
            started_by_name: trimmedName,
          })
          .select('id')
          .single();

        if (periodError) throw periodError;

        const stationUpdate: Record<string, unknown> = {
          maintenance_mode: true,
          maintenance_started_at: startedAt.toISOString(),
          maintenance_planned_end_at: plannedEndAt.toISOString(),
          maintenance_started_by: trimmedName,
        };

        let { error: stationError } = await supabase
          .from('stations')
          .update(stationUpdate)
          .eq('id', stationId);

        for (let attempt = 0; attempt < 5 && stationError && isMissingColumnError(stationError); attempt++) {
          const missingCol = parseMissingColumnName(stationError);
          if (!missingCol || !(missingCol in stationUpdate)) break;
          delete stationUpdate[missingCol];
          ({ error: stationError } = await supabase.from('stations').update(stationUpdate).eq('id', stationId));
        }

        if (stationError) throw stationError;

        setStations((prev) =>
          prev.map((s) =>
            s.id === stationId
              ? applyMaintenancePatch(s, {
                  maintenanceMode: true,
                  maintenanceStartedAt: startedAt,
                  maintenancePlannedEndAt: plannedEndAt,
                  maintenanceStartedBy: trimmedName,
                })
              : s
          )
        );

        toast({
          title: 'Maintenance started',
          description: `${station.name} closed for ${durationMinutes} min · hidden from public booking`,
        });

        void period;
        return true;
      } catch (error) {
        console.error('Failed to start maintenance:', error);
        toast({
          title: 'Error',
          description: 'Could not start maintenance. Run the latest Supabase migration if this persists.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [stations, setStations, toast, activeLocationId]
  );

  useEffect(() => {
    const expired = stations.filter((s) => isMaintenanceExpired(s));
    if (expired.length === 0) return;

    for (const station of expired) {
      void endMaintenance(station.id, { silent: true });
    }
  }, [stations, endMaintenance]);

  return { startMaintenance, endMaintenance };
}
