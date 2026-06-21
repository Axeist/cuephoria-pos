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
import { getRateSuffix, isPerPlayerPricing } from '@/utils/stationPricing';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import type { CSSProperties } from 'react';
import {
  buildStationAccentStyle,
  hasCustomAccent,
  resolveStationAccentHex,
  type StationAccentStyle,
  type StationTextPalette,
} from '@/utils/colorTheme.utils';

export type StationPhase = 'idle' | 'starting' | 'live' | 'ending';

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
  /** Gradient mesh overlay on card */
  mesh: string;
  /** Top accent bar gradient */
  topBarIdle: string;
  topBarLive: string;
  /** Start session button */
  startBtn: string;
  /** Live session outer ring color */
  liveRing: string;
  /** Decorative scan line (VR etc.) */
  showScanLine: boolean;
  /** Resolved accent hex (type default or station override). */
  accentHex: string;
  /** Inline tint styles when station has a custom accent_color set. */
  accentStyle?: StationAccentStyle;
  /** Harmonized text colors when a custom tint is active. */
  textPalette?: StationTextPalette;
}

export type ThemeTextProps = { className: string; style?: CSSProperties };

export function themeText(
  theme: StationTheme,
  role: 'primary' | 'muted' | 'soft',
  extraClass = ''
): ThemeTextProps {
  if (theme.textPalette) {
    const color =
      role === 'primary'
        ? theme.textPalette.primary
        : role === 'muted'
          ? theme.textPalette.muted
          : theme.textPalette.soft;
    return { className: extraClass, style: { color } };
  }
  const fallback =
    role === 'muted' ? theme.accentMuted : theme.accent;
  return { className: `${extraClass} ${fallback}`.trim() };
}

export function themeStatText(
  theme: StationTheme,
  stat: 'players' | 'slot' | 'rate' | 'rateSuffix',
  extraClass = ''
): ThemeTextProps {
  if (!theme.textPalette) {
    const defaults = {
      players: 'text-violet-400',
      slot: 'text-cyan-400',
      rate: 'text-emerald-200',
      rateSuffix: 'text-emerald-300/90',
    };
    return { className: `${extraClass} ${defaults[stat]}`.trim() };
  }
  const colors = {
    players: theme.textPalette.statPlayers,
    slot: theme.textPalette.statSlot,
    rate: theme.textPalette.statRate,
    rateSuffix: theme.textPalette.statRateSuffix,
  };
  return { className: extraClass, style: { color: colors[stat] } };
}

export function themeIconBgProps(theme: StationTheme): ThemeTextProps {
  if (theme.accentStyle) {
    return { className: 'ring-1 ring-white/10', style: theme.accentStyle.iconBgStyle };
  }
  return { className: theme.iconBg };
}

