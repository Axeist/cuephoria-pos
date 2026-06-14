import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Radio,
  Trophy,
  Users,
  Zap,
  Award,
  Circle,
  Target,
} from 'lucide-react';
import type { Match, Tournament } from '@/types/tournament.types';
import { useTournamentMotion } from './animations/TournamentMotionProvider';
import { useTournamentTVBrand, hexToRgba } from './tournamentTVBrand';
import { groupMatchesByRound, groupMatchesByBracketSide, sortRounds } from '@/utils/tournament/bracketAdvancement';
import { formatMatchStage, formatScore, resolveSportTheme } from '@/utils/tournament/sportTheme';
import { isStandingsFormat } from '@/utils/tournament/standings';
import TournamentStandingsPanel from './TournamentStandingsPanel';
import { cn } from '@/lib/utils';

function TvMatchNode({
  match,
  getName,
  theme,
  accent,
  compact,
}: {
  match: Match;
  getName: (id: string) => string;
  theme: ReturnType<typeof resolveSportTheme>;
  accent: string;
  compact?: boolean;
}) {
  const p1 = getName(match.player1Id);
  const p2 = getName(match.player2Id);
  const live = match.inProgress;
  const done = match.completed;

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-md overflow-hidden',
        compact ? 'min-w-[180px]' : 'min-w-[200px]',
        live && 'ring-2',
      )}
      style={{
        borderColor: live ? theme.accent : `${theme.primary}55`,
        backgroundColor: `${theme.surface}dd`,
        boxShadow: live ? `0 0 20px ${theme.glow}` : undefined,
      }}
    >
      <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between text-[9px] uppercase tracking-widest">
        <span style={{ color: accent }}>{formatMatchStage(match.stage)}</span>
        {live && (
          <span className="text-red-300 font-bold flex items-center gap-1">
            <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
          </span>
        )}
        {done && !live && <span className="text-emerald-400">FT</span>}
      </div>
      <div className="p-2 space-y-1">
        {[
          { id: match.player1Id, name: p1, score: match.score1, won: match.winnerId === match.player1Id },
          { id: match.player2Id, name: p2, score: match.score2, won: match.winnerId === match.player2Id },
        ].map((row) => (
          <div
            key={row.id || row.name}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5',
              row.won && 'bg-emerald-500/15 border border-emerald-500/25',
              done && !row.won && row.id && 'opacity-40',
            )}
          >
            <span className={cn('font-semibold truncate', compact ? 'text-xs' : 'text-sm')}>{row.name}</span>
            <span className="font-mono font-black tabular-nums" style={{ color: row.won ? theme.accent : 'inherit' }}>
              {done ? (row.score ?? 0) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentTVBracket({ tournament }: { tournament: Tournament }) {
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
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

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8 lg:p-10 gap-5 md:gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName} className="h-10 w-10 rounded-xl object-contain bg-white/10 border border-white/10 p-1" />
              ) : null}
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-200"
                animate={reduced ? {} : { opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Radio className="h-3 w-3" />
                Live
              </motion.span>
              <span className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ color: sport.accent }}>
                {sport.label}
              </span>
            </div>
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, #fff, ${sport.primary}, ${sport.accent})`,
              }}
            >
              {tournament.name}
            </h1>
            <p className="text-sm md:text-base text-white/55">{sport.subtitle} · {displayName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: `${sport.primary}44`, background: `${sport.primary}18` }}>
              <p className="text-2xl font-black">{tournament.players.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Players</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: `${sport.accent}44`, background: `${sport.accent}14` }}>
              <p className="text-2xl font-black">{completedCount}/{matches.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Played</p>
            </div>
          </div>
        </header>

        {liveMatch && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration }}
            className="rounded-3xl border-2 p-6 md:p-10 text-center relative overflow-hidden"
            style={{
              borderColor: sport.accent,
              background: `linear-gradient(135deg, ${hexToRgba(sport.primary, 0.35)}, ${hexToRgba(sport.accent, 0.12)}, transparent)`,
              boxShadow: `0 0 40px ${sport.glow}`,
            }}
          >
            <p className="text-xs uppercase tracking-[0.35em] mb-6 flex items-center justify-center gap-2" style={{ color: sport.accent }}>
              {sport.icon === 'pool' ? <Circle className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              {liveMatch.inProgress ? 'On the table now' : 'Up next'}
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10">
              <div className="text-center">
                <p className="text-3xl md:text-5xl font-black">{getName(liveMatch.player1Id)}</p>
                {liveMatch.completed && (
                  <p className="text-4xl font-mono font-black mt-2" style={{ color: sport.accent }}>
                    {liveMatch.score1 ?? 0}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg md:text-2xl font-bold text-white/40">VS</span>
                {liveMatch.completed && (
                  <span className="text-xs uppercase tracking-widest text-white/50">Full time</span>
                )}
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-5xl font-black">{getName(liveMatch.player2Id)}</p>
                {liveMatch.completed && (
                  <p className="text-4xl font-mono font-black mt-2" style={{ color: sport.accent }}>
                    {liveMatch.score2 ?? 0}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-white/45 mt-6">{formatMatchStage(liveMatch.stage)}</p>
          </motion.div>
        )}

        <div className="flex-1 min-h-0">
          {showStandings ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <TournamentStandingsPanel
                matches={matches}
                players={tournament.players}
                tournamentFormat={tournament.tournamentFormat}
                accent={blendAccent}
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3 flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5" style={{ color: blendAccent }} />
                  Fixtures
                </p>
                <div className="grid sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {matches
                    .filter((m) => !m.bye && m.player1Id && m.player2Id)
                    .map((match) => (
                      <TvMatchNode
                        key={match.id}
                        match={match}
                        getName={getName}
                        theme={sport}
                        accent={blendAccent}
                        compact
                      />
                    ))}
                </div>
              </div>
            </div>
          ) : isDoubleElim ? (
            <div className="space-y-6">
              {(
                [
                  { label: 'Winners', side: 'winners' },
                  { label: 'Losers', side: 'losers' },
                  { label: 'Grand final', side: 'grand_final' },
                ] as const
              ).map(({ label, side }) => {
                const sideMatches = (groupMatchesByBracketSide(matches)[side] ?? []).filter(
                  (m) => side === 'losers' ? m.player1Id || m.player2Id : true,
                );
                if (sideMatches.length === 0) return null;
                const sideGroups = groupMatchesByRound(sideMatches);
                const sideRounds = sortRounds(sideGroups);
                return (
                  <div key={side}>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3" style={{ color: blendAccent }}>
                      {label}
                    </p>
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-5 md:gap-8 min-w-max items-stretch">
                        {sideRounds.map((round) => (
                          <div key={round} className="flex flex-col gap-4 justify-around">
                            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                              R{round}
                            </p>
                            {sideGroups[round].map((match) => (
                              <TvMatchNode
                                key={match.id}
                                match={match}
                                getName={getName}
                                theme={sport}
                                accent={blendAccent}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5" style={{ color: blendAccent }} />
                Bracket
              </p>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-5 md:gap-8 min-w-max items-stretch">
                  {rounds.map((round) => (
                    <div key={round} className="flex flex-col gap-4 justify-around">
                      <p className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: blendAccent }}>
                        R{round}
                      </p>
                      {groups[round].map((match) => (
                        <TvMatchNode
                          key={match.id}
                          match={match}
                          getName={getName}
                          theme={sport}
                          accent={blendAccent}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-4">
          {(tournament.winner || tournament.runnerUp) && (
            <div
              className="rounded-2xl border p-5"
              style={{ borderColor: `${sport.accent}44`, background: `${sport.primary}15` }}
            >
              <p className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: sport.accent }}>
                <Trophy className="h-4 w-4" />
                Champions
              </p>
              {tournament.winner && (
                <div className="flex items-center gap-4 mb-3">
                  <Crown className="h-8 w-8" style={{ color: sport.accent }} />
                  <div>
                    <p className="text-xs text-white/50">Winner</p>
                    <p className="text-2xl font-black">{tournament.winner.name}</p>
                  </div>
                </div>
              )}
              {tournament.runnerUp && (
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-xs text-white/50">Runner-up</p>
                    <p className="text-lg font-bold">{tournament.runnerUp.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {recentResults.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
              <p className="text-xs uppercase tracking-widest text-white/40 px-4 py-2 border-b border-white/10 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" style={{ color: sport.primary }} />
                Latest results
              </p>
              <div className="divide-y divide-white/5">
                {recentResults.map((m) => (
                  <div key={m.id} className="px-4 py-3 text-sm">
                    <p className="font-semibold truncate">
                      {getName(m.winnerId!)} <span className="text-white/35">def.</span>{' '}
                      {getName(m.winnerId === m.player1Id ? m.player2Id : m.player1Id)}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5 font-mono">{formatScore(m)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {recentResults.length > 0 && !reduced && (
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <motion.div
              className="flex whitespace-nowrap py-2 text-sm"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            >
              {[...recentResults, ...recentResults].map((m, i) => (
                <span key={`${m.id}-${i}`} className="inline-flex items-center gap-2 px-8 text-white/70">
                  <span className="font-semibold text-white">{getName(m.winnerId!)}</span>
                  <span className="font-mono" style={{ color: sport.accent }}>{formatScore(m)}</span>
                  <span className="text-white/20">•</span>
                </span>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
