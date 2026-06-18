import { adminFetch } from '@/services/adminFetch';
import { supabase } from '@/integrations/supabase/client';

export interface MigrateStationResult {
  migrated_stations: number;
  sessions_updated: number;
  bookings_updated: number;
  bookings_cancelled?: number;
  slot_blocks_updated?: number;
  slot_blocks_dropped?: number;
  new_station_id: string;
  migration_version?: number;
}

function migrationErrorMessage(error: { message?: string; details?: string; hint?: string; code?: string }): string {
  if (error.code === '42883' || error.message?.includes('Could not find the function')) {
    return 'Migration function is not installed yet. Run supabase db push (migration 20260805150000).';
  }
  if (error.code === '42501') {
    return 'Permission denied running migration. Apply migration 20260805150000_fix_migrate_station_data_v5.sql.';
  }
  return error.message || error.details || error.hint || 'Could not migrate stations';
}

export async function migrateStationData(
  oldStationIds: string[],
  newStationId: string,
  migratedBy?: string,
  locationId?: string,
): Promise<MigrateStationResult> {
  if (!locationId) {
    throw new Error('Branch (locationId) is required for station migration.');
  }

  const res = await adminFetch('/api/admin/station-migrate', {
    method: 'POST',
    body: JSON.stringify({
      oldStationIds,
      newStationId,
      migratedBy: migratedBy ?? null,
      locationId,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: MigrateStationResult;
    error?: string;
  };
  if (res.ok && json.ok && json.data) {
    return json.data;
  }
  throw new Error(json.error || migrationErrorMessage({ message: `Migration failed (${res.status})` }));
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
