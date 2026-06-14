
import React, { useMemo, useState } from 'react';
import { Match, Player, MatchStatus, GameType, PoolGameVariant, PS5GameTitle, TournamentFormat } from '@/types/tournament.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Trophy, Plus, Edit, Crown, Award, Radio, Circle } from 'lucide-react';
import TournamentMatchEditor from './TournamentMatchEditor';
import { generateTournamentMatches } from '@/utils/tournamentMatchGeneration';
import { groupMatchesByRound, groupMatchesByBracketSide, sortRounds } from '@/utils/tournament/bracketAdvancement';
import { formatMatchStage, resolveSportTheme } from '@/utils/tournament/sportTheme';
import { isStandingsFormat } from '@/utils/tournament/standings';
import TournamentStandingsPanel from './TournamentStandingsPanel';
import { cn } from '@/lib/utils';

interface TournamentMatchSectionProps {
  matches: Match[];
  players: Player[];
  updateMatchResult: (matchId: string, winnerId: string, scores?: { score1?: number; score2?: number }) => void;
  updateMatchSchedule: (matchId: string, date: string, time: string) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  onUpdateMatch?: (matchId: string, updates: Partial<Match>) => void;
  onRegenerateFixtures?: (newMatches: Match[]) => void;
  winner?: Player;
  runnerUp?: Player;
  onGenerateMatches?: () => void;
  canGenerateMatches?: boolean;
  tournamentFormat?: TournamentFormat;
  gameType?: GameType;
  gameVariant?: PoolGameVariant;
  gameTitle?: PS5GameTitle;
}

