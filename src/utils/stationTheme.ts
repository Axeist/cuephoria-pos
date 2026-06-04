import type { LucideIcon } from 'lucide-react';
import {
  Gamepad2,
  Headset,
  CircleDot,
  Target,
  Trees,
  Joystick,
} from 'lucide-react';
import type { Station } from '@/types/pos.types';
import { getRateSuffix } from '@/utils/stationPricing';
import { isPerPlayerPricing } from '@/utils/stationPricing';
import { stationTypeLabel } from '@/utils/stationTypeUtils';

export interface StationTheme {
  icon: LucideIcon;
  label: string;
  accent: string;
  accentMuted: string;
  border: string;
  bg: string;
  glow: string;
  badgeAvailable: string;
  badgeOccupied: string;
  iconBg: string;
}

const THEMES: Record<string, Omit<StationTheme, 'label'>> = {
  ps5: {
    icon: Gamepad2,
    accent: 'text-violet-300',
    accentMuted: 'text-violet-400/70',
    border: 'border-violet-500/40',
    bg: 'bg-gradient-to-br from-violet-950/80 via-purple-950/60 to-black/90',
    glow: 'shadow-[0_0_24px_rgba(139,92,246,0.15)]',
    badgeAvailable: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
    badgeOccupied: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
    iconBg: 'bg-violet-500/20 ring-violet-400/30',
  },
  '8ball': {
    icon: CircleDot,
    accent: 'text-emerald-300',
    accentMuted: 'text-emerald-400/70',
    border: 'border-emerald-500/40',
    bg: 'bg-gradient-to-br from-emerald-950/80 via-green-950/50 to-black/90',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.12)]',
    badgeAvailable: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    badgeOccupied: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    iconBg: 'bg-emerald-500/20 ring-emerald-400/30',
  },
  snooker: {
    icon: Target,
    accent: 'text-amber-200',
    accentMuted: 'text-amber-400/70',
    border: 'border-amber-600/40',
    bg: 'bg-gradient-to-br from-amber-950/70 via-stone-950/60 to-black/90',
    glow: 'shadow-[0_0_24px_rgba(217,119,6,0.12)]',
    badgeAvailable: 'bg-amber-600/20 text-amber-100 border-amber-500/30',
    badgeOccupied: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
    iconBg: 'bg-amber-600/20 ring-amber-500/30',
  },
  turf: {
    icon: Trees,
    accent: 'text-lime-300',
    accentMuted: 'text-lime-400/70',
    border: 'border-lime-500/40',
    bg: 'bg-gradient-to-br from-lime-950/60 via-green-950/50 to-black/90',
    glow: 'shadow-[0_0_24px_rgba(132,204,22,0.12)]',
    badgeAvailable: 'bg-lime-500/20 text-lime-100 border-lime-400/30',
    badgeOccupied: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
    iconBg: 'bg-lime-500/20 ring-lime-400/30',
  },
  vr: {
    icon: Headset,
    accent: 'text-cyan-300',
    accentMuted: 'text-cyan-400/70',
    border: 'border-cyan-500/40',
    bg: 'bg-gradient-to-br from-cyan-950/70 via-blue-950/60 to-purple-950/40',
    glow: 'shadow-[0_0_28px_rgba(34,211,238,0.18)]',
    badgeAvailable: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/30',
    badgeOccupied: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40',
    iconBg: 'bg-cyan-500/20 ring-cyan-400/30',
  },
};

const DEFAULT_THEME: Omit<StationTheme, 'label'> = {
  icon: Joystick,
  accent: 'text-cuephoria-lightpurple',
  accentMuted: 'text-muted-foreground',
  border: 'border-cuephoria-purple/35',
  bg: 'bg-gradient-to-br from-cuephoria-purple/15 via-black/80 to-black/90',
  glow: 'shadow-[0_0_20px_rgba(168,85,247,0.12)]',
  badgeAvailable: 'bg-cuephoria-purple/20 text-cuephoria-lightpurple border-cuephoria-purple/30',
  badgeOccupied: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
  iconBg: 'bg-cuephoria-purple/20 ring-cuephoria-purple/30',
};

export function getStationTheme(station: Pick<Station, 'type'>, typeLabel?: string): StationTheme {
  const slug = (station.type || 'custom').toLowerCase();
  const base = THEMES[slug] ?? DEFAULT_THEME;
  return {
    ...base,
    label: typeLabel ?? stationTypeLabel(slug),
  };
}

export function stationPricingBadge(station: Station): string {
  const suffix = getRateSuffix(station);
  const mode = isPerPlayerPricing(station) ? 'Per player' : 'Flat rate';
  const players =
    isPerPlayerPricing(station) && (station.maxPlayers ?? 1) > 1
      ? ` · up to ${station.maxPlayers}p`
      : '';
  return `₹${station.hourlyRate}${suffix} · ${mode}${players}`;
}
