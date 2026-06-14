import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag,
  Timer,
  Trophy,
  Users,
  Zap,
  Activity,
  Crown,
  Medal,
  Radio,
  Gauge,
} from 'lucide-react';
import type { Tournament } from '@/types/tournament.types';
import { formatLapTimeMs } from '@/types/tournament.types';
import { rankPlayersByLapTime } from '@/utils/tournament/lapTimeRanking';
import { useTournamentMotion } from './animations/TournamentMotionProvider';
import { useTournamentTVBrand, hexToRgba } from './tournamentTVBrand';
import { cn } from '@/lib/utils';

function formatGapMs(gapMs: number): string {
  if (gapMs <= 0) return 'LEADER';
  return `+${(gapMs / 1000).toFixed(3)}s`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  style,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 md:p-5 backdrop-blur-md',
        accent,
      )}
      style={style}
    >
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
      <div className="flex items-start justify-between gap-2 relative">
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">
            {label}
          </p>
          <p className="text-2xl md:text-4xl font-black text-white tabular-nums mt-1">{value}</p>
          {sub && <p className="text-[11px] text-white/45 mt-1">{sub}</p>}
        </div>
        <div className="rounded-xl bg-white/10 p-2.5 border border-white/10">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-white/80" />
        </div>
      </div>
    </motion.div>
  );
}

