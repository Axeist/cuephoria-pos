import type { StationType } from '@/types/stationType.types';

const TYPE_LABELS: Record<string, string> = {
  ps5: 'PS5',
  '8ball': '8 Ball',
  snooker: 'Snooker',
  turf: 'Turf',
  vr: 'VR',
  sim_racing: 'Sim Racing',
};

export function stationTypeLabel(slug: string, types?: StationType[]): string {
  const fromList = types?.find((t) => t.slug === slug);
  if (fromList) return fromList.name;
  if (TYPE_LABELS[slug]) return TYPE_LABELS[slug];
  return slug.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function defaultMaxPlayersForSlug(slug: string, types?: StationType[]): number {
  const fromList = types?.find((t) => t.slug === slug);
  if (fromList) return fromList.defaultMaxPlayers;
  if (slug === 'ps5') return 4;
  if (slug === 'turf') return 10;
  if (slug === 'vr') return 1;
  if (slug === '8ball' || slug === 'snooker') return 4;
  return 4;
}

export function defaultSlotMinutesForSlug(slug: string, types?: StationType[]): number {
  const fromList = types?.find((t) => t.slug === slug);
  if (fromList) return fromList.defaultSlotMinutes;
  if (slug === 'vr') return 15;
  return 60;
}

/** Table games billed hourly (8 ball, snooker, etc.) */
export function isTableGameType(slug: string): boolean {
  return slug === '8ball' || slug === 'snooker';
}

export function defaultPricingModeForSlug(slug: string): 'static' | 'per_player' {
  return slug === 'ps5' ? 'per_player' : 'static';
}
