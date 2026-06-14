import React from 'react';
import type { Match, Player, TournamentFormat } from '@/types/tournament.types';
import { computeStandings, isStandingsFormat } from '@/utils/tournament/standings';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentStandingsPanelProps {
  matches: Match[];
  players: Player[];
  tournamentFormat?: TournamentFormat;
  accent?: string;
  compact?: boolean;
}

export default function TournamentStandingsPanel({
  matches,
  players,
  tournamentFormat,
  accent = '#34d399',
  compact = false,
}: TournamentStandingsPanelProps) {
  if (!isStandingsFormat(tournamentFormat)) return null;

  const standings = computeStandings(matches, players);
  if (standings.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <p className="text-xs uppercase tracking-widest text-white/45 px-4 py-2 border-b border-white/10">
        Standings
      </p>
      <div className="divide-y divide-white/5">
        {standings.map((row, index) => (
          <div
            key={row.player.id}
            className={cn(
              'flex items-center gap-3 px-4',
              compact ? 'py-2' : 'py-3',
              index === 0 && row.wins > 0 && 'bg-emerald-500/5',
            )}
          >
            <span
              className={cn(
                'w-7 text-center font-mono font-bold text-sm',
                index === 0 ? 'text-emerald-300' : 'text-white/35',
              )}
            >
              {index + 1}
            </span>
            <span className={cn('flex-1 font-semibold truncate', compact ? 'text-sm' : 'text-base')}>
              {row.player.name}
            </span>
            <span className="flex items-center gap-1.5 font-mono font-bold tabular-nums" style={{ color: accent }}>
              {index === 0 && row.wins > 0 && <Crown className="h-3.5 w-3.5" />}
              {row.wins}W
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
