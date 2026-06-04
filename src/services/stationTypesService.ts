import { supabase } from '@/integrations/supabase/client';
import type { StationType } from '@/types/stationType.types';
import { DEFAULT_STATION_TYPES, slugifyStationType } from '@/types/stationType.types';

function mapRow(row: Record<string, unknown>): StationType {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    defaultMaxPlayers: Number(row.default_max_players) || 4,
    defaultSlotMinutes: Number(row.default_slot_minutes) || 60,
    sortOrder: Number(row.sort_order) || 0,
  };
}

export async function fetchStationTypes(locationId: string): Promise<StationType[]> {
  const { data, error } = await supabase
    .from('station_types')
    .select('*')
    .eq('location_id', locationId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('fetchStationTypes:', error);
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function seedDefaultStationTypes(locationId: string): Promise<StationType[]> {
  const rows = DEFAULT_STATION_TYPES.map((t) => ({
    location_id: locationId,
    name: t.name,
    slug: t.slug,
    default_max_players: t.defaultMaxPlayers,
    default_slot_minutes: t.defaultSlotMinutes,
    sort_order: t.sortOrder,
  }));

  const { error } = await supabase
    .from('station_types')
    .upsert(rows, { onConflict: 'location_id,slug', ignoreDuplicates: true });

  if (error) {
    console.error('seedDefaultStationTypes:', error);
    throw error;
  }

  return fetchStationTypes(locationId);
}

export async function createStationType(params: {
  locationId: string;
  name: string;
  defaultMaxPlayers?: number;
  defaultSlotMinutes?: number;
}): Promise<StationType> {
  const slug = slugifyStationType(params.name);
  const payload = {
    location_id: params.locationId,
    name: params.name.trim(),
    slug,
    default_max_players: params.defaultMaxPlayers ?? 4,
    default_slot_minutes: params.defaultSlotMinutes ?? 60,
  };

  const { data, error } = await supabase
    .from('station_types')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('createStationType:', error);
    throw error;
  }

  return mapRow(data as Record<string, unknown>);
}

export async function deleteStationType(id: string): Promise<void> {
  const { error } = await supabase.from('station_types').delete().eq('id', id);
  if (error) throw error;
}
