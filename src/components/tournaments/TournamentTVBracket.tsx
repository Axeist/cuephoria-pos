import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Radio,
  Trophy,
  Zap,
  Award,
} from 'lucide-react';
import type { Match, Tournament } from '@/types/tournament.types';
import { useTournamentMotion } from './animations/TournamentMotionProvider';
import { useTournamentTVBrand, hexToRgba } from './tournamentTVBrand';
import { groupMatchesByRound, groupMatchesByBracketSide, sortRounds } from '@/utils/tournament/bracketAdvancement';
import { formatMatchStage, formatScore, resolveSportTheme } from '@/utils/tournament/sportTheme';
import { isStandingsFormat } from '@/utils/tournament/standings';
import TournamentStandingsPanel from './TournamentStandingsPanel';
import { TvLiveFeedTicker } from './TvLiveFeedTicker';
import { cn } from '@/lib/utils';

type BracketSize = 'lg' | 'md' | 'sm' | 'xs';

const BRACKET_LAYOUT: Record<
  BracketSize,
  {
    minWidth: string;
    nameClass: string;
    rowPadding: string;
    cardPadding: string;
    headerSize: string;
    columnGap: string;
    matchGap: string;
    scale: number;
  }
> = {
  lg: {
    minWidth: 'min-w-[300px]',
    nameClass: 'text-base md:text-lg',
    rowPadding: 'px-3 py-2.5',
    cardPadding: 'p-3',
    headerSize: 'text-[11px]',
    columnGap: 'gap-6 md:gap-10',
    matchGap: 'gap-5 md:gap-6',
    scale: 1.18,
  },
  md: {
    minWidth: 'min-w-[260px]',
    nameClass: 'text-sm md:text-base',
    rowPadding: 'px-2.5 py-2',
    cardPadding: 'p-2.5',
    headerSize: 'text-[10px]',
    columnGap: 'gap-5 md:gap-8',
    matchGap: 'gap-4 md:gap-5',
    scale: 1.08,
  },
  sm: {
    minWidth: 'min-w-[220px]',
    nameClass: 'text-sm',
    rowPadding: 'px-2 py-1.5',
    cardPadding: 'p-2',
    headerSize: 'text-[10px]',
    columnGap: 'gap-4 md:gap-6',
    matchGap: 'gap-3 md:gap-4',
    scale: 1,
  },
  xs: {
    minWidth: 'min-w-[175px]',
    nameClass: 'text-xs',
    rowPadding: 'px-2 py-1.5',
    cardPadding: 'p-2',
    headerSize: 'text-[9px]',
    columnGap: 'gap-3 md:gap-4',
    matchGap: 'gap-2 md:gap-3',
    scale: 0.9,
  },
};

function resolveBracketSize(maxMatchesInRound: number, roundCount: number): BracketSize {
  if (maxMatchesInRound <= 2 && roundCount <= 3) return 'lg';
  if (maxMatchesInRound <= 4) return 'md';
  if (maxMatchesInRound <= 8) return 'sm';
  return 'xs';
}

