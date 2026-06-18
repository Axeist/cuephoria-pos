export interface StationType {
  id: string;
  name: string;
  slug: string;
  defaultMaxPlayers: number;
  defaultSlotMinutes: number;
  sortOrder: number;
}

export const DEFAULT_STATION_TYPES: Omit<StationType, 'id'>[] = [
  {
    name: 'PS5',
    slug: 'ps5',
    defaultMaxPlayers: 4,
    defaultSlotMinutes: 60,
    sortOrder: 0,
  },
  {
    name: '8 Ball',
    slug: '8ball',
    defaultMaxPlayers: 4,
    defaultSlotMinutes: 60,
    sortOrder: 1,
  },
  {
    name: 'Snooker',
    slug: 'snooker',
    defaultMaxPlayers: 4,
    defaultSlotMinutes: 60,
    sortOrder: 2,
  },
  {
    name: 'Turf',
    slug: 'turf',
    defaultMaxPlayers: 10,
    defaultSlotMinutes: 60,
    sortOrder: 3,
  },
  {
    name: 'VR',
    slug: 'vr',
    defaultMaxPlayers: 1,
    defaultSlotMinutes: 15,
    sortOrder: 4,
  },
];

export function slugifyStationType(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'custom';
}