export default function TournamentTVTimeTrial({
  tournament,
  eventSwitcher,
}: {
  tournament: Tournament;
  eventSwitcher?: React.ReactNode;
}) {
  const { reduced, duration } = useTournamentMotion();
  const brand = useTournamentTVBrand();
  const { primaryHex, accentHex, logoUrl, displayName, tagline } = brand;
  const trackName = tournament.formatOptions?.trackName ?? 'Time Trial';
  const bestLapCount = tournament.formatOptions?.bestLapCount ?? 1;

  const ranked = useMemo(
    () => rankPlayersByLapTime(tournament.players, tournament.lapTimes ?? [], bestLapCount),
    [tournament.players, tournament.lapTimes, bestLapCount],
  );

  const validLaps = useMemo(
    () => (tournament.lapTimes ?? []).filter((l) => !l.invalidated),
    [tournament.lapTimes],
  );

  const recentLaps = useMemo(
    () =>
      [...validLaps]
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .slice(0, 8),
    [validLaps],
  );

  const leader = ranked[0];
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const sessionBest = leader ? formatLapTimeMs(leader.bestLapMs) : '—:—.——';

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* Broadcast background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at top, ${hexToRgba(primaryHex, 0.22)}, transparent 55%), radial-gradient(ellipse at bottom right, ${hexToRgba(accentHex, 0.14)}, transparent 50%), linear-gradient(180deg, #030712 0%, #0a0f1a 40%, #020617 100%)`,
          }}
        />
        {!reduced && (
          <>
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 opacity-60"
              style={{
                background: `linear-gradient(to right, transparent, ${primaryHex}, ${accentHex}, transparent)`,
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{
                background: `linear-gradient(to right, transparent, ${hexToRgba(primaryHex, 0.5)}, ${hexToRgba(accentHex, 0.35)}, transparent)`,
              }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </>
        )}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8 lg:p-10 gap-5 md:gap-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-2 max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-contain bg-white/10 border border-white/10 p-1.5 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-200"
                animate={reduced ? {} : { boxShadow: ['0 0 0 0 rgba(239,68,68,0.4)', '0 0 0 8px rgba(239,68,68,0)', '0 0 0 0 rgba(239,68,68,0.4)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Radio className="h-3 w-3" />
                Live
              </motion.span>
              <span
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] font-semibold"
                style={{ color: hexToRgba(primaryHex, 0.85) }}
              >
                <Flag className="h-3.5 w-3.5" />
                {displayName}
              </span>
            </div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, #fff, ${hexToRgba(primaryHex, 0.9)}, ${hexToRgba(accentHex, 0.85)})`,
              }}
            >
              {tournament.name}
            </motion.h1>
            <p className="text-base md:text-xl font-medium" style={{ color: hexToRgba(primaryHex, 0.75) }}>
              {trackName} · Fastest lap wins
              {tagline ? ` · ${tagline}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            {eventSwitcher}
            <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Session best</p>
            <motion.p
              key={sessionBest}
              initial={{ scale: reduced ? 1 : 1.08, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-mono text-3xl md:text-5xl font-black tabular-nums"
              style={{ color: primaryHex }}
            >
              {sessionBest}
            </motion.p>
            </div>
          </div>
        </header>

        {/* Stats infographics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Drivers"
            value={tournament.players.length}
            sub="Registered"
            icon={Users}
            accent="border-white/15"
            style={{ borderColor: hexToRgba(primaryHex, 0.35), backgroundColor: hexToRgba(primaryHex, 0.12) }}
          />
          <StatCard
            label="Laps"
            value={validLaps.length}
            sub="Recorded today"
            icon={Activity}
            accent="border-white/15"
            style={{ borderColor: hexToRgba(accentHex, 0.35), backgroundColor: hexToRgba(accentHex, 0.1) }}
          />
          <StatCard
            label="On board"
            value={ranked.length}
            sub="With a valid time"
            icon={Gauge}
            accent="border-white/15"
            style={{ borderColor: hexToRgba(primaryHex, 0.25), backgroundColor: hexToRgba(primaryHex, 0.08) }}
          />
          <StatCard
            label="Prize mode"
            value={bestLapCount === 1 ? 'Best lap' : `Best ${bestLapCount}`}
            sub={tournament.entryFee ? `₹${tournament.entryFee} entry` : 'Time attack'}
            icon={Zap}
            accent="border-white/15"
            style={{ borderColor: hexToRgba(accentHex, 0.3), backgroundColor: hexToRgba(accentHex, 0.08) }}
          />
        </div>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 items-end min-h-[180px] md:min-h-[240px]">
          {[1, 0, 2].map((idx) => {
            const row = podium[idx];
            const heights = ['h-[85%]', 'h-full', 'h-[75%]'];
            const medals = ['🥈', '🥇', '🥉'];
            const colors = [
              'from-slate-400/20 to-slate-600/10 border-slate-400/40',
              'from-amber-400/25 to-yellow-600/10 border-amber-400/50 shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)]',
              'from-orange-600/20 to-orange-800/10 border-orange-500/40',
            ];
            return (
              <motion.div
                key={`podium-${idx}`}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration }}
                className={cn(
                  'relative rounded-t-2xl border-t border-x bg-gradient-to-b backdrop-blur-sm flex flex-col items-center justify-end pb-4 px-2',
                  heights[idx],
                  colors[idx],
                  !row && 'opacity-30',
                )}
              >
                <span className="text-3xl md:text-5xl mb-2">{medals[idx]}</span>
                {row ? (
                  <>
                    <p className="font-bold text-sm md:text-xl truncate max-w-full text-center px-1">
                      {row.player.name}
                    </p>
                    <p className="font-mono text-lg md:text-3xl font-black tabular-nums mt-1" style={{ color: primaryHex }}>
                      {formatLapTimeMs(row.bestLapMs)}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">P{row.rank}</p>
                  </>
                ) : (
                  <p className="text-xs text-white/30 uppercase tracking-widest">Awaiting</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Leaderboard + gap chart */}
        <div className="flex-1 grid lg:grid-cols-[1fr_340px] gap-4 md:gap-5 min-h-0">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 md:px-5 py-3 border-b border-white/10 bg-white/[0.03]">
              <Trophy className="h-5 w-5 text-amber-400" />
              <span className="font-bold text-sm md:text-base uppercase tracking-wider">Live standings</span>
            </div>
            <div className="flex-1 overflow-auto">
              {ranked.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 md:py-24 px-6 text-center">
                  <motion.div
                    animate={reduced ? {} : { rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Timer className="h-16 w-16 text-emerald-500/30 mb-4" />
                  </motion.div>
                  <p className="text-xl md:text-2xl font-bold text-white/80">Waiting for first lap</p>
                  <p className="text-sm text-white/40 mt-2 max-w-md">
                    The leaderboard lights up as soon as a driver crosses the line. Fastest lap takes the crown.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {ranked.map((row) => {
                    const gap = leader ? row.bestLapMs - leader.bestLapMs : 0;
                    const barPct = leader ? Math.max(8, (leader.bestLapMs / row.bestLapMs) * 100) : 100;
                    return (
                      <motion.div
                        key={row.player.id}
                        layout
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'grid grid-cols-[auto_1fr_auto] md:grid-cols-[48px_1fr_120px_100px] items-center gap-3 px-4 md:px-5 py-3 md:py-4 border-b border-white/5',
                          row.rank === 1 && 'bg-gradient-to-r from-amber-500/10 to-transparent',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl font-black text-sm md:text-base',
                            row.rank === 1
                              ? 'bg-amber-500/30 text-amber-100 ring-1 ring-amber-400/50'
                              : row.rank === 2
                                ? 'bg-slate-500/25 text-slate-200'
                                : row.rank === 3
                                  ? 'bg-orange-600/25 text-orange-100'
                                  : 'bg-white/5 text-white/50',
                          )}
                        >
                          {row.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {row.rank === 1 && <Crown className="h-4 w-4 text-amber-400 shrink-0" />}
                            <span className="font-bold text-base md:text-xl truncate">{row.player.name}</span>
                            <span className="text-[10px] text-white/35 hidden sm:inline">
                              {row.attemptCount} lap{row.attemptCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={
                                row.rank === 1
                                  ? { background: `linear-gradient(to right, ${accentHex}, ${primaryHex})` }
                                  : { background: `linear-gradient(to right, ${hexToRgba(primaryHex, 0.85)}, ${hexToRgba(accentHex, 0.75)})` }
                              }
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                        <span className="font-mono text-lg md:text-2xl font-bold tabular-nums text-right" style={{ color: primaryHex }}>
                          {formatLapTimeMs(row.bestLapMs)}
                        </span>
                        <span
                          className={cn(
                            'hidden md:block text-right text-xs font-bold uppercase tracking-wide',
                            gap <= 0 ? 'text-amber-300' : 'text-white/40',
                          )}
                        >
                          {formatGapMs(gap)}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Side panel: rest + recent */}
          <div className="flex flex-col gap-4 min-h-0">
            {rest.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-4 flex-1 overflow-auto">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                  <Medal className="h-3.5 w-3.5" />
                  Field
                </p>
                <div className="space-y-2">
                  {rest.map((row) => (
                    <div
                      key={row.player.id}
                      className="flex items-center justify-between gap-2 text-sm border-b border-white/5 pb-2 last:border-0"
                    >
                      <span className="text-white/50 font-mono w-6">P{row.rank}</span>
                      <span className="flex-1 truncate font-medium">{row.player.name}</span>
                      <span className="font-mono tabular-nums text-xs" style={{ color: hexToRgba(primaryHex, 0.9) }}>
                        {formatLapTimeMs(row.bestLapMs)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="rounded-2xl border backdrop-blur-md overflow-hidden"
              style={{
                borderColor: hexToRgba(accentHex, 0.25),
                backgroundColor: hexToRgba(accentHex, 0.08),
              }}
            >
              <p
                className="text-xs uppercase tracking-widest px-4 py-2 border-b flex items-center gap-2"
                style={{ color: hexToRgba(accentHex, 0.75), borderColor: hexToRgba(accentHex, 0.15) }}
              >
                <Activity className="h-3.5 w-3.5" />
                Recent laps
              </p>
              {recentLaps.length === 0 ? (
                <p className="text-sm text-white/30 px-4 py-6 text-center">No laps yet</p>
              ) : (
                <div className="max-h-[200px] overflow-auto">
                  {recentLaps.map((lap, i) => (
                    <motion.div
                      key={lap.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/5 last:border-0"
                    >
                      <span className="truncate text-sm font-medium">{lap.playerName}</span>
                      <span className="font-mono text-sm font-bold tabular-nums shrink-0" style={{ color: primaryHex }}>
                        {formatLapTimeMs(lap.lapTimeMs)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ticker footer */}
        {recentLaps.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-1.5 border-b"
              style={{ backgroundColor: hexToRgba(primaryHex, 0.12), borderColor: hexToRgba(primaryHex, 0.2) }}
            >
              <Zap className="h-3 w-3" style={{ color: primaryHex }} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: hexToRgba(primaryHex, 0.85) }}>
                Live feed
              </span>
            </div>
            {!reduced ? (
              <motion.div
                className="flex whitespace-nowrap py-2 text-sm"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              >
                {[...recentLaps, ...recentLaps].map((lap, i) => (
                  <span key={`${lap.id}-${i}`} className="inline-flex items-center gap-2 px-8 text-white/70">
                    <span className="font-semibold text-white">{lap.playerName}</span>
                    <span className="font-mono" style={{ color: primaryHex }}>{formatLapTimeMs(lap.lapTimeMs)}</span>
                    <span className="text-white/20">•</span>
                  </span>
                ))}
              </motion.div>
            ) : (
              <div className="py-2 px-4 text-sm text-white/60 truncate">
                {recentLaps[0].playerName} · {formatLapTimeMs(recentLaps[0].lapTimeMs)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
