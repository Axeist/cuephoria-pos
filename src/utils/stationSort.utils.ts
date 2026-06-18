import type { Station } from '@/types/pos.types';

export type StationSortMode = 'custom' | 'type' | 'name' | 'type-name';
export type StationOccupancyFilter = 'all' | 'live' | 'open';

const SORT_MODE_KEY = 'cuephoriaStationSortMode';
const ORDER_KEY_PREFIX = 'cuephoriaStationOrder:';

const typeSortWeight = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === 'ps5') return 0;
  if (normalized === '8ball') return 1;
  if (normalized === 'snooker') return 2;
  if (normalized === 'turf') return 3;
  if (normalized === 'vr') return 4;
  return 10;
};

export const byNameNumber = (a: Station, b: Station) => {
  const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
  if (numA !== numB) return numA - numB;
  return a.name.localeCompare(b.name);
};

export function loadStationSortMode(locationId: string | null): StationSortMode {
  if (!locationId || typeof window === 'undefined') return 'custom';
  try {
    const raw = localStorage.getItem(`${SORT_MODE_KEY}:${locationId}`);
    if (raw === 'custom' || raw === 'type' || raw === 'name' || raw === 'type-name') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'custom';
}

export function saveStationSortMode(locationId: string, mode: StationSortMode) {
  try {
    localStorage.setItem(`${SORT_MODE_KEY}:${locationId}`, mode);
  } catch {
    /* ignore */
  }
}

export function loadLocalStationOrder(locationId: string): string[] {
  try {
    const raw = localStorage.getItem(`${ORDER_KEY_PREFIX}${locationId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveLocalStationOrder(locationId: string, orderedIds: string[]) {
  try {
    localStorage.setItem(`${ORDER_KEY_PREFIX}${locationId}`, JSON.stringify(orderedIds));
  } catch {
    /* ignore */
  }
}

function compareByCustomOrder(
  a: Station,
  b: Station,
  orderIndex: Map<string, number>
): number {
  const ia = orderIndex.get(a.id);
  const ib = orderIndex.get(b.id);
  if (ia != null && ib != null && ia !== ib) return ia - ib;
  if (ia != null && ib == null) return -1;
  if (ia == null && ib != null) return 1;
  const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (sortA !== sortB) return sortA - sortB;
  return byNameNumber(a, b);
}

export function sortStations(
  stations: Station[],
  mode: StationSortMode,
  localOrder: string[] = []
): Station[] {
  const list = [...stations];
  const orderIndex = new Map(localOrder.map((id, i) => [id, i]));

  switch (mode) {
    case 'name':
      return list.sort(byNameNumber);
    case 'type':
      return list.sort((a, b) => {
        const tw = typeSortWeight(a.type) - typeSortWeight(b.type);
        if (tw !== 0) return tw;
        return a.type.localeCompare(b.type) || byNameNumber(a, b);
      });
    case 'type-name':
      return list.sort((a, b) => {
        const tw = typeSortWeight(a.type) - typeSortWeight(b.type);
        if (tw !== 0) return tw;
        return byNameNumber(a, b);
      });
    case 'custom':
    default:
      return list.sort((a, b) => compareByCustomOrder(a, b, orderIndex));
  }
}

export function filterByOccupancy(
  stations: Station[],
  filter: StationOccupancyFilter
): Station[] {
  if (filter === 'live') return stations.filter((s) => s.isOccupied);
  if (filter === 'open') return stations.filter((s) => !s.isOccupied);
  return stations;
}

export function reorderStationIds(
  orderedIds: string[],
  sourceId: string,
  targetId: string
): string[] {
  if (sourceId === targetId) return orderedIds;
  const next = orderedIds.filter((id) => id !== sourceId);
  const targetIdx = next.indexOf(targetId);
  if (targetIdx < 0) {
    next.push(sourceId);
    return next;
  }
  next.splice(targetIdx, 0, sourceId);
  return next;
}
