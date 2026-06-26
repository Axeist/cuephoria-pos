import type { CSSProperties } from 'react';

/** Shared color presets and helpers for category + station theming. */

export type StationTextPalette = {
  primary: string;
  muted: string;
  soft: string;
  statPlayers: string;
  statSlot: string;
  statRate: string;
  statRateSuffix: string;
  border: string;
  badgeOpen: CSSProperties;
  rateBadge: CSSProperties;
};

export type StationAccentStyle = {
  accentHex: string;
  cardStyle: CSSProperties;
  meshStyle: CSSProperties;
  topBarIdleStyle: CSSProperties;
  iconBgStyle: CSSProperties;
  startBtnStyle: CSSProperties;
  textPalette: StationTextPalette;
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
  sim_racing: '#F97316',
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

/** Gradient presets: [from, to, angle] */
export const ACCENT_GRADIENT_PRESETS: ReadonlyArray<{
  id: string;
  from: string;
  to: string;
  angle: number;
}> = [
  { id: 'violet-pink', from: '#8B5CF6', to: '#EC4899', angle: 135 },
  { id: 'cyan-blue', from: '#22D3EE', to: '#3B82F6', angle: 135 },
  { id: 'emerald-teal', from: '#10B981', to: '#14B8A6', angle: 120 },
  { id: 'orange-red', from: '#F97316', to: '#EF4444', angle: 135 },
  { id: 'amber-orange', from: '#F59E0B', to: '#F97316', angle: 145 },
  { id: 'purple-indigo', from: '#A855F7', to: '#6366F1', angle: 135 },
  { id: 'rose-fuchsia', from: '#F43F5E', to: '#D946EF', angle: 120 },
  { id: 'lime-green', from: '#84CC16', to: '#22C55E', angle: 135 },
  { id: 'sky-cyan', from: '#0EA5E9', to: '#06B6D4', angle: 135 },
  { id: 'slate-violet', from: '#64748B', to: '#8B5CF6', angle: 135 },
  { id: 'gold-amber', from: '#EAB308', to: '#D97706', angle: 135 },
  { id: 'midnight-blue', from: '#1E3A8A', to: '#7C3AED', angle: 145 },
];

export type ParsedAccentColor =
  | { kind: 'none' }
  | { kind: 'solid'; hex: string }
  | { kind: 'gradient'; from: string; to: string; angle: number };

const GRADIENT_PREFIX = 'gradient:';

export function encodeGradientAccent(from: string, to: string, angle = 135): string | null {
  const f = normalizeHexColor(from);
  const t = normalizeHexColor(to);
  if (!f || !t) return null;
  return `${GRADIENT_PREFIX}${f.slice(1)}:${t.slice(1)}:${angle}`;
}

export function parseAccentColor(input: string | null | undefined): ParsedAccentColor {
  if (!input?.trim()) return { kind: 'none' };
  const raw = input.trim();
  if (raw.startsWith(GRADIENT_PREFIX)) {
    const parts = raw.slice(GRADIENT_PREFIX.length).split(':');
    const from = normalizeHexColor(parts[0] ? `#${parts[0]}` : null);
    const to = normalizeHexColor(parts[1] ? `#${parts[1]}` : null);
    const angle = Number(parts[2]) || 135;
    if (from && to) return { kind: 'gradient', from, to, angle };
    return { kind: 'none' };
  }
  const hex = normalizeHexColor(raw);
  if (hex) return { kind: 'solid', hex };
  return { kind: 'none' };
}

export function accentColorLabel(input: string | null | undefined, defaultHex: string): string {
  const parsed = parseAccentColor(input);
  if (parsed.kind === 'none') return `Using default tint (${defaultHex})`;
  if (parsed.kind === 'solid') return `Custom tint ${parsed.hex}`;
  return `Gradient ${parsed.from} → ${parsed.to}`;
}

export function accentPrimaryHex(input: string | null | undefined, defaultHex: string): string {
  const parsed = parseAccentColor(input);
  if (parsed.kind === 'solid') return parsed.hex;
  if (parsed.kind === 'gradient') return parsed.from;
  return defaultHex;
}

export function hasCustomAccent(input: string | null | undefined): boolean {
  return parseAccentColor(input).kind !== 'none';
}

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

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function mixWithWhite(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    rgb.r + (255 - rgb.r) * t,
    rgb.g + (255 - rgb.g) * t,
    rgb.b + (255 - rgb.b) * t
  );
}

function shiftHue(hex: string, degrees: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  const newH = (((h * 360 + degrees) % 360) + 360) % 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  if (s === 0) return rgbToHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hr = hue2rgb(p, q, newH / 360 + 1 / 3);
  const hg = hue2rgb(p, q, newH / 360);
  const hb = hue2rgb(p, q, newH / 360 - 1 / 3);
  return rgbToHex(hr * 255, hg * 255, hb * 255);
}

