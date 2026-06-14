import React, { useState, useEffect } from 'react';
import { Tournament, Player, Match, MatchStatus, LapTimeEntry, TournamentFormat } from '@/types/tournament.types';
import TournamentPlayerSection from './TournamentPlayerSection';
import TournamentMatchSection from './TournamentMatchSection';
import FifaLapTimeBoard from './FifaLapTimeBoard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { generateMatches, determineWinner } from '@/services/tournamentService';
import { determineRunnerUp } from '@/services/tournamentHistoryService';
import { advanceWinnerInBracket } from '@/utils/tournament/bracketAdvancement';
import { maybeAppendNextSwissRound } from '@/utils/tournament/formats/swiss';
import { resolveSportTheme } from '@/utils/tournament/sportTheme';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';
import { toast } from 'sonner';
import { Loader2, Info, Users, Trophy, Play, Sparkles, Target, Zap, Timer, CheckCircle2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TournamentManagementProps {
  tournament: Tournament;
  onSave: (updatedTournament: Tournament) => Promise<void>;
  isLoading?: boolean;
  canManage?: boolean;
}

function resolveTournamentStatus(
  tournament: Tournament,
  opts: {
    hasMatches: boolean;
    hasLaps: boolean;
    forcedStatus?: Tournament['status'];
  },
): Tournament['status'] {
  if (opts.forcedStatus) return opts.forcedStatus;
  if (tournament.status === 'completed') return 'completed';

  if (opts.hasLaps || opts.hasMatches || tournament.status === 'in-progress') {
    return 'in-progress';
  }
  return 'upcoming';
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({
  tournament,
  onSave,
  isLoading = false,
  canManage = true,
}) => {
  const [players, setPlayers] = useState<Player[]>(tournament.players || []);
  const [matches, setMatches] = useState<Match[]>(tournament.matches || []);
  const [lapTimes, setLapTimes] = useState<LapTimeEntry[]>(tournament.lapTimes || []);
  const [activeTab, setActiveTab] = useState('players');
  const [saving, setSaving] = useState(false);
  const [winner, setWinner] = useState<Player | undefined>(tournament.winner);
  const [runnerUp, setRunnerUp] = useState<Player | undefined>(tournament.runnerUp);
  const [thirdPlace, setThirdPlace] = useState<Player | undefined>(tournament.thirdPlace);

  const isTimeTrial = isTimeTrialFormat(tournament.tournamentFormat);

  useEffect(() => {
    setPlayers(tournament.players || []);
    setMatches(tournament.matches || []);
    setLapTimes(tournament.lapTimes || []);
    setWinner(tournament.winner);
    setRunnerUp(tournament.runnerUp);
    setThirdPlace(tournament.thirdPlace);

    if (!tournament.winner && (tournament.matches?.length ?? 0) > 0) {
      const inferredWinner = determineWinner(
        tournament.matches,
        tournament.players || [],
        tournament.tournamentFormat,
      );
      if (inferredWinner) {
        setWinner(inferredWinner);
        setRunnerUp(
          determineRunnerUp(tournament.matches, tournament.players || [], tournament.tournamentFormat),
        );
      }
    }
  }, [tournament]);

  const handleGenerateMatches = () => {
    // Ensure we have at least 2 players
    if (players.length < 2) {
      toast.error('You need at least 2 players to generate matches.');
      return;
    }
    
    // Knockout supports odd counts via automatic byes
    const generatedMatches = generateMatches(players, tournament.tournamentFormat, tournament.formatOptions);
    setMatches(generatedMatches);
    setActiveTab('matches');
    
    handleSave(players, generatedMatches, winner, runnerUp);
    toast.success(`${generatedMatches.length} matches generated successfully!`);
  };

  const handleUpdateMatchResult = (
    matchId: string,
    winnerId: string,
    scores?: { score1?: number; score2?: number },
  ) => {
    let updatedMatches = advanceWinnerInBracket(matches, matchId, winnerId, scores);

    if (tournament.tournamentFormat === 'swiss') {
      const totalRounds = tournament.formatOptions?.swissRounds ?? 3;
      updatedMatches = maybeAppendNextSwissRound(players, updatedMatches, totalRounds);
    }

    const updatedWinner = determineWinner(updatedMatches, players, tournament.tournamentFormat);
    const updatedRunnerUp = updatedWinner
      ? determineRunnerUp(updatedMatches, players, tournament.tournamentFormat)
      : undefined;

    setWinner(updatedWinner);
    setRunnerUp(updatedRunnerUp);
    setMatches(updatedMatches);
    handleSave(players, updatedMatches, updatedWinner, updatedRunnerUp);

    const bracketFormats: TournamentFormat[] = ['knockout', 'custom', 'double_elimination'];
    toast.success(
      bracketFormats.includes(tournament.tournamentFormat)
        ? 'Result recorded — winner advanced in bracket'
        : 'Result recorded',
    );
  };

  const handleUpdateMatchSchedule = (matchId: string, date: string, time: string) => {
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          scheduledDate: date,
          scheduledTime: time
        };
      }
      return match;
    });
    
    setMatches(updatedMatches);
    handleSave(players, updatedMatches, winner, runnerUp);
  };

  const handleUpdateMatchStatus = (matchId: string, status: MatchStatus) => {
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          status
        };
      }
      return match;
    });
    
    setMatches(updatedMatches);
    handleSave(players, updatedMatches, winner, runnerUp);
  };

  const handleUpdateMatch = (matchId: string, updates: Partial<Match>) => {
    const updatedMatches = matches.map((match) => {
      if (match.id === matchId) return { ...match, ...updates };
      if (updates.inProgress && match.inProgress) return { ...match, inProgress: false };
      return match;
    });
    
    setMatches(updatedMatches);
    handleSave(players, updatedMatches, winner, runnerUp);
  };

  const handleRegenerateFixtures = (newMatches: Match[]) => {
    setMatches(newMatches);
    handleSave(players, newMatches, winner, runnerUp);
    toast.success('Fixtures regenerated with updated player assignments!');
  };
  
  // Function to update player names across all matches
  const updatePlayerName = (playerId: string, newName: string) => {
    // Update the player list first
    const updatedPlayers = players.map(player => 
      player.id === playerId ? { ...player, name: newName } : player
    );
    setPlayers(updatedPlayers);
    
    // No need to update matches since we reference players by ID
    handleSave(updatedPlayers, matches, winner, runnerUp);
  };

  const handleSave = async (
    currentPlayers: Player[],
    currentMatches: Match[],
    currentWinner?: Player,
    currentRunnerUp?: Player,
    currentThird?: Player,
    currentLaps: LapTimeEntry[] = lapTimes,
    forcedStatus?: Tournament['status'],
  ) => {
    setSaving(true);

    try {
      const updatedTournament: Tournament = {
        ...tournament,
        players: currentPlayers,
        matches: currentMatches,
        lapTimes: currentLaps,
        winner: currentWinner,
        runnerUp: currentRunnerUp,
        thirdPlace: currentThird,
        status: resolveTournamentStatus(tournament, {
          hasMatches: currentMatches.length > 0,
          hasLaps: currentLaps.length > 0,
          forcedStatus,
        }),
      };

      await onSave(updatedTournament);
      if (forcedStatus === 'completed') {
        toast.success('Tournament marked as completed.');
      } else if (forcedStatus === 'in-progress') {
        toast.success('Tournament reopened — you can edit results again.');
      } else {
        toast.success('Tournament saved successfully.');
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast.error('Failed to save tournament changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLapTimesChange = (
    laps: LapTimeEntry[],
    w?: Player,
    r?: Player,
    t?: Player,
  ) => {
    setLapTimes(laps);
    setWinner(w);
    setRunnerUp(r);
    setThirdPlace(t);
    handleSave(players, matches, w, r, t, laps);
  };

  const isCompleted = tournament.status === 'completed';

  const handleMarkComplete = () => {
    if (!canManage) return;
    if (isTimeTrial && !winner) {
      toast.error('Record at least one lap so a leader is set before completing.');
      return;
    }
    const confirmMsg = winner
      ? `Mark "${tournament.name}" as completed? Fixtures and results will be locked.`
      : `Mark "${tournament.name}" as completed? Results will be locked.`;
    if (!window.confirm(confirmMsg)) return;
    void handleSave(players, matches, winner, runnerUp, thirdPlace, lapTimes, 'completed');
  };

  const handleReopen = () => {
    if (!canManage) return;
    if (!window.confirm(`Reopen "${tournament.name}"? You can edit results again.`)) return;
    void handleSave(players, matches, winner, runnerUp, thirdPlace, lapTimes, 'in-progress');
  };

  const sportTheme = resolveSportTheme({
    gameType: tournament.gameType,
    gameVariant: tournament.gameVariant,
    gameTitle: tournament.gameTitle,
    tournamentFormat: tournament.tournamentFormat,
  });

  const getFormatInfo = () => {
    if (sportTheme.kind === 'fifa') {
      return {
        label: 'FIFA Knockout',
        description: 'Football bracket — record scores and winners advance automatically',
        color: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/40',
        icon: Trophy,
      };
    }
    if (sportTheme.kind === 'pool') {
      return {
        label: '8-Ball Knockout',
        description: 'Pool bracket — winners advance to the next round',
        color: 'bg-gradient-to-r from-green-800/20 to-amber-500/20 text-amber-200 border-amber-500/40',
        icon: Target,
      };
    }
    switch (tournament.tournamentFormat) {
      case 'time_trial':
        return {
          label: 'FIFA Time Trial',
          description: 'Fastest lap wins — no bracket',
          color: 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-500/40',
          icon: Timer,
        };
      case 'knockout':
        return {
          label: 'Knockout Tournament',
          description: 'Single elimination format',
          color: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border-red-500/40',
          icon: Target,
        };
      case 'league':
        return {
          label: 'League Tournament',
          description: 'Round-robin format',
          color: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/40',
          icon: Trophy,
        };
      case 'double_elimination':
        return { label: 'Double Elimination', description: 'Winners + losers bracket', color: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/40', icon: Target };
      case 'round_robin':
        return { label: 'Round Robin', description: 'All-play-all', color: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/40', icon: Users };
      case 'swiss':
        return { label: 'Swiss System', description: 'Pairing by score each round', color: 'bg-gradient-to-r from-teal-500/20 to-green-500/20 text-teal-300 border-teal-500/40', icon: Sparkles };
      case 'custom':
        return { label: 'Custom Bracket', description: 'Manual bracket builder', color: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border-violet-500/40', icon: Sparkles };
      default:
        return {
          label: 'Tournament',
          description: '',
          color: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/40',
          icon: Trophy,
        };
    }
  };

  const canGenerateMatches =
    !isTimeTrial &&
    players.length >= 2 &&
    !isCompleted &&
    canManage;

  const formatInfo = getFormatInfo();

  if (isTimeTrial) {
    return (
      <Card className="glass-card border-white/10 text-white shadow-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-4 p-4 theme-inset rounded-xl">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30">
              <Timer className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <Badge variant="outline" className={formatInfo.color}>
                <Sparkles className="h-3 w-3 mr-1" />
                {formatInfo.label}
              </Badge>
              <p className="text-gray-400 text-sm mt-1">{formatInfo.description}</p>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {isCompleted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReopen}
                    disabled={saving || isLoading}
                    className="gap-1.5 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reopen event
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleMarkComplete}
                    disabled={saving || isLoading || (isTimeTrial && !winner)}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark complete
                  </Button>
                )}
              </div>
            )}
          </div>
          {isCompleted ? (
            <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              Event completed — lap board and roster are locked.
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200/90">
              Event stays <span className="font-semibold text-emerald-300">live</span> while you record laps. Mark complete when finished.
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 theme-inset rounded-xl p-1">
              <TabsTrigger value="players" className="gap-2">
                <Users className="h-4 w-4" />
                Players ({players.length})
              </TabsTrigger>
              <TabsTrigger value="laps" className="gap-2">
                <Timer className="h-4 w-4" />
                Lap board
              </TabsTrigger>
            </TabsList>
            <TabsContent value="players" className="space-y-6 animate-fade-in">
              <TournamentPlayerSection
                players={players}
                setPlayers={(p) => {
                  setPlayers(p);
                  handleSave(p, matches, winner, runnerUp, thirdPlace, lapTimes);
                }}
                matchesExist={isCompleted}
                updatePlayerName={(id, name) => {
                  const updated = players.map((pl) => (pl.id === id ? { ...pl, name } : pl));
                  setPlayers(updated);
                  handleSave(updated, matches, winner, runnerUp, thirdPlace, lapTimes);
                }}
                tournamentId={tournament.id}
                maxPlayers={tournament.maxPlayers}
              />
            </TabsContent>
            <TabsContent value="laps" className="animate-fade-in">
              <FifaLapTimeBoard
                tournament={tournament}
                players={players}
                lapTimes={lapTimes}
                onLapTimesChange={canManage && !isCompleted ? handleLapTimesChange : () => {}}
                readOnly={!canManage || isCompleted}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10 text-white shadow-2xl">
      <CardContent className="p-6">
        {/* Tournament Format Badge */}
        <div className="mb-6 flex items-center gap-4 p-4 theme-inset rounded-xl">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
            <formatInfo.icon className="h-6 w-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <Badge variant="outline" className={formatInfo.color}>
              <Sparkles className="h-3 w-3 mr-1" />
              {formatInfo.label}
            </Badge>
            <p className="text-gray-400 text-sm mt-1">{formatInfo.description}</p>
          </div>
          {tournament.tournamentFormat === 'league' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">Every player plays against every other player</span>
            </div>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {isCompleted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopen}
                  disabled={saving || isLoading}
                  className="gap-1.5 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen event
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleMarkComplete}
                  disabled={saving || isLoading}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark complete
                </Button>
              )}
            </div>
          )}
        </div>

        {isCompleted ? (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            Tournament completed — fixtures and results are locked.
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-sm text-purple-200/90">
            Tournament stays <span className="font-semibold text-purple-300">live</span> on TV until you mark it complete.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 theme-inset rounded-xl p-1">
            <TabsTrigger 
              value="players" 
              className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:text-white font-semibold h-10 rounded-lg transition-all duration-200"
            >
              <Users className="h-4 w-4" />
              Players ({players.length})
            </TabsTrigger>
            <TabsTrigger 
              value="matches" 
              className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:text-white font-semibold h-10 rounded-lg transition-all duration-200"
            >
              <Play className="h-4 w-4" />
              Fixtures ({matches.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="players" className="space-y-6 animate-fade-in">
            <TournamentPlayerSection
              players={players}
              setPlayers={(p) => {
                const next = typeof p === 'function' ? p(players) : p;
                setPlayers(next);
                handleSave(next, matches, winner, runnerUp, thirdPlace);
              }}
              matchesExist={isCompleted}
              updatePlayerName={updatePlayerName}
              tournamentId={tournament.id}
              maxPlayers={tournament.maxPlayers}
            />
            
            <div className="flex justify-end pt-6">
              <Button 
                onClick={handleGenerateMatches} 
                disabled={!canGenerateMatches || saving || isLoading}
                className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
                size="lg"
              >
                {(saving || isLoading) && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                <Zap className="mr-3 h-5 w-5" />
                {matches.length > 0 ? 'Regenerate Fixtures' : 'Generate Fixtures'}
              </Button>
            </div>
            
            {/* Validation Messages */}
            {players.length < 2 && (
              <div className="text-center p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-amber-300">
                  <Info className="h-5 w-5" />
                  <span className="font-medium">Add at least 2 players to generate fixtures.</span>
                </div>
              </div>
            )}
            
            {tournament.tournamentFormat === 'knockout' && players.length > 0 && players.length % 2 !== 0 && (
              <div className="text-center p-4 bg-gradient-to-r from-emerald-900/20 to-green-900/20 border border-emerald-600/30 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-emerald-300">
                  <Info className="h-5 w-5" />
                  <span className="font-medium">
                    {players.length} players — bracket will add {Math.pow(2, Math.ceil(Math.log2(players.length))) - players.length} automatic bye{Math.pow(2, Math.ceil(Math.log2(players.length))) - players.length === 1 ? '' : 's'}.
                  </span>
                </div>
              </div>
            )}
            
            {isCompleted && (
              <div className="text-center p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-600/30 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-green-300">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">Tournament completed - fixtures are locked.</span>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="matches" className="animate-fade-in">
            <TournamentMatchSection 
              matches={matches}
              players={players}
              updateMatchResult={handleUpdateMatchResult}
              updateMatchSchedule={handleUpdateMatchSchedule}
              updateMatchStatus={handleUpdateMatchStatus}
              onUpdateMatch={handleUpdateMatch}
              onRegenerateFixtures={handleRegenerateFixtures}
              winner={winner}
              runnerUp={runnerUp}
              onGenerateMatches={handleGenerateMatches}
              canGenerateMatches={canGenerateMatches}
              tournamentFormat={tournament.tournamentFormat}
              gameType={tournament.gameType}
              gameVariant={tournament.gameVariant}
              gameTitle={tournament.gameTitle}
              readOnly={isCompleted || !canManage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TournamentManagement;
