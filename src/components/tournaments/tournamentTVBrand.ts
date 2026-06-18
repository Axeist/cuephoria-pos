import React from 'react';

export type TournamentTVBrand = {
  displayName: string;
  tagline: string;
  logoUrl: string;
  primaryHex: string;
  accentHex: string;
};

export const DEFAULT_TOURNAMENT_TV_BRAND: TournamentTVBrand = {
  displayName: 'Tournament TV',
  tagline: '',
  logoUrl: '',
  primaryHex: '#7c3aed',
  accentHex: '#ec4899',
};

/** Parse #RGB or #RRGGBB into rgba() for translucent TV overlays. */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) {
    return `rgba(124, 58, 237, ${alpha})`;
  }
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const TournamentTVBrandContext = React.createContext<TournamentTVBrand>(DEFAULT_TOURNAMENT_TV_BRAND);

export const TournamentTVBrandProvider = TournamentTVBrandContext.Provider;

export function useTournamentTVBrand(): TournamentTVBrand {
  return React.useContext(TournamentTVBrandContext);
}