const THEMES: Record<string, Omit<StationTheme, 'label'>> = {
  ps5: {
    icon: Gamepad2,
    accent: 'text-violet-300',
    accentMuted: 'text-violet-400/70',
    border: 'border-violet-500/45',
    bg: 'bg-gradient-to-br from-violet-950/90 via-purple-950/70 to-[#0d0818]',
    glow: 'shadow-[0_4px_32px_rgba(139,92,246,0.22)]',
    badgeAvailable: 'bg-violet-500/25 text-violet-100 border-violet-400/40',
    badgeOccupied: 'bg-orange-500/25 text-orange-100 border-orange-400/50 animate-pulse-soft',
    iconBg: 'bg-violet-500/25 ring-1 ring-violet-400/40 shadow-[0_0_12px_rgba(139,92,246,0.35)]',
    mesh: 'bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]',
    topBarIdle: 'bg-gradient-to-r from-transparent via-violet-500/60 to-transparent',
    topBarLive: 'bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500 bg-[length:200%_100%] animate-station-bar-shimmer',
    startBtn: 'bg-gradient-to-r from-violet-600 via-cuephoria-purple to-violet-500 hover:from-violet-500 hover:to-cuephoria-lightpurple shadow-[0_0_20px_rgba(139,92,246,0.45)]',
    liveRing: 'ring-orange-500/40 shadow-[0_0_28px_rgba(249,115,22,0.25)]',
    showScanLine: false,
  },
  '8ball': {
    icon: CircleDot,
    accent: 'text-emerald-300',
    accentMuted: 'text-emerald-400/70',
    border: 'border-emerald-500/45',
    bg: 'bg-gradient-to-br from-emerald-950/90 via-green-950/60 to-[#041008]',
    glow: 'shadow-[0_4px_28px_rgba(16,185,129,0.18)]',
    badgeAvailable: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/40',
    badgeOccupied: 'bg-amber-500/25 text-amber-100 border-amber-400/50 animate-pulse-soft',
    iconBg: 'bg-emerald-600/25 ring-1 ring-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    mesh: 'bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(5,150,105,0.1),transparent_40%)]',
    topBarIdle: 'bg-gradient-to-r from-transparent via-emerald-500/55 to-transparent',
    topBarLive: 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 bg-[length:200%_100%] animate-station-bar-shimmer',
    startBtn: 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-600 hover:from-emerald-600 hover:to-green-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]',
    liveRing: 'ring-amber-500/35 shadow-[0_0_24px_rgba(245,158,11,0.2)]',
    showScanLine: false,
  },
  snooker: {
    icon: Target,
    accent: 'text-amber-200',
    accentMuted: 'text-amber-400/70',
    border: 'border-amber-600/45',
    bg: 'bg-gradient-to-br from-amber-950/85 via-stone-950/70 to-[#0c0a06]',
    glow: 'shadow-[0_4px_28px_rgba(217,119,6,0.16)]',
    badgeAvailable: 'bg-amber-600/25 text-amber-100 border-amber-500/40',
    badgeOccupied: 'bg-orange-500/25 text-orange-100 border-orange-400/50 animate-pulse-soft',
    iconBg: 'bg-amber-700/25 ring-1 ring-amber-500/40 shadow-[0_0_10px_rgba(217,119,6,0.25)]',
    mesh: 'bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.12),transparent_60%)]',
    topBarIdle: 'bg-gradient-to-r from-transparent via-amber-600/50 to-transparent',
    topBarLive: 'bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600 bg-[length:200%_100%] animate-station-bar-shimmer',
    startBtn: 'bg-gradient-to-r from-amber-700 via-amber-600 to-orange-700 hover:from-amber-600 hover:to-orange-600 shadow-[0_0_18px_rgba(217,119,6,0.3)]',
    liveRing: 'ring-orange-500/35 shadow-[0_0_24px_rgba(249,115,22,0.2)]',
    showScanLine: false,
  },
  turf: {
    icon: Trees,
    accent: 'text-lime-300',
    accentMuted: 'text-lime-400/70',
    border: 'border-lime-500/45',
    bg: 'bg-gradient-to-br from-lime-950/75 via-green-950/65 to-[#060d04]',
    glow: 'shadow-[0_4px_28px_rgba(132,204,22,0.16)]',
    badgeAvailable: 'bg-lime-500/25 text-lime-100 border-lime-400/40',
    badgeOccupied: 'bg-orange-500/25 text-orange-100 border-orange-400/50 animate-pulse-soft',
    iconBg: 'bg-lime-600/25 ring-1 ring-lime-400/40 shadow-[0_0_10px_rgba(132,204,22,0.25)]',
    mesh: 'bg-[radial-gradient(ellipse_at_bottom,rgba(132,204,22,0.14),transparent_55%)]',
    topBarIdle: 'bg-gradient-to-r from-transparent via-lime-500/50 to-transparent',
    topBarLive: 'bg-gradient-to-r from-lime-600 via-green-400 to-lime-500 bg-[length:200%_100%] animate-station-bar-shimmer',
    startBtn: 'bg-gradient-to-r from-lime-700 via-green-600 to-lime-600 hover:from-lime-600 hover:to-green-500 shadow-[0_0_18px_rgba(132,204,22,0.3)]',
    liveRing: 'ring-lime-400/30 shadow-[0_0_24px_rgba(132,204,22,0.18)]',
    showScanLine: false,
  },
  vr: {
    icon: Headset,
    accent: 'text-cyan-300',
    accentMuted: 'text-cyan-400/70',
    border: 'border-cyan-500/50',
    bg: 'bg-gradient-to-br from-cyan-950/80 via-blue-950/65 to-purple-950/50',
    glow: 'shadow-[0_4px_36px_rgba(34,211,238,0.22)]',
    badgeAvailable: 'bg-cyan-500/25 text-cyan-100 border-cyan-400/45',
    badgeOccupied: 'bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-400/50 animate-pulse-soft',
    iconBg: 'bg-cyan-500/25 ring-1 ring-cyan-400/45 shadow-[0_0_14px_rgba(34,211,238,0.4)]',
    mesh: 'bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.15),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.1),transparent_45%)]',
    topBarIdle: 'bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40',
    topBarLive: 'bg-gradient-to-r from-cyan-500 via-fuchsia-400 to-cyan-400 bg-[length:200%_100%] animate-station-bar-shimmer',
    startBtn: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-[0_0_22px_rgba(34,211,238,0.4)]',
    liveRing: 'ring-cyan-400/40 shadow-[0_0_32px_rgba(34,211,238,0.28)]',
    showScanLine: true,
  },
};

