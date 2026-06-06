import type { Station } from '@/types/pos.types';

const KEY_PREFIX = 'cuephoriaStationAccents:';

export type StationAccentMap = Record<string, string | null>;

function storageKey(locationId: string): string {
  return `${KEY_PREFIX}${locationId}`;
}

export function loadStationAccentMap(locationId: string): StationAccentMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(locationId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: StationAccentMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof id !== 'string') continue;
      out[id] = value === null ? null : String(value);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveStationAccentMap(locationId: string, map: StationAccentMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(locationId), JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export function saveStationAccent(
  locationId: string,
  stationId: string,
  accentColor: string | null
): void {
  const map = loadStationAccentMap(locationId);
  if (accentColor == null) {
    delete map[stationId];
  } else {
    map[stationId] = accentColor;
  }
  saveStationAccentMap(locationId, map);
}

export function saveStationAccentsBulk(
  locationId: string,
  stationIds: string[],
  accentColor: string | null
): void {
  const map = loadStationAccentMap(locationId);
  for (const id of stationIds) {
    if (accentColor == null) delete map[id];
    else map[id] = accentColor;
  }
  saveStationAccentMap(locationId, map);
}

/** DB accent wins when present; otherwise restore from local overlay (pre-migration / offline). */
export function mergeStationAccents(
  stations: Station[],
  locationId: string | null
): Station[] {
  if (!locationId || stations.length === 0) return stations;

  const local = { ...loadStationAccentMap(locationId) };
  let localDirty = false;

  const merged = stations.map((station) => {
    const fromDb = station.accentColor;
    if (fromDb != null && fromDb !== '') {
      if (local[station.id] !== fromDb) {
        local[station.id] = fromDb;
        localDirty = true;
      }
      return station;
    }

    const stored = local[station.id];
    if (stored !== undefined) {
      return { ...station, accentColor: stored || null };
    }
    return station;
  });

  if (localDirty) saveStationAccentMap(locationId, local);
  return merged;
}