function TvMatchNode({
  match,
  getName,
  theme,
  accent,
  size = 'sm',
}: {
  match: Match;
  getName: (id: string) => string;
  theme: ReturnType<typeof resolveSportTheme>;
  accent: string;
  size?: BracketSize;
}) {
  const layout = BRACKET_LAYOUT[size];
  const p1 = getName(match.player1Id);
  const p2 = getName(match.player2Id);
  const live = match.inProgress;
  const done = match.completed;

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-md overflow-hidden',
        layout.minWidth,
        live && 'ring-2',
      )}
      style={{
        borderColor: live ? theme.accent : `${theme.primary}55`,
        backgroundColor: `${theme.surface}dd`,
        boxShadow: live ? `0 0 20px ${theme.glow}` : undefined,
      }}
    >
      <div
        className={cn(
          'px-2 py-1 border-b border-white/10 flex items-center justify-between uppercase tracking-widest',
          layout.headerSize,
        )}
      >
        <span style={{ color: accent }}>{formatMatchStage(match.stage)}</span>
        {live && (
          <span className="text-red-300 font-bold flex items-center gap-1">
            <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
          </span>
        )}
        {done && !live && <span className="text-emerald-400">FT</span>}
      </div>
      <div className={cn('space-y-1', layout.cardPadding)}>
        {[
          { id: match.player1Id, name: p1, score: match.score1, won: match.winnerId === match.player1Id },
          { id: match.player2Id, name: p2, score: match.score2, won: match.winnerId === match.player2Id },
        ].map((row) => (
          <div
            key={row.id || row.name}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg',
              layout.rowPadding,
              row.won && 'bg-emerald-500/15 border border-emerald-500/25',
              done && !row.won && row.id && 'opacity-40',
            )}
          >
            <span className={cn('font-semibold truncate', layout.nameClass)}>{row.name}</span>
            <span className={cn('font-mono font-black tabular-nums', size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm')} style={{ color: row.won ? theme.accent : 'inherit' }}>
              {done ? (row.score ?? 0) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentTVBracket({
  tournament,
  eventSwitcher,
}: {
  tournament: Tournament;
  eventSwitcher?: React.ReactNode;
}) {
  const { reduced, duration } = useTournamentMotion();
  const brand = useTournamentTVBrand();
  const { logoUrl, displayName } = brand;

  const sport = useMemo(
    () =>
      resolveSportTheme({
        gameType: tournament.gameType,
        gameVariant: tournament.gameVariant,
        gameTitle: tournament.gameTitle,
        tournamentFormat: tournament.tournamentFormat,
      }),
    [tournament],
  );

  const matches = tournament.matches ?? [];
  const showStandings = isStandingsFormat(tournament.tournamentFormat);
  const isDoubleElim = tournament.tournamentFormat === 'double_elimination';

  const bracketMatches = showStandings
    ? matches
    : isDoubleElim
      ? matches.filter((m) => m.bracketSide !== 'losers' || m.player1Id || m.player2Id)
      : matches;

  const groups = groupMatchesByRound(bracketMatches);
  const rounds = sortRounds(groups);
  const completedCount = matches.filter((m) => m.completed).length;

  const liveMatch =
    matches.find((m) => m.inProgress) ??
    matches.find((m) => !m.completed && m.player1Id && m.player2Id);

  const recentResults = useMemo(
    () =>
      [...matches]
        .filter((m) => m.completed && m.winnerId)
        .sort((a, b) => b.round - a.round)
        .slice(0, 6),
    [matches],
  );

  const getName = (id: string) => tournament.players.find((p) => p.id === id)?.name ?? 'TBD';

  const blendAccent = sport.accent;
  const showLiveHero = liveMatch?.inProgress;

  const maxMatchesInRound = useMemo(
    () => Math.max(...rounds.map((r) => groups[r]?.length ?? 0), 1),
    [rounds, groups],
  );
  const bracketSize = useMemo(
    () => resolveBracketSize(maxMatchesInRound, rounds.length),
    [maxMatchesInRound, rounds.length],
  );

  const feedItems = recentResults.map((m) => ({
    id: m.id,
    label: `${getName(m.winnerId!)} def. ${getName(m.winnerId === m.player1Id ? m.player2Id : m.player1Id)}`,
    value: formatScore(m),
  }));

  const renderBracketColumns = (
    roundList: number[],
    roundGroups: Record<number, Match[]>,
    size: BracketSize = bracketSize,
  ) => {
    const layout = BRACKET_LAYOUT[size];
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
        <div
          className={cn('flex h-full min-w-max items-stretch px-1', layout.columnGap)}
          style={{ transform: `scale(${layout.scale})`, transformOrigin: 'center center' }}
        >
          {roundList.map((round) => (
            <div key={round} className={cn('flex flex-1 flex-col justify-evenly min-h-full', layout.matchGap)}>
              <p
                className="text-center text-[10px] md:text-xs font-bold uppercase tracking-widest shrink-0"
                style={{ color: blendAccent }}
              >
                {roundGroups[round][0] ? formatMatchStage(roundGroups[round][0].stage) : `R${round}`}
              </p>
              {roundGroups[round].map((match) => (
                <TvMatchNode
                  key={match.id}
                  match={match}
                  getName={getName}
                  theme={sport}
                  accent={blendAccent}
                  size={size}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at top, ${hexToRgba(sport.primary, 0.28)}, transparent 55%), linear-gradient(180deg, ${sport.surface} 0%, #020617 100%)`,
          }}
        />
        {sport.pitchPattern && (
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: sport.pitchPattern }} />
        )}
        {!reduced && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(to right, transparent, ${sport.primary}, ${sport.accent}, transparent)` }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      <div className="relative z-10 flex h-full flex-col overflow-hidden p-3 md:p-5 lg:p-6 gap-3 md:gap-4">
        <header className="shrink-0 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3 md:pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName} className="h-8 w-8 md:h-10 md:w-10 rounded-xl object-contain bg-white/10 border border-white/10 p-1" />
              ) : null}
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-200"
                animate={reduced ? {} : { opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Radio className="h-3 w-3" />
                Live
              </motion.span>
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ color: sport.accent }}>
                {sport.label}
              </span>
            </div>
            <h1
              className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight bg-clip-text text-transparent truncate"
              style={{
                backgroundImage: `linear-gradient(to right, #fff, ${sport.primary}, ${sport.accent})`,
              }}
            >
              {tournament.name}
            </h1>
            <p className="text-xs md:text-sm text-white/55 truncate">{sport.subtitle} · {displayName}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {eventSwitcher}
            <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border px-3 py-2 text-center" style={{ borderColor: `${sport.primary}44`, background: `${sport.primary}18` }}>
              <p className="text-lg md:text-xl font-black">{tournament.players.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/40">Players</p>
            </div>
            <div className="rounded-xl border px-3 py-2 text-center" style={{ borderColor: `${sport.accent}44`, background: `${sport.accent}14` }}>
              <p className="text-lg md:text-xl font-black">{completedCount}/{matches.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/40">Played</p>
            </div>
            </div>
          </div>
        </header>

        {showLiveHero && liveMatch && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration }}
            className="shrink-0 rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-center gap-3 md:gap-6"
            style={{
              borderColor: sport.accent,
              background: `linear-gradient(135deg, ${hexToRgba(sport.primary, 0.3)}, ${hexToRgba(sport.accent, 0.1)})`,
              boxShadow: `0 0 24px ${sport.glow}`,
            }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-red-300 font-bold flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse" /> Live now
            </span>
            <span className="text-lg md:text-2xl font-black">{getName(liveMatch.player1Id)}</span>
            <span className="text-white/40 font-bold">vs</span>
            <span className="text-lg md:text-2xl font-black">{getName(liveMatch.player2Id)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/45">{formatMatchStage(liveMatch.stage)}</span>
          </motion.div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 md:gap-4 overflow-hidden">
          <div className="min-h-0 flex flex-col overflow-hidden">
            <p className="shrink-0 text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2 flex items-center gap-2">
              <Trophy className="h-3 w-3" style={{ color: blendAccent }} />
              {showStandings ? 'Standings & fixtures' : isDoubleElim ? 'Brackets' : 'Bracket'}
            </p>
            <div className="flex-1 min-h-0 overflow-hidden">
              {showStandings ? (
                <div className="grid h-full min-h-0 lg:grid-cols-2 gap-3 overflow-hidden">
                  <div className="min-h-0 overflow-hidden">
                    <TournamentStandingsPanel
                      matches={matches}
                      players={tournament.players}
                      tournamentFormat={tournament.tournamentFormat}
                      accent={blendAccent}
                      compact
                    />
                  </div>
                  <div className="min-h-0 overflow-hidden grid grid-cols-2 gap-2 content-start">
                    {matches
                      .filter((m) => !m.bye && m.player1Id && m.player2Id)
                      .slice(0, 8)
                      .map((match) => (
                        <TvMatchNode
                          key={match.id}
                          match={match}
                          getName={getName}
                          theme={sport}
                          accent={blendAccent}
                          size={bracketSize}
                        />
                      ))}
                  </div>
                </div>
              ) : isDoubleElim ? (
                <div className="h-full min-h-0 overflow-hidden flex flex-col gap-2">
                  {(
                    [
                      { label: 'Winners', side: 'winners' },
                      { label: 'Losers', side: 'losers' },
                      { label: 'Grand final', side: 'grand_final' },
                    ] as const
                  ).map(({ label, side }) => {
                    const sideMatches = (groupMatchesByBracketSide(matches)[side] ?? []).filter(
                      (m) => (side === 'losers' ? m.player1Id || m.player2Id : true),
                    );
                    if (sideMatches.length === 0) return null;
                    const sideGroups = groupMatchesByRound(sideMatches);
                    const sideRounds = sortRounds(sideGroups);
                    const sideMax = Math.max(...sideRounds.map((r) => sideGroups[r]?.length ?? 0), 1);
                    const sideSize = resolveBracketSize(sideMax, sideRounds.length);
                    return (
                      <div key={side} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <p className="shrink-0 text-[10px] uppercase tracking-widest text-white/40 mb-1" style={{ color: blendAccent }}>
                          {label}
                        </p>
                        {renderBracketColumns(sideRounds, sideGroups, sideSize)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                renderBracketColumns(rounds, groups)
              )}
            </div>
          </div>

          <aside className="hidden lg:flex min-h-0 flex-col gap-3 overflow-hidden">
            {(tournament.winner || tournament.runnerUp) && (
              <div
                className="shrink-0 rounded-xl border p-3"
                style={{ borderColor: `${sport.accent}44`, background: `${sport.primary}15` }}
              >
                <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: sport.accent }}>
                  <Trophy className="h-3.5 w-3.5" />
                  Champions
                </p>
                {tournament.winner && (
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 shrink-0" style={{ color: sport.accent }} />
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/50">Winner</p>
                      <p className="text-base font-black truncate">{tournament.winner.name}</p>
                    </div>
                  </div>
                )}
                {tournament.runnerUp && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-white/50 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/50">Runner-up</p>
                      <p className="text-sm font-bold truncate">{tournament.runnerUp.name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {recentResults.length > 0 && (
              <div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden flex flex-col">
                <p className="shrink-0 text-[10px] uppercase tracking-widest text-white/40 px-3 py-2 border-b border-white/10 flex items-center gap-2">
                  <Zap className="h-3 w-3" style={{ color: sport.primary }} />
                  Latest results
                </p>
                <div className="min-h-0 divide-y divide-white/5">
                  {recentResults.slice(0, 4).map((m) => (
                    <div key={m.id} className="px-3 py-2 text-xs">
                      <p className="font-semibold truncate">
                        {getName(m.winnerId!)} <span className="text-white/35">def.</span>{' '}
                        {getName(m.winnerId === m.player1Id ? m.player2Id : m.player1Id)}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5 font-mono">{formatScore(m)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        <TvLiveFeedTicker items={feedItems} reduced={reduced} accent={blendAccent} />
      </div>
    </div>
  );
}