const DEFAULT_THEME: Omit<StationTheme, 'label'> = {
  icon: Joystick,
  accent: 'text-cuephoria-lightpurple',
  accentMuted: 'text-muted-foreground',
  border: 'border-cuephoria-purple/40',
  bg: 'bg-gradient-to-br from-cuephoria-purple/20 via-black/85 to-black/95',
  glow: 'shadow-[0_4px_24px_rgba(168,85,247,0.15)]',
  badgeAvailable: 'bg-cuephoria-purple/25 text-cuephoria-lightpurple border-cuephoria-purple/40',
  badgeOccupied: 'bg-orange-500/25 text-orange-100 border-orange-400/50 animate-pulse-soft',
  iconBg: 'bg-cuephoria-purple/25 ring-1 ring-cuephoria-lightpurple/35 shadow-[0_0_12px_rgba(155,135,245,0.3)]',
  mesh: 'bg-[radial-gradient(ellipse_at_top,rgba(155,135,245,0.12),transparent_55%)]',
  topBarIdle: 'bg-gradient-to-r from-transparent via-cuephoria-lightpurple/50 to-transparent',
  topBarLive: 'bg-gradient-to-r from-cuephoria-orange via-amber-400 to-cuephoria-orange bg-[length:200%_100%] animate-station-bar-shimmer',
  startBtn: 'bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-95 shadow-[0_0_20px_rgba(155,135,245,0.4)]',
  liveRing: 'ring-cuephoria-orange/35 shadow-[0_0_24px_rgba(249,115,22,0.2)]',
  showScanLine: false,
};

export function getStationTheme(
  station: Pick<Station, 'type' | 'accentColor'>,
  typeLabel?: string
): StationTheme {
  const slug = (station.type || 'custom').toLowerCase();
  const base = THEMES[slug] ?? DEFAULT_THEME;
  const accentHex = resolveStationAccentHex(slug, station.accentColor);
  const hasCustomTint = hasCustomAccent(station.accentColor);
  const accentStyle = hasCustomTint ? buildStationAccentStyle(station.accentColor!) : undefined;
  return {
    ...base,
    label: typeLabel ?? stationTypeLabel(slug),
    accentHex,
    accentStyle,
    textPalette: accentStyle?.textPalette,
  };
}

export function stationPricingBadge(station: Station): string {
  const mode = isPerPlayerPricing(station) ? 'Per player' : 'Flat rate';
  const players =
    isPerPlayerPricing(station) && (station.maxPlayers ?? 1) > 1
      ? ` · up to ${station.maxPlayers}p`
      : '';

  // For slot-duration stations show both the slot price and the hourly price
  if (station.slotDuration && station.slotDuration < 60 && station.slotDuration > 0) {
    const slotMins = station.slotDuration;
    const slotPrice = Math.ceil(station.hourlyRate * slotMins / 60);
    return `₹${slotPrice}/${slotMins}m · ₹${station.hourlyRate}/hr · ${mode}${players}`;
  }

  const suffix = getRateSuffix(station);
  return `₹${station.hourlyRate}${suffix} · ${mode}${players}`;
}

export function cardPhaseClass(phase: StationPhase, isOccupied: boolean): string {
  if (phase === 'starting') return 'animate-station-boot';
  if (phase === 'ending') return 'animate-station-shutdown';
  if (phase === 'live' || isOccupied) return '';
  return 'hover:scale-[1.02] hover:shadow-lg transition-all duration-300';
}

export function cardRingClass(phase: StationPhase, isOccupied: boolean, liveRing: string): string {
  if (phase === 'starting') return 'ring-2 ring-orange-400/60';
  if (phase === 'ending') return 'ring-2 ring-emerald-400/45';
  if (phase === 'live' || isOccupied) return `ring-2 ${liveRing}`;
  return '';
}
