import { supabase } from '@/integrations/supabase/client';

export interface MigrateStationResult {
  migrated_stations: number;
  sessions_updated: number;
  bookings_updated: number;
  new_station_id: string;
}

export async function migrateStationData(
  oldStationIds: string[],
  newStationId: string,
  migratedBy?: string
): Promise<MigrateStationResult> {
  const { data, error } = await supabase.rpc('migrate_station_data', {
    p_old_ids: oldStationIds,
    p_new_station_id: newStationId,
    p_migrated_by: migratedBy ?? null,
  });

  if (error) {
    console.error('migrateStationData:', error);
    throw error;
  }

  return data as MigrateStationResult;
}

export async function fetchMigratedOldStationIds(locationId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('station_id_migrations')
    .select('old_station_id')
    .eq('location_id', locationId);

  if (error) {
    console.error('fetchMigratedOldStationIds:', error);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.old_station_id));
}
