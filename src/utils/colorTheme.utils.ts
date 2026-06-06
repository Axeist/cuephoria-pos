import type { CSSProperties } from 'react';

/** Shared color presets and helpers for category + station theming. */

export type StationAccentStyle = {
  accentHex: string;
  cardStyle: CSSProperties;
  meshStyle: CSSProperties;
  topBarIdleStyle: CSSProperties;
  iconBgStyle: CSSProperties;
  startBtnStyle: CSSProperties;
};

const DEFAULT_CATEGORY_HEX: Record<string, string> = {
  food: '#F97316',
  drinks: '#0EA5E9',
  tobacco: '#EF4444',
  challenges: '#22C55E',
  membership: '#7C3AED',
  uncategorized: '#6B7280',
};

const DEFAULT_STATION_TYPE_HEX: Record<string, string> = {
  ps5: '#8B5CF6',
  '8ball': '#10B981',
  snooker: '#D97706',
  turf: '#84CC16',
  vr: '#22D3EE',
  custom: '#A855F7',
};

export const ACCENT_COLOR_PRESETS = [
  '#F97316',
  '#0EA5E9',
  '#EF4444',
  '#22C55E',
  '#7C3AED',
  '#8B5CF6',
  '#10B981',
  '#D97706',
  '#84CC16',
  '#22D3EE',
  '#EC4899',
  '#F59E0B',
  '#6B7280',
] as const;

export function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const raw = input.trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const n = normalized.slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getDefaultCategoryHex(category: string): string {
  const key = category.trim().toLowerCase();
  return DEFAULT_CATEGORY_HEX[key] ?? DEFAULT_CATEGORY_HEX.uncategorized;
}

export function getDefaultStationTypeHex(type: string): string {
  const key = (type || 'custom').trim().toLowerCase();
  return DEFAULT_STATION_TYPE_HEX[key] ?? DEFAULT_STATION_TYPE_HEX.custom;
}

export function resolveCategoryHex(category: string, accentColor?: string | null): string {
  return normalizeHexColor(accentColor) ?? getDefaultCategoryHex(category);
}

export function resolveStationAccentHex(
  type: string,
  accentColor?: string | null
): string {
  return normalizeHexColor(accentColor) ?? getDefaultStationTypeHex(type);
}

export function getCategoryCardStyle(
  category: string,
  accentColor?: string | null
): CSSProperties {
  const hex = resolveCategoryHex(category, accentColor);
  return {
    borderLeftWidth: 4,
    borderLeftColor: hexWithAlpha(hex, 0.7),
    background: `linear-gradient(to right, ${hexWithAlpha(hex, 0.1)}, rgba(255,255,255,0.02))`,
    borderColor: hexWithAlpha(hex, 0.2),
  };
}

export function getCategoryChipStyle(
  category: string,
  accentColor: string | null | undefined,
  active: boolean
): CSSProperties {
  const hex = resolveCategoryHex(category, accentColor);
  if (!active) {
    return {};
  }
  return {
    backgroundColor: hexWithAlpha(hex, 0.18),
    borderColor: hexWithAlpha(hex, 0.35),
    color: hex,
  };
}

export function buildStationAccentStyle(accentHex: string): StationAccentStyle {
  return {
    accentHex,
    cardStyle: {
      borderColor: hexWithAlpha(accentHex, 0.45),
      background: `linear-gradient(to bottom right, ${hexWithAlpha(accentHex, 0.28)}, rgba(0,0,0,0.88) 55%, rgba(0,0,0,0.95))`,
      boxShadow: `0 4px 32px ${hexWithAlpha(accentHex, 0.22)}`,
    },
    meshStyle: {
      background: `radial-gradient(ellipse at top left, ${hexWithAlpha(accentHex, 0.18)}, transparent 55%), radial-gradient(ellipse at bottom right, ${hexWithAlpha(accentHex, 0.08)}, transparent 50%)`,
    },
    topBarIdleStyle: {
      background: `linear-gradient(to right, transparent, ${hexWithAlpha(accentHex, 0.55)}, transparent)`,
    },
    iconBgStyle: {
      backgroundColor: hexWithAlpha(accentHex, 0.22),
      boxShadow: `0 0 12px ${hexWithAlpha(accentHex, 0.35)}`,
    },
    startBtnStyle: {
      background: `linear-gradient(to right, ${accentHex}, ${hexWithAlpha(accentHex, 0.75)})`,
      boxShadow: `0 0 20px ${hexWithAlpha(accentHex, 0.4)}`,
    },
  };
}
