
import React, { useState } from 'react';
import { Match, Player, MatchStatus } from '@/types/tournament.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, Plus, Edit, Crown, Award } from 'lucide-react';
import { format } from 'date-fns';
import TournamentMatchEditor from './TournamentMatchEditor';
import { generateTournamentMatches } from '@/utils/tournamentMatchGeneration';
import { cn } from '@/lib/utils';

interface TournamentMatchSectionProps {
  matches: Match[];
  players: Player[];
  updateMatchResult: (matchId: string, winnerId: string) => void;
  updateMatchSchedule: (matchId: string, date: string, time: string) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  onUpdateMatch?: (matchId: string, updates: Partial<Match>) => void;
  onRegenerateFixtures?: (newMatches: Match[]) => void;
  winner?: Player;
  runnerUp?: Player;
  onGenerateMatches?: () => void;
  canGenerateMatches?: boolean;
  tournamentFormat?: 'knockout' | 'league';
}

const TournamentMatchSection: React.FC<TournamentMatchSectionProps> = ({
  matches,
  players,
  updateMatchResult,
  updateMatchSchedule,
  updateMatchStatus,
  onUpdateMatch,
  onRegenerateFixtures,
  winner,
  runnerUp,
  onGenerateMatches,
  canGenerateMatches = false,
  tournamentFormat = 'knockout',
}) => {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const getPlayerName = (playerId: string) => {
    if (!playerId) return 'TBD';
    const player = players.find((p) => p.id === playerId);
    return player ? player.name : 'TBD';
  };

  const formatStage = (stage: string) => {
    switch (stage) {
      case 'final':
        return 'Final';
      case 'semi_final':
        return 'Semi-final';
      case 'quarter_final':
        return 'Quarter-final';
      default:
        return 'Match';
    }
  };

  const handleEditMatch = (matchId: string, updates: Partial<Match>) => {
    if (onUpdateMatch) {
      const originalMatch = matches.find((m) => m.id === matchId);
      if (
        originalMatch &&
        (updates.player1Id !== originalMatch.player1Id || updates.player2Id !== originalMatch.player2Id)
      ) {
        if (onRegenerateFixtures) {
          const newMatches = generateTournamentMatches(players, tournamentFormat);
          const updatedMatches = newMatches.map((newMatch) => {
            const existingMatch = matches.find((m) => m.id === newMatch.id);
            if (existingMatch?.winnerId && existingMatch.completed) return existingMatch;
            if (newMatch.id === matchId) return { ...newMatch, ...updates };
            return newMatch;
          });
          onRegenerateFixtures(updatedMatches);
        }
      } else {
        onUpdateMatch(matchId, updates);
      }
    }
    setEditingMatchId(null);
  };

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 py-12 text-center space-y-4">
        <Trophy className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
        <div>
          <h3 className="font-semibold text-white">No fixtures yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Generate the bracket from the Players tab once you have at least 2 players.
          </p>
        </div>
        {canGenerateMatches && onGenerateMatches && (
          <Button onClick={onGenerateMatches} className="gap-2">
            <Plus className="h-4 w-4" />
            Generate fixtures
          </Button>
        )}
      </div>
    );
  }

  const matchesByRound = matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>,
  );

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {winner && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3 min-w-[140px] flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <Crown className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-amber-400/80">Champion</p>
              <p className="font-bold text-white">{winner.name}</p>
            </div>
          </div>
          {runnerUp && (
            <div className="flex items-center gap-3 min-w-[140px] flex-1 border-l border-white/10 pl-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                <Award className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Runner-up</p>
                <p className="font-semibold text-white/90">{runnerUp.name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {rounds.map((round) => (
        <div key={round} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-semibold text-white">Round {round}</span>
            {rounds.length > 1 && round === rounds[rounds.length - 1] && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                Final round
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              · {matchesByRound[round].length} match{matchesByRound[round].length === 1 ? '' : 'es'}
            </span>
          </div>

          <div className="space-y-2">
            {matchesByRound[round].map((match) => {
              if (editingMatchId === match.id) {
                return (
                  <div key={match.id} className="rounded-xl border border-white/15 bg-black/20 p-3">
                    <TournamentMatchEditor
                      match={match}
                      players={players}
                      onSave={handleEditMatch}
                      onCancel={() => setEditingMatchId(null)}
                    />
                  </div>
                );
              }

              const p1 = getPlayerName(match.player1Id);
              const p2 = getPlayerName(match.player2Id);
              const ready = match.player1Id && match.player2Id && p1 !== 'TBD' && p2 !== 'TBD';
              const dateLabel = match.scheduledDate
                ? format(new Date(match.scheduledDate), 'MMM d')
                : '—';

              return (
                <div
                  key={match.id}
                  className={cn(
                    'rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden',
                    match.completed && 'border-emerald-500/20',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2 bg-black/20">
                    <Badge variant="outline" className="text-[10px] font-normal border-white/15">
                      {formatStage(match.stage)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-normal capitalize',
                        match.status === 'completed'
                          ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                          : match.status === 'cancelled'
                            ? 'border-red-500/40 text-red-300'
                            : 'border-blue-500/30 text-blue-300',
                      )}
                    >
                      {match.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground ml-auto">
                      <Calendar className="h-3 w-3" />
                      {dateLabel}
                      <Clock className="h-3 w-3 ml-1" />
                      {match.scheduledTime || '—'}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-white"
                      onClick={() => setEditingMatchId(match.id)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-3 min-h-[52px]',
                        match.winnerId === match.player1Id && 'bg-emerald-500/10',
                      )}
                    >
                      <span className="font-medium text-sm truncate">{p1}</span>
                      {match.winnerId === match.player1Id && (
                        <Badge className="text-[10px] bg-emerald-600/80 shrink-0">W</Badge>
                      )}
                    </div>
                    <div className="flex items-center px-2 text-[10px] font-bold text-muted-foreground border-x border-white/5">
                      VS
                    </div>
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-3 min-h-[52px]',
                        match.winnerId === match.player2Id && 'bg-emerald-500/10',
                      )}
                    >
                      <span className="font-medium text-sm truncate">{p2}</span>
                      {match.winnerId === match.player2Id && (
                        <Badge className="text-[10px] bg-emerald-600/80 shrink-0">W</Badge>
                      )}
                    </div>
                  </div>

                  {!match.completed && ready && (
                    <div className="grid grid-cols-2 gap-2 p-2 border-t border-white/5 bg-black/10">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs truncate"
                        onClick={() => updateMatchResult(match.id, match.player1Id)}
                      >
                        <Trophy className="h-3 w-3 mr-1 shrink-0" />
                        {p1} wins
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs truncate"
                        onClick={() => updateMatchResult(match.id, match.player2Id)}
                      >
                        <Trophy className="h-3 w-3 mr-1 shrink-0" />
                        {p2} wins
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentMatchSection;