function BracketMatchCard({
  match,
  players,
  theme,
  scoreDraft,
  onScoreChange,
  onWin,
  onGoLive,
  onEdit,
}: {
  match: Match;
  players: Player[];
  theme: ReturnType<typeof resolveSportTheme>;
  scoreDraft: { s1: string; s2: string };
  onScoreChange: (s1: string, s2: string) => void;
  onWin: (winnerId: string) => void;
  onGoLive: () => void;
  onEdit: () => void;
}) {
  const getName = (id: string) => {
    if (!id) return 'TBD';
    return players.find((p) => p.id === id)?.name ?? 'TBD';
  };

  const p1 = getName(match.player1Id);
  const p2 = getName(match.player2Id);
  const ready = match.player1Id && match.player2Id && p1 !== 'TBD' && p2 !== 'TBD';
  const p1Won = match.winnerId === match.player1Id;
  const p2Won = match.winnerId === match.player2Id;

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden min-w-[220px] backdrop-blur-sm',
        match.inProgress && 'ring-2',
        match.completed && 'opacity-95',
      )}
      style={{
        borderColor: match.inProgress ? theme.accent : `${theme.primary}44`,
        backgroundColor: `${theme.surface}cc`,
        boxShadow: match.inProgress ? `0 0 24px ${theme.glow}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-white/10 text-[10px]">
        <Badge variant="outline" className="text-[9px] border-white/15 uppercase">
          {formatMatchStage(match.stage)}
        </Badge>
        {match.bye && <span className="text-white/40">BYE</span>}
        {match.inProgress && (
          <span className="flex items-center gap-1 text-red-300 font-bold uppercase tracking-wider">
            <Radio className="h-3 w-3 animate-pulse" /> Live
          </span>
        )}
        <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={onEdit}>
          <Edit className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-2 space-y-1">
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg px-2 py-2',
            p1Won && 'bg-emerald-500/15 border border-emerald-500/30',
            match.completed && !p1Won && match.player1Id && 'opacity-45',
          )}
        >
          <span className="text-sm font-semibold truncate">{p1}</span>
          <span className="font-mono text-sm tabular-nums">{match.completed ? (match.score1 ?? 0) : '—'}</span>
        </div>
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg px-2 py-2',
            p2Won && 'bg-emerald-500/15 border border-emerald-500/30',
            match.completed && !p2Won && match.player2Id && 'opacity-45',
          )}
        >
          <span className="text-sm font-semibold truncate">{p2}</span>
          <span className="font-mono text-sm tabular-nums">{match.completed ? (match.score2 ?? 0) : '—'}</span>
        </div>
      </div>

      {!match.completed && ready && (
        <div className="p-2 pt-0 space-y-2 border-t border-white/5">
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              type="number"
              min={0}
              placeholder="Score"
              value={scoreDraft.s1}
              onChange={(e) => onScoreChange(e.target.value, scoreDraft.s2)}
              className="h-8 text-xs bg-black/40 border-white/15"
            />
            <Input
              type="number"
              min={0}
              placeholder="Score"
              value={scoreDraft.s2}
              onChange={(e) => onScoreChange(scoreDraft.s1, e.target.value)}
              className="h-8 text-xs bg-black/40 border-white/15"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" className="h-8 text-[10px] border-0" style={{ background: theme.primary }} onClick={() => onWin(match.player1Id)}>
              {p1} W
            </Button>
            <Button size="sm" className="h-8 text-[10px] border-0" style={{ background: theme.accent, color: '#0a0a0a' }} onClick={() => onWin(match.player2Id)}>
              {p2} W
            </Button>
          </div>
          {!match.inProgress && (
            <Button size="sm" variant="outline" className="w-full h-7 text-[10px] border-white/15" onClick={onGoLive}>
              <Radio className="h-3 w-3 mr-1" /> Mark live on TV
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const TournamentMatchSection: React.FC<TournamentMatchSectionProps> = ({
  matches,
  players,
  updateMatchResult,
  onUpdateMatch,
  onRegenerateFixtures,
  winner,
  runnerUp,
  onGenerateMatches,
  canGenerateMatches = false,
  tournamentFormat = 'knockout',
  gameType = 'PS5',
  gameVariant,
  gameTitle,
}) => {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { s1: string; s2: string }>>({});

  const theme = useMemo(
    () => resolveSportTheme({ gameType, gameVariant, gameTitle, tournamentFormat }),
    [gameType, gameVariant, gameTitle, tournamentFormat],
  );

  const isKnockout = tournamentFormat === 'knockout' || tournamentFormat === 'custom';
  const isDoubleElim = tournamentFormat === 'double_elimination';
  const isBracketLayout = isKnockout || isDoubleElim;
  const showStandings = isStandingsFormat(tournamentFormat);

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

  const getScoreDraft = (matchId: string) => scoreDrafts[matchId] ?? { s1: '', s2: '' };

  const handleWin = (match: Match, winnerId: string) => {
    const draft = getScoreDraft(match.id);
    const s1 = draft.s1 !== '' ? Number(draft.s1) : winnerId === match.player1Id ? 1 : 0;
    const s2 = draft.s2 !== '' ? Number(draft.s2) : winnerId === match.player2Id ? 1 : 0;
    updateMatchResult(match.id, winnerId, { score1: s1, score2: s2 });
  };

  const handleGoLive = (matchId: string) => {
    matches.forEach((m) => {
      if (m.inProgress && m.id !== matchId) {
        onUpdateMatch?.(m.id, { inProgress: false });
      }
    });
    onUpdateMatch?.(matchId, { inProgress: true, status: 'scheduled' });
  };

  if (matches.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed py-12 text-center space-y-4"
        style={{ borderColor: `${theme.primary}55` }}
      >
        <Trophy className="h-10 w-10 mx-auto opacity-50" style={{ color: theme.accent }} />
        <div>
          <h3 className="font-semibold text-white">No fixtures yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Generate the {theme.label.toLowerCase()} bracket once you have at least 2 players.
          </p>
        </div>
        {canGenerateMatches && onGenerateMatches && (
          <Button onClick={onGenerateMatches} className="gap-2 border-0" style={{ background: theme.primary }}>
            <Plus className="h-4 w-4" />
            Generate fixtures
          </Button>
        )}
      </div>
    );
  }

  const groups = groupMatchesByRound(matches);
  const rounds = sortRounds(groups);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-4 flex flex-wrap items-center gap-3"
        style={{ borderColor: `${theme.primary}44`, background: `linear-gradient(135deg, ${theme.surface}, transparent)` }}
      >
        <div
          className="h-12 w-12 rounded-xl grid place-items-center border"
          style={{ borderColor: `${theme.accent}55`, background: `${theme.primary}22` }}
        >
          {theme.icon === 'pool' ? (
            <Circle className="h-6 w-6" style={{ color: theme.accent }} />
          ) : (
            <Trophy className="h-6 w-6" style={{ color: theme.accent }} />
          )}
        </div>
        <div>
          <p className="font-bold text-white">{theme.label}</p>
          <p className="text-xs text-white/50">{theme.subtitle}</p>
        </div>
        <Badge className="ml-auto border-0" style={{ background: `${theme.primary}33`, color: theme.accent }}>
          {matches.filter((m) => m.completed).length}/{matches.length} played
        </Badge>
      </div>

      {showStandings && (
        <TournamentStandingsPanel
          matches={matches}
          players={players}
          tournamentFormat={tournamentFormat}
          accent={theme.accent}
        />
      )}

      {winner && (
        <div
          className="flex flex-wrap gap-3 rounded-xl border p-4"
          style={{ borderColor: `${theme.accent}44`, background: `${theme.primary}11` }}
        >
          <div className="flex items-center gap-3 min-w-[140px] flex-1">
            <Crown className="h-8 w-8" style={{ color: theme.accent }} />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/50">Champion</p>
              <p className="font-bold text-white text-lg">{winner.name}</p>
            </div>
          </div>
          {runnerUp && (
            <div className="flex items-center gap-3 min-w-[140px] flex-1 border-l border-white/10 pl-4">
              <Award className="h-6 w-6 text-white/60" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/50">Runner-up</p>
                <p className="font-semibold text-white/90">{runnerUp.name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isDoubleElim ? (
        <div className="space-y-6">
          {(
            [
              { key: 'winners', label: 'Winners bracket', side: 'winners' },
              { key: 'losers', label: 'Losers bracket', side: 'losers' },
              { key: 'grand_final', label: 'Grand final', side: 'grand_final' },
            ] as const
          ).map(({ key, label, side }) => {
            const sideMatches = groupMatchesByBracketSide(matches)[side] ?? [];
            if (sideMatches.length === 0) return null;
            const sideGroups = groupMatchesByRound(sideMatches);
            const sideRounds = sortRounds(sideGroups);
            return (
              <div key={key} className="space-y-3">
                <p className="text-sm font-bold uppercase tracking-widest px-1" style={{ color: theme.accent }}>
                  {label}
                </p>
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-6 min-w-max px-1">
                    {sideRounds.map((round) => (
                      <div key={round} className="flex flex-col gap-3 min-w-[240px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-center text-white/50">
                          Round {round}
                        </p>
                        {sideGroups[round].map((match) =>
                          editingMatchId === match.id ? (
                            <div key={match.id} className="rounded-xl border border-white/15 bg-black/30 p-3">
                              <TournamentMatchEditor
                                match={match}
                                players={players}
                                onSave={handleEditMatch}
                                onCancel={() => setEditingMatchId(null)}
                              />
                            </div>
                          ) : (
                            <BracketMatchCard
                              key={match.id}
                              match={match}
                              players={players}
                              theme={theme}
                              scoreDraft={getScoreDraft(match.id)}
                              onScoreChange={(s1, s2) =>
                                setScoreDrafts((prev) => ({ ...prev, [match.id]: { s1, s2 } }))
                              }
                              onWin={(winnerId) => handleWin(match, winnerId)}
                              onGoLive={() => handleGoLive(match.id)}
                              onEdit={() => setEditingMatchId(match.id)}
                            />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : isBracketLayout ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-6 min-w-max px-1">
            {rounds.map((round) => (
              <div key={round} className="flex flex-col gap-3 min-w-[240px]">
                <p className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: theme.accent }}>
                  Round {round}
                </p>
                {groups[round].map((match) =>
                  editingMatchId === match.id ? (
                    <div key={match.id} className="rounded-xl border border-white/15 bg-black/30 p-3">
                      <TournamentMatchEditor
                        match={match}
                        players={players}
                        onSave={handleEditMatch}
                        onCancel={() => setEditingMatchId(null)}
                      />
                    </div>
                  ) : (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      players={players}
                      theme={theme}
                      scoreDraft={getScoreDraft(match.id)}
                      onScoreChange={(s1, s2) =>
                        setScoreDrafts((prev) => ({ ...prev, [match.id]: { s1, s2 } }))
                      }
                      onWin={(winnerId) => handleWin(match, winnerId)}
                      onGoLive={() => handleGoLive(match.id)}
                      onEdit={() => setEditingMatchId(match.id)}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        rounds.map((round) => (
          <div key={round} className="space-y-2">
            <p className="text-sm font-semibold text-white px-1">Round {round}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups[round].map((match) =>
                editingMatchId === match.id ? (
                  <div key={match.id} className="rounded-xl border border-white/15 bg-black/20 p-3 sm:col-span-2">
                    <TournamentMatchEditor
                      match={match}
                      players={players}
                      onSave={handleEditMatch}
                      onCancel={() => setEditingMatchId(null)}
                    />
                  </div>
                ) : (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    players={players}
                    theme={theme}
                    scoreDraft={getScoreDraft(match.id)}
                    onScoreChange={(s1, s2) =>
                      setScoreDrafts((prev) => ({ ...prev, [match.id]: { s1, s2 } }))
                    }
                    onWin={(winnerId) => handleWin(match, winnerId)}
                    onGoLive={() => handleGoLive(match.id)}
                    onEdit={() => setEditingMatchId(match.id)}
                  />
                ),
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TournamentMatchSection;
