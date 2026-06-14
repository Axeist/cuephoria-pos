import React from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Radio,
  Swords,
  Trophy,
  Users,
  Zap,
  Calendar,
  Award,
} from 'lucide-react';
import type { Tournament } from '@/types/tournament.types';
import { useTournamentMotion } from './animations/TournamentMotionProvider';
import { useTournamentTVBrand, hexToRgba } from './tournamentTVBrand';
import { format } from 'date-fns';

function formatStage(stage: string) {
  switch (stage) {
    case 'final':
      return 'Final';
    case 'semi_final':
      return 'Semi-final';
    case 'quarter_final':
      return 'Quarter-final';
    default:
      return `Round ${stage}`;
  }
}

export default function TournamentTVBracket({ tournament }: { tournament: Tournament }) {
  const { reduced, duration } = useTournamentMotion();
  const brand = useTournamentTVBrand();
  const { primaryHex, accentHex, logoUrl, displayName } = brand;
  const matches = tournament.matches ?? [];
  const liveMatch = matches.find((m) => m.inProgress || (!m.completed && m.player1Id && m.player2Id));
  const completedCount = matches.filter((m) => m.completed).length;
  const upcoming = matches.filter((m) => !m.completed).slice(0, 4);

  const getName = (id: string) => tournament.players.find((p) => p.id === id)?.name ?? 'TBD';

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at top, ${hexToRgba(primaryHex, 0.22)}, transparent 50%), linear-gradient(180deg, #0a0612 0%, #050508 100%)`,
        }}
      />
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-20"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          style={{
            backgroundImage: `linear-gradient(135deg, transparent 40%, ${hexToRgba(accentHex, 0.18)} 50%, transparent 60%)`,
            backgroundSize: '200% 200%',
          }}
        />
      )}

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8 lg:p-10 gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
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
                animate={reduced ? {} : { opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Radio className="h-3 w-3" />
                Live bracket
              </motion.span>
              <span className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ color: hexToRgba(primaryHex, 0.85) }}>
                {displayName}
              </span>
            </div>
            <h1
              className="text-3xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, #fff, ${hexToRgba(primaryHex, 0.9)}, ${hexToRgba(accentHex, 0.85)})`,
              }}
            >
              {tournament.name}
            </h1>
            <p className="mt-2 capitalize" style={{ color: hexToRgba(primaryHex, 0.6) }}>
              {tournament.tournamentFormat.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: hexToRgba(primaryHex, 0.35), backgroundColor: hexToRgba(primaryHex, 0.12) }}
            >
              <p className="text-2xl font-black">{tournament.players.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Players</p>
            </div>
            <div
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: hexToRgba(accentHex, 0.35), backgroundColor: hexToRgba(accentHex, 0.1) }}
            >
              <p className="text-2xl font-black">{completedCount}/{matches.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Done</p>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-6 flex-1">
          {liveMatch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration }}
              className="lg:col-span-2 rounded-3xl border-2 p-6 md:p-10 text-center relative overflow-hidden"
              style={{
                borderColor: hexToRgba(primaryHex, 0.45),
                background: `linear-gradient(to bottom right, ${hexToRgba(primaryHex, 0.22)}, ${hexToRgba(accentHex, 0.1)}, transparent)`,
              }}
            >
              {!reduced && (
                <motion.div
                  className="absolute inset-0 border-2 rounded-3xl"
                  style={{ borderColor: hexToRgba(primaryHex, 0.25) }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <p className="text-xs uppercase tracking-[0.3em] mb-6 flex items-center justify-center gap-2" style={{ color: hexToRgba(primaryHex, 0.85) }}>
                <Swords className="h-4 w-4" />
                Now playing
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12">
                <span className="text-3xl md:text-6xl font-black">{getName(liveMatch.player1Id)}</span>
                <span className="text-xl md:text-3xl font-bold px-4 py-2 rounded-full border border-white/10" style={{ color: hexToRgba(accentHex, 0.6) }}>VS</span>
                <span className="text-3xl md:text-6xl font-black">{getName(liveMatch.player2Id)}</span>
              </div>
              <p className="text-sm text-white/40 mt-6">{formatStage(liveMatch.stage)}</p>
            </motion.div>
          )}

          {(tournament.winner || tournament.runnerUp) && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/50 to-black/40 p-6">
              <p className="text-xs uppercase tracking-widest text-amber-400/80 mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Champions
              </p>
              {tournament.winner && (
                <div className="flex items-center gap-4 mb-4">
                  <Crown className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="text-xs text-amber-300/70">Winner</p>
                    <p className="text-2xl md:text-3xl font-black">{tournament.winner.name}</p>
                  </div>
                </div>
              )}
              {tournament.runnerUp && (
                <div className="flex items-center gap-3 pl-1">
                  <Award className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-white/40">Runner-up</p>
                    <p className="text-lg font-bold">{tournament.runnerUp.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
            <p className="text-xs uppercase tracking-widest text-white/40 px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Upcoming matches
            </p>
            {upcoming.length === 0 ? (
              <p className="p-8 text-center text-white/30 text-sm">Bracket complete or not started</p>
            ) : (
              <div className="divide-y divide-white/5">
                {upcoming.map((m) => (
                  <div key={m.id} className="px-4 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase mb-1" style={{ color: hexToRgba(primaryHex, 0.65) }}>{formatStage(m.stage)}</p>
                      <p className="font-semibold truncate">
                        {getName(m.player1Id)} <span className="text-white/30 mx-1">vs</span> {getName(m.player2Id)}
                      </p>
                    </div>
                    {m.scheduledDate && (
                      <span className="text-xs text-white/40 shrink-0">
                        {format(new Date(m.scheduledDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-white/30">
          <Zap className="h-3 w-3" />
          <Users className="h-3 w-3" />
          Live tournament display
        </div>
      </div>
    </div>
  );
}