function makeTextPalette(accent: string, secondary = accent): StationTextPalette {
  return {
    primary: mixWithWhite(accent, 0.72),
    muted: mixWithWhite(secondary, 0.48),
    soft: mixWithWhite(accent, 0.8),
    statPlayers: mixWithWhite(shiftHue(accent, -24), 0.58),
    statSlot: mixWithWhite(accent, 0.54),
    statRate: mixWithWhite(shiftHue(secondary, 18), 0.6),
    statRateSuffix: mixWithWhite(shiftHue(secondary, 18), 0.44),
    border: hexWithAlpha(accent, 0.45),
    badgeOpen: {
      backgroundColor: hexWithAlpha(accent, 0.24),
      borderColor: hexWithAlpha(accent, 0.42),
      color: mixWithWhite(accent, 0.74),
    },
    rateBadge: {
      backgroundColor: hexWithAlpha(accent, 0.16),
      borderColor: hexWithAlpha(accent, 0.4),
      color: mixWithWhite(accent, 0.68),
    },
  };
}

/** Curated text palettes for solid tint presets — tuned for dark station cards. */
const CURATED_SOLID_PALETTES: Record<string, StationTextPalette> = {
  '#F97316': makeTextPalette('#F97316', '#FBBF24'),
  '#0EA5E9': makeTextPalette('#0EA5E9', '#38BDF8'),
  '#EF4444': makeTextPalette('#EF4444', '#F87171'),
  '#22C55E': makeTextPalette('#22C55E', '#4ADE80'),
  '#7C3AED': makeTextPalette('#7C3AED', '#A78BFA'),
  '#8B5CF6': makeTextPalette('#8B5CF6', '#C4B5FD'),
  '#10B981': makeTextPalette('#10B981', '#34D399'),
  '#D97706': makeTextPalette('#D97706', '#FBBF24'),
  '#84CC16': makeTextPalette('#84CC16', '#A3E635'),
  '#22D3EE': makeTextPalette('#22D3EE', '#67E8F9'),
  '#EC4899': makeTextPalette('#EC4899', '#F472B6'),
  '#F59E0B': makeTextPalette('#F59E0B', '#FCD34D'),
  '#6B7280': makeTextPalette('#94A3B8', '#CBD5E1'),
};

/** Curated palettes for gradient presets. */
const CURATED_GRADIENT_PALETTES: Record<string, StationTextPalette> = Object.fromEntries(
  ACCENT_GRADIENT_PRESETS.map((g) => [g.id, makeTextPalette(g.from, g.to)])
);

export function deriveStationTextPalette(accentValue: string): StationTextPalette {
  const parsed = parseAccentColor(accentValue);
  if (parsed.kind === 'gradient') {
    const match = ACCENT_GRADIENT_PRESETS.find(
      (g) => g.from === parsed.from && g.to === parsed.to
    );
    if (match && CURATED_GRADIENT_PALETTES[match.id]) {
      return CURATED_GRADIENT_PALETTES[match.id];
    }
    return makeTextPalette(parsed.from, parsed.to);
  }
  if (parsed.kind === 'solid') {
    return CURATED_SOLID_PALETTES[parsed.hex] ?? makeTextPalette(parsed.hex);
  }
  return makeTextPalette('#A855F7');
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
  return accentPrimaryHex(accentColor, getDefaultStationTypeHex(type));
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

export function buildStationAccentStyle(accentValue: string): StationAccentStyle {
  const textPalette = deriveStationTextPalette(accentValue);
  const parsed = parseAccentColor(accentValue);
  if (parsed.kind === 'gradient') {
    const { from, to, angle } = parsed;
    const gradient = `linear-gradient(${angle}deg, ${from}, ${to})`;
    const mesh = `linear-gradient(${angle}deg, ${hexWithAlpha(from, 0.35)}, ${hexWithAlpha(to, 0.2)})`;
    return {
      accentHex: from,
      textPalette,
      cardStyle: {
        borderColor: hexWithAlpha(from, 0.45),
        background: `linear-gradient(${angle}deg, ${hexWithAlpha(from, 0.32)}, ${hexWithAlpha(to, 0.18)} 45%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.95))`,
        boxShadow: `0 4px 32px ${hexWithAlpha(from, 0.25)}, 0 0 40px ${hexWithAlpha(to, 0.12)}`,
      },
      meshStyle: {
        background: `radial-gradient(ellipse at top left, ${hexWithAlpha(from, 0.22)}, transparent 55%), radial-gradient(ellipse at bottom right, ${hexWithAlpha(to, 0.14)}, transparent 50%)`,
      },
      topBarIdleStyle: {
        background: gradient,
        opacity: 0.85,
      },
      iconBgStyle: {
        background: mesh,
        boxShadow: `0 0 14px ${hexWithAlpha(from, 0.4)}`,
      },
      startBtnStyle: {
        background: gradient,
        boxShadow: `0 0 22px ${hexWithAlpha(from, 0.45)}`,
      },
    };
  }

  const accentHex = parsed.kind === 'solid' ? parsed.hex : accentValue;
  return {
    accentHex,
    textPalette,
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
