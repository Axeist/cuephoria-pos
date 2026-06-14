import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Timer,
  Trophy,
  Zap,
  Medal,
  Flag,
  Sparkles,
  Play,
  Square,
  Keyboard,
  Pencil,
  Check,
  X,
  Trash2,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { LapTimeEntry, Player, Tournament } from '@/types/tournament.types';
import {
  formatLapTimeMs,
  parseAndValidateLapTimeInput,
  validateLapTimeMs,
} from '@/types/tournament.types';
import { rankPlayersByLapTime } from '@/utils/tournament/lapTimeRanking';
import { generateId } from '@/utils/pos.utils';
import { WinnerBurst } from './animations/WinnerBurst';
import { useTournamentMotion } from './animations/TournamentMotionProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

type EntryMode = 'stopwatch' | 'manual';

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
  const [entryMode, setEntryMode] = useState<EntryMode>('stopwatch');
  const [lapInput, setLapInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [lastRecorded, setLastRecorded] = useState<LapTimeEntry | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const [lapRunning, setLapRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [editingLapId, setEditingLapId] = useState<string | null>(null);
  const [editLapInput, setEditLapInput] = useState('');
  const [editLapError, setEditLapError] = useState('');
  const lapStartRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const trackName = tournament.formatOptions?.trackName ?? 'Time Trial';
  const maxAttempts = tournament.formatOptions?.maxAttempts ?? 99;
  const bestLapCount = tournament.formatOptions?.bestLapCount ?? 1;

  const ranked = useMemo(
    () => rankPlayersByLapTime(players, lapTimes, bestLapCount),
    [players, lapTimes, bestLapCount],
  );

  const podium = ranked.slice(0, 3);
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const attemptsFor = (playerId: string) =>
    lapTimes.filter((l) => l.playerId === playerId && !l.invalidated).length;

  const validLaps = useMemo(
    () =>
      [...lapTimes]
        .filter((l) => !l.invalidated)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [lapTimes],
  );

  const applyLapTimes = (next: LapTimeEntry[], flashEntry?: LapTimeEntry) => {
    const nextRanked = rankPlayersByLapTime(players, next, bestLapCount);
    if (flashEntry) {
      setLastRecorded(flashEntry);
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 2500);
    }
    onLapTimesChange(
      next,
      nextRanked[0]?.player,
      nextRanked[1]?.player,
      nextRanked[2]?.player,
    );
  };

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const commitLap = (ms: number, player: Player) => {
    const check = validateLapTimeMs(ms);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    const attempts = attemptsFor(player.id);
    if (attempts >= maxAttempts) {
      toast.error(`${player.name} has used all ${maxAttempts} attempts.`);
      return;
    }

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
    setLapInput('');
    setInputError('');
    applyLapTimes(next, entry);
    toast.success(`${player.name} · ${formatLapTimeMs(ms)}`);
  };

  const startEditLap = (lap: LapTimeEntry) => {
    setEditingLapId(lap.id);
    setEditLapInput(formatLapTimeMs(lap.lapTimeMs));
    setEditLapError('');
  };

  const cancelEditLap = () => {
    setEditingLapId(null);
    setEditLapInput('');
    setEditLapError('');
  };

  const saveEditLap = (lapId: string) => {
    const parsed = parseAndValidateLapTimeInput(editLapInput);
    if ('error' in parsed) {
      setEditLapError(parsed.error);
      toast.error(parsed.error);
      return;
    }

    const lap = lapTimes.find((l) => l.id === lapId);
    if (!lap) return;

    const next = lapTimes.map((l) =>
      l.id === lapId
        ? { ...l, lapTimeMs: parsed.ms, recordedAt: new Date().toISOString() }
        : l,
    );
    cancelEditLap();
    applyLapTimes(next);
    toast.success(`Updated ${lap.playerName} · ${formatLapTimeMs(parsed.ms)}`);
  };

  const deleteLap = (lapId: string) => {
    const lap = lapTimes.find((l) => l.id === lapId);
    if (!lap) return;
    if (!window.confirm(`Remove lap ${formatLapTimeMs(lap.lapTimeMs)} for ${lap.playerName}?`)) return;

    const next = lapTimes.filter((l) => l.id !== lapId);
    if (editingLapId === lapId) cancelEditLap();
    applyLapTimes(next);
    toast.success('Lap removed');
  };

  const startLap = () => {
    if (!selectedPlayer) {
      toast.error('Select a player first.');
      return;
    }
    if (attemptsFor(selectedPlayer.id) >= maxAttempts) {
      toast.error(`${selectedPlayer.name} has no attempts left.`);
      return;
    }
    if (lapRunning) return;

    lapStartRef.current = Date.now();
    setLapRunning(true);
    setElapsedMs(0);
    tickRef.current = window.setInterval(() => {
      if (lapStartRef.current) {
        setElapsedMs(Date.now() - lapStartRef.current);
      }
    }, 47);
  };

  const stopLap = () => {
    if (!lapRunning || !selectedPlayer || lapStartRef.current === null) return;

    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const ms = Date.now() - lapStartRef.current;
    lapStartRef.current = null;
    setLapRunning(false);
    setElapsedMs(0);
    commitLap(ms, selectedPlayer);
  };

  const recordManualLap = () => {
    if (!selectedPlayer) {
      toast.error('Select a player first.');
      return;
    }
    const parsed = parseAndValidateLapTimeInput(lapInput);
    if ('error' in parsed) {
      setInputError(parsed.error);
      toast.error(parsed.error);
      return;
    }
    setInputError('');
    commitLap(parsed.ms, selectedPlayer);
  };

  const textScale = tvMode ? 'text-4xl md:text-6xl' : 'text-2xl md:text-3xl';
  const rowScale = tvMode ? 'text-lg md:text-xl' : 'text-sm';

  return (
    <div className={cn('space-y-5', tvMode && 'min-h-screen p-4 md:p-8')}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-black/40 to-cyan-950/30 p-5"
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
        <div className="relative flex flex-wrap items-center justify-between gap-3">
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
            {ranked.length} ranked · {lapTimes.filter((l) => !l.invalidated).length} laps
          </Badge>
        </div>
      </motion.div>

      <WinnerBurst
        show={showBurst && !!lastRecorded}
        winnerName={lastRecorded?.playerName ?? ''}
        subtitle={
          lastRecorded ? `Lap recorded · ${formatLapTimeMs(lastRecorded.lapTimeMs)}` : undefined
        }
      />

      {podium.length > 0 && (
        <LayoutGroup>
          <div className={cn('grid gap-3', tvMode ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
            {[1, 0, 2].map((idx) => {
              const row = podium[idx];
              if (!row) return <div key={`empty-${idx}`} className="hidden sm:block" />;
              const medals = ['🥇', '🥈', '🥉'];
              const medalIdx = row.rank - 1;
              return (
                <motion.div
                  key={row.player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'rounded-xl border p-3 text-center',
                    'bg-gradient-to-b',
                    PODIUM_COLORS[medalIdx],
                    row.rank === 1 && !tvMode && 'sm:-mt-2',
                  )}
                >
                  <div className="text-2xl mb-1">{medals[medalIdx]}</div>
                  <p className="font-bold text-white truncate text-base">{row.player.name}</p>
                  <p className={cn('font-mono font-bold text-emerald-300 mt-1', textScale)}>
                    {formatLapTimeMs(row.bestLapMs)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {row.attemptCount} lap{row.attemptCount === 1 ? '' : 's'}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      {!readOnly && !tvMode && (
        <div className="rounded-xl border border-white/10 bg-card/40 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Zap className="h-4 w-4" />
              Record lap
            </div>
            <div className="flex rounded-lg border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setEntryMode('stopwatch')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors',
                  entryMode === 'stopwatch'
                    ? 'bg-emerald-600 text-white'
                    : 'text-muted-foreground hover:text-white',
                )}
              >
                <Play className="h-3 w-3" />
                Stopwatch
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('manual')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors',
                  entryMode === 'manual'
                    ? 'bg-emerald-600 text-white'
                    : 'text-muted-foreground hover:text-white',
                )}
              >
                <Keyboard className="h-3 w-3" />
                Type time
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Tap player</Label>
            <div className="flex flex-wrap gap-2">
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add players on the Players tab first.</p>
              ) : (
                players.map((p) => {
                  const attempts = attemptsFor(p.id);
                  const atLimit = attempts >= maxAttempts;
                  const best = ranked.find((r) => r.player.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={atLimit || lapRunning}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm transition-all min-w-[120px]',
                        selectedPlayerId === p.id
                          ? 'border-emerald-400 bg-emerald-500/20 text-white ring-1 ring-emerald-400/50'
                          : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white',
                        atLimit && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      <span className="font-medium block truncate">{p.name}</span>
                      <span className="text-[10px] block mt-0.5">
                        {best ? formatLapTimeMs(best.bestLapMs) : 'No lap'} · {attempts}/{maxAttempts}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {entryMode === 'stopwatch' ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-emerald-300/70 uppercase tracking-wide mb-1">
                    {lapRunning ? 'Lap in progress' : 'Ready'}
                  </p>
                  <p
                    className={cn(
                      'font-mono font-bold tabular-nums',
                      lapRunning ? 'text-4xl text-emerald-300' : 'text-2xl text-white/50',
                    )}
                  >
                    {formatLapTimeMs(lapRunning ? elapsedMs : 0)}
                  </p>
                  {selectedPlayer && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedPlayer.name}
                      {lapRunning ? ' — press Stop when they finish' : ' — press Start lap'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!lapRunning ? (
                    <Button
                      size="lg"
                      onClick={startLap}
                      disabled={!selectedPlayerId || players.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-500 gap-2 min-w-[130px]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Start lap
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={stopLap}
                      className="bg-red-600 hover:bg-red-500 gap-2 min-w-[130px]"
                    >
                      <Square className="h-4 w-4 fill-current" />
                      Stop & save
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="lap-manual">Lap time</Label>
                <Input
                  id="lap-manual"
                  placeholder="1:23.456 or 83.5"
                  value={lapInput}
                  onChange={(e) => {
                    setLapInput(e.target.value);
                    setInputError('');
                  }}
                  className={cn('font-mono text-lg', inputError && 'border-red-500/50')}
                  onKeyDown={(e) => e.key === 'Enter' && recordManualLap()}
                />
                <p className="text-[11px] text-muted-foreground">
                  Format: minutes:seconds.millis (1:23.456) or seconds (83.5). 15s – 15min.
                </p>
                {inputError && <p className="text-xs text-red-400">{inputError}</p>}
              </div>
              <div className="flex items-end">
                <Button
                  onClick={recordManualLap}
                  disabled={!selectedPlayerId || !lapInput.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 gap-2"
                >
                  <Timer className="h-4 w-4" />
                  Save lap
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-sm">Standings</span>
        </div>
        <AnimatePresence mode="popLayout">
          {ranked.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              No laps yet. Select a player and hit Start lap.
            </p>
          ) : (
            <LayoutGroup>
              {ranked.map((row) => (
                <motion.div
                  key={row.player.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0',
                    row.rank <= 3 && 'bg-emerald-500/5',
                  )}
                >
                  <span
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0',
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
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {row.attemptCount} lap{row.attemptCount === 1 ? '' : 's'}
                  </span>
                  <span className={cn('font-mono font-bold text-emerald-300 shrink-0', rowScale)}>
                    {formatLapTimeMs(row.bestLapMs)}
                  </span>
                  {row.rank <= 3 && <Medal className="h-3.5 w-3.5 text-emerald-400/60 shrink-0" />}
                </motion.div>
              ))}
            </LayoutGroup>
          )}
        </AnimatePresence>
      </div>

      {!readOnly && !tvMode && validLaps.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center gap-2">
            <List className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-sm">All laps</span>
            <span className="text-xs text-muted-foreground ml-auto">Tap edit to fix a time</span>
          </div>
          <div className="divide-y divide-white/5">
            {validLaps.map((lap) => {
              const isEditing = editingLapId === lap.id;
              return (
                <div
                  key={lap.id}
                  className={cn(
                    'flex flex-wrap items-center gap-2 px-3 py-2.5',
                    isEditing && 'bg-cyan-500/5',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{lap.playerName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Lap {lap.lapNumber ?? '—'}
                      {lap.trackName ? ` · ${lap.trackName}` : ''}
                    </p>
                  </div>
                  {isEditing ? (
                    <>
                      <Input
                        value={editLapInput}
                        onChange={(e) => {
                          setEditLapInput(e.target.value);
                          setEditLapError('');
                        }}
                        className={cn('font-mono h-8 w-[120px] text-sm', editLapError && 'border-red-500/50')}
                        placeholder="1:23.456"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditLap(lap.id);
                          if (e.key === 'Escape') cancelEditLap();
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-400"
                        onClick={() => saveEditLap(lap.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={cancelEditLap}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-sm font-semibold text-emerald-300 tabular-nums">
                        {formatLapTimeMs(lap.lapTimeMs)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-white"
                        onClick={() => startEditLap(lap)}
                        title="Edit lap time"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        onClick={() => deleteLap(lap.id)}
                        title="Delete lap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {editLapError && editingLapId && (
            <p className="px-3 py-2 text-xs text-red-400 border-t border-white/5">{editLapError}</p>
          )}
        </div>
      )}

      {tvMode && lapTimes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4"
        >
          <p className="text-xs uppercase tracking-wider text-cyan-300/70 mb-2">Recent laps</p>
          {[...lapTimes]
            .filter((l) => !l.invalidated)
            .slice(-5)
            .reverse()
            .map((lap) => (
              <div key={lap.id} className="flex justify-between py-1.5 text-base border-b border-white/5 last:border-0">
                <span>{lap.playerName}</span>
                <span className="font-mono text-emerald-300">{formatLapTimeMs(lap.lapTimeMs)}</span>
              </div>
            ))}
        </motion.div>
      )}
    </div>
  );
}
