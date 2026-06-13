import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Timer,
  Trophy,
  Zap,
  Medal,
  Flag,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { LapTimeEntry, Player, Tournament } from '@/types/tournament.types';
import { formatLapTimeMs, parseLapTimeInput } from '@/types/tournament.types';
import { rankPlayersByLapTime } from '@/utils/tournament/lapTimeRanking';
import { generateId } from '@/utils/pos.utils';
import { WinnerBurst } from './animations/WinnerBurst';
import { useTournamentMotion } from './animations/TournamentMotionProvider';
import { cn } from '@/lib/utils';

interface FifaLapTimeBoardProps {
  tournament: Tournament;
  players: Player[];
  lapTimes: LapTimeEntry[];
  onLapTimesChange: (laps: LapTimeEntry[], winner?: Player, runnerUp?: Player, third?: Player) => void;
  tvMode?: boolean;
  readOnly?: boolean;
}

const PODIUM_COLORS = [
  'from-amber-400/30 via-yellow-500/20 to-amber-600/10 border-amber-400/50',
  'from-slate-300/25 via-slate-400/15 to-slate-500/10 border-slate-300/40',
  'from-orange-600/25 via-orange-700/15 to-orange-800/10 border-orange-500/40',
];

export default function FifaLapTimeBoard({
  tournament,
  players,
  lapTimes,
  onLapTimesChange,
  tvMode = false,
  readOnly = false,
}: FifaLapTimeBoardProps) {
  const { reduced, duration } = useTournamentMotion();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [lapInput, setLapInput] = useState('');
  const [lastRecorded, setLastRecorded] = useState<LapTimeEntry | null>(null);
  const [showBurst, setShowBurst] = useState(false);

  const trackName = tournament.formatOptions?.trackName ?? 'Time Trial';
  const maxAttempts = tournament.formatOptions?.maxAttempts ?? 99;
  const bestLapCount = tournament.formatOptions?.bestLapCount ?? 1;

  const ranked = useMemo(
    () => rankPlayersByLapTime(players, lapTimes, bestLapCount),
    [players, lapTimes, bestLapCount],
  );

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const recordLap = () => {
    const player = players.find((p) => p.id === selectedPlayerId);
    const ms = parseLapTimeInput(lapInput);
    if (!player || ms === null || ms <= 0) return;

    const attempts = lapTimes.filter((l) => l.playerId === player.id && !l.invalidated).length;
    if (attempts >= maxAttempts) return;

    const entry: LapTimeEntry = {
      id: generateId(),
      playerId: player.id,
      playerName: player.name,
      lapTimeMs: ms,
      lapNumber: attempts + 1,
      trackName,
      recordedAt: new Date().toISOString(),
    };

    const next = [...lapTimes, entry];
    const nextRanked = rankPlayersByLapTime(players, next, bestLapCount);
    setLastRecorded(entry);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 2500);
    setLapInput('');
    onLapTimesChange(
      next,
      nextRanked[0]?.player,
      nextRanked[1]?.player,
      nextRanked[2]?.player,
    );
  };

  const textScale = tvMode ? 'text-4xl md:text-6xl' : 'text-2xl md:text-3xl';
  const rowScale = tvMode ? 'text-lg md:text-xl' : 'text-sm';

  return (
    <div className={cn('space-y-6', tvMode && 'min-h-screen p-4 md:p-8')}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-black/40 to-cyan-950/30 p-6"
      >
        {!reduced && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-40"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 8, repeat: Infinity }}
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(52,211,153,0.15), transparent, rgba(34,211,238,0.1), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        )}
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300/80 text-xs uppercase tracking-widest font-semibold mb-1">
              <Flag className="h-3.5 w-3.5" />
              FIFA Time Trial
            </div>
            <h2 className={cn('font-bold text-white', tvMode ? 'text-3xl' : 'text-xl')}>
              {tournament.name}
            </h2>
            <p className="text-emerald-200/70 text-sm mt-1">{trackName} · Fastest lap wins</p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40 gap-1">
            <Timer className="h-3.5 w-3.5" />
            {ranked.length} on board
          </Badge>
        </div>
      </motion.div>

      <WinnerBurst
        show={showBurst && !!lastRecorded}
        winnerName={lastRecorded?.playerName ?? ''}
        subtitle={
          lastRecorded
            ? `New lap · ${formatLapTimeMs(lastRecorded.lapTimeMs)}`
            : undefined
        }
      />

      {/* Podium */}
      {podium.length > 0 && (
        <LayoutGroup>
          <div className={cn('grid gap-4', tvMode ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-3')}>
            {[1, 0, 2].map((idx) => {
              const row = podium[idx];
              if (!row) {
                return <div key={`empty-${idx}`} className="hidden md:block" />;
              }
              const medals = ['🥇', '🥈', '🥉'];
              const medalIdx = row.rank - 1;
              return (
                <motion.div
                  key={row.player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={cn(
                    'relative rounded-2xl border p-4 text-center backdrop-blur-sm',
                    'bg-gradient-to-b',
                    PODIUM_COLORS[medalIdx],
                    row.rank === 1 && !tvMode && 'md:-mt-4 md:pb-6',
                    tvMode && row.rank === 1 && 'scale-105',
                  )}
                >
                  {!reduced && row.rank === 1 && (
                    <motion.div
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="h-6 w-6 text-amber-300" />
                    </motion.div>
                  )}
                  <div className="text-3xl mb-2">{medals[medalIdx]}</div>
                  <p className={cn('font-bold text-white truncate', tvMode ? 'text-2xl' : 'text-lg')}>
                    {row.player.name}
                  </p>
                  <motion.p
                    key={row.bestLapMs}
                    initial={{ scale: reduced ? 1 : 1.2 }}
                    animate={{ scale: 1 }}
                    className={cn('font-mono font-bold text-emerald-300 mt-2', textScale)}
                  >
                    {formatLapTimeMs(row.bestLapMs)}
                  </motion.p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.attemptCount} attempt{row.attemptCount === 1 ? '' : 's'}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      {/* Record lap (staff) */}
      {!readOnly && !tvMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-white/10 bg-card/30 p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Zap className="h-4 w-4" />
            Record lap time
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lap time (m:ss.ms)</Label>
              <Input
                placeholder="1:23.456"
                value={lapInput}
                onChange={(e) => setLapInput(e.target.value)}
                className="font-mono text-lg"
                onKeyDown={(e) => e.key === 'Enter' && recordLap()}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={recordLap}
                disabled={!selectedPlayerId || !lapInput.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 gap-2"
              >
                <Timer className="h-4 w-4" />
                Record lap
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full leaderboard */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-sm">Live standings</span>
        </div>
        <AnimatePresence mode="popLayout">
          {ranked.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">
              No lap times recorded yet. Fastest lap takes the crown.
            </p>
          ) : (
            <LayoutGroup>
              {ranked.map((row) => (
                <motion.div
                  key={row.player.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration }}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0',
                    row.rank <= 3 && 'bg-emerald-500/5',
                    row.rank === 1 && 'bg-gradient-to-r from-emerald-500/10 to-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs',
                      row.rank === 1
                        ? 'bg-amber-500/30 text-amber-200'
                        : row.rank === 2
                          ? 'bg-slate-400/20 text-slate-200'
                          : row.rank === 3
                            ? 'bg-orange-600/20 text-orange-200'
                            : 'bg-white/5 text-muted-foreground',
                    )}
                  >
                    {row.rank}
                  </span>
                  <span className={cn('flex-1 font-medium truncate', rowScale)}>{row.player.name}</span>
                  <span className={cn('font-mono font-bold text-emerald-300', rowScale)}>
                    {formatLapTimeMs(row.bestLapMs)}
                  </span>
                  {row.rank <= 3 && (
                    <Medal className="h-4 w-4 text-emerald-400/60 shrink-0" />
                  )}
                </motion.div>
              ))}
            </LayoutGroup>
          )}
        </AnimatePresence>
      </div>

      {/* Recent laps ticker (TV) */}
      {tvMode && lapTimes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4"
        >
          <p className="text-xs uppercase tracking-wider text-cyan-300/70 mb-2">Last recorded</p>
          {[...lapTimes]
            .filter((l) => !l.invalidated)
            .slice(-3)
            .reverse()
            .map((lap) => (
              <div key={lap.id} className="flex justify-between py-2 text-lg">
                <span>{lap.playerName}</span>
                <span className="font-mono text-emerald-300">{formatLapTimeMs(lap.lapTimeMs)}</span>
              </div>
            ))}
        </motion.div>
      )}
    </div>
  );
}
