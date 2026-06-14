import type { GameType, PoolGameVariant, PS5GameTitle, TournamentFormat } from '@/types/tournament.types';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';

export type SportThemeKind = 'fifa' | 'pool' | 'racing' | 'generic';

export type SportTheme = {
  kind: SportThemeKind;
  label: string;
  subtitle: string;
  primary: string;
  accent: string;
  surface: string;
  glow: string;
  pitchPattern?: string;
  icon: 'football' | 'pool' | 'racing' | 'trophy';
};

const FIFA_THEME: SportTheme = {
  kind: 'fifa',
  label: 'FIFA Knockout',
  subtitle: 'Football championship bracket',
  primary: '#16a34a',
  accent: '#4ade80',
  surface: '#0a1f12',
  glow: 'rgba(34, 197, 94, 0.35)',
  pitchPattern:
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 80px, transparent 80px, transparent 160px)',
  icon: 'football',
};

const POOL_THEME: SportTheme = {
  kind: 'pool',
  label: '8-Ball Knockout',
  subtitle: 'Pool championship bracket',
  primary: '#15803d',
  accent: '#fbbf24',
  surface: '#071a10',
  glow: 'rgba(251, 191, 36, 0.25)',
  pitchPattern:
    'radial-gradient(circle at 20% 20%, rgba(251,191,36,0.06), transparent 40%), radial-gradient(circle at 80% 80%, rgba(34,197,94,0.08), transparent 45%)',
  icon: 'pool',
};

const RACING_THEME: SportTheme = {
  kind: 'racing',
  label: 'Time Trial',
  subtitle: 'Fastest lap wins',
  primary: '#10b981',
  accent: '#22d3ee',
  surface: '#030712',
  glow: 'rgba(16, 185, 129, 0.3)',
  icon: 'racing',
};

const GENERIC_THEME: SportTheme = {
  kind: 'generic',
  label: 'Knockout Bracket',
  subtitle: 'Live tournament board',
  primary: '#7c3aed',
  accent: '#ec4899',
  surface: '#0a0612',
  glow: 'rgba(124, 58, 237, 0.3)',
  icon: 'trophy',
};

function isFifaTitle(title?: PS5GameTitle): boolean {
  const t = (title ?? '').toLowerCase();
  return t.includes('fifa') || t.includes('fc ') || t === 'fc' || t.includes('football');
}

export function resolveSportTheme(opts: {
  gameType: GameType;
  gameVariant?: PoolGameVariant;
  gameTitle?: PS5GameTitle;
  tournamentFormat: TournamentFormat;
}): SportTheme {
  if (isTimeTrialFormat(opts.tournamentFormat)) return RACING_THEME;
  if (opts.gameType === 'Pool') return POOL_THEME;
  if (opts.gameType === 'PS5' && isFifaTitle(opts.gameTitle)) return FIFA_THEME;
  if (opts.gameType === 'PS5') return FIFA_THEME;
  return GENERIC_THEME;
}

export function formatMatchStage(stage: string): string {
  switch (stage) {
    case 'final':
      return 'Final';
    case 'semi_final':
      return 'Semi-final';
    case 'quarter_final':
      return 'Quarter-final';
    case 'grand_final':
      return 'Grand final';
    default:
      return 'Round';
  }
}

export function formatScore(match: { score1?: number; score2?: number; completed: boolean }): string {
  if (!match.completed) return '—';
  const s1 = match.score1 ?? 0;
  const s2 = match.score2 ?? 0;
  return `${s1} – ${s2}`;
}
