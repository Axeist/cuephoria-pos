import React, { useState, useEffect } from 'react';
import { Tournament, Player, Match, MatchStatus } from '@/types/tournament.types';
import TournamentPlayerSection from './TournamentPlayerSection';
import TournamentMatchSection from './TournamentMatchSection';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { generateMatches, determineWinner } from '@/services/tournamentService';
import { determineRunnerUp } from '@/services/tournamentHistoryService';
import { toast } from 'sonner';
import { Loader2, Info, Users, Trophy, Play, Sparkles, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TournamentManagementProps {
  tournament: Tournament;
  onSave: (updatedTournament: Tournament) => Promise<void>;
  isLoading?: boolean;
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({
  tournament,
  onSave,
  isLoading = false
}) => {
  const [players, setPlayers] = useState<Player[]>(tournament.players || []);
  const [matches, setMatches] = useState<Match[]>(tournament.matches || []);
  const [activeTab, setActiveTab] = useState('players');
  const [saving, setSaving] = useState(false);
  const [winner, setWinner] = useState<Player | undefined>(tournament.winner);
  const [runnerUp, setRunnerUp] = useState<Player | undefined>(tournament.runnerUp);

  useEffect(() => {
    setPlayers(tournament.players || []);
    setMatches(tournament.matches || []);
    setWinner(tournament.winner);
    setRunnerUp(tournament.runnerUp);
  }, [tournament]);

  const handleGenerateMatches = () => {
    // Ensure we have at least 2 players
    if (players.length < 2) {
      toast.error('You need at least 2 players to generate matches.');
      return;
    }
    
    // For knockout tournaments, we need an even number of players
    if (tournament.tournamentFormat === 'knockout' && players.length % 2 !== 0) {
      toast.error('Knockout tournaments require an even number of players.');
      return;
    }

    const generatedMatches = generateMatches(players, tournament.tournamentFormat);
    setMatches(generatedMatches);
    setActiveTab('matches');
    
    handleSave(players, generatedMatches, winner, runnerUp);
    toast.success(`${generatedMatches.length} matches generated successfully!`);
  };

  const handleUpdateMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = [...matches];
    const matchIndex = updatedMatches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) return;
    
    // Update the current match
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      winnerId,
      completed: true,
      status: 'completed' as MatchStatus
    };
    
    // Find and update the next match if it exists
    const currentMatch = updatedMatches[matchIndex];
    if (currentMatch.nextMatchId) {
      const nextMatchIndex = updatedMatches.findIndex(m => m.id === currentMatch.nextMatchId);
      
      if (nextMatchIndex !== -1) {
        const nextMatch = updatedMatches[nextMatchIndex];
        
        // Determine which player slot to update in the next match
        if (nextMatch.player1Id === '') {
          updatedMatches[nextMatchIndex] = {
            ...nextMatch,
            player1Id: winnerId
          };
        } else if (nextMatch.player2Id === '') {
          updatedMatches[nextMatchIndex] = {
            ...nextMatch,
            player2Id: winnerId
          };
        }
      }
    }
    
    // Determine if we have a tournament winner and runner-up
    const updatedWinner = determineWinner(updatedMatches, players);
    const updatedRunnerUp = updatedWinner ? determineRunnerUp(updatedMatches, players) : undefined;
    
    setWinner(updatedWinner);
    setRunnerUp(updatedRunnerUp);
    setMatches(updatedMatches);
    handleSave(players, updatedMatches, updatedWinner, updatedRunnerUp);
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
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          ...updates
        };
      }
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
    currentRunnerUp?: Player
  ) => {
    setSaving(true);
    
    try {
      const updatedTournament: Tournament = {
        ...tournament,
        players: currentPlayers,
        matches: currentMatches,
        winner: currentWinner,
        runnerUp: currentRunnerUp,
        status: currentWinner ? 'completed' : currentMatches.length > 0 ? 'in-progress' : 'upcoming'
      };
      
      await onSave(updatedTournament);
      toast.success('Tournament saved successfully.');
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast.error('Failed to save tournament changes.');
    } finally {
      setSaving(false);
    }
  };

  // Check if tournament is completed
  const isCompleted = tournament.status === 'completed' || !!winner;
  
  // Check if we can generate matches
  const canGenerateMatches = players.length >= 2 && 
    (tournament.tournamentFormat !== 'knockout' || players.length % 2 === 0) &&
    !isCompleted;

  // Get tournament format display info
  const getFormatInfo = () => {
    switch (tournament.tournamentFormat) {
      case 'knockout':
        return {
          label: 'Knockout Tournament',
          description: 'Single elimination format',
          color: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border-red-500/40',
          icon: Target
        };
      case 'league':
        return {
          label: 'League Tournament', 
          description: 'Round-robin format',
          color: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/40',
          icon: Trophy
        };
      default:
        return {
          label: 'Unknown Format',
          description: '',
          color: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/40',
          icon: Trophy
        };
    }
  };

  const formatInfo = getFormatInfo();

  return (
    <Card className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 border-gray-800/60 shadow-2xl backdrop-blur-sm">
      <CardContent className="p-6">
        {/* Tournament Format Badge */}
        <div className="mb-6 flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-700/60">
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-gray-800/60 border border-gray-700/60 rounded-xl">
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
              setPlayers={setPlayers} 
              matchesExist={matches.length > 0}
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
              <div className="text-center p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-amber-300">
                  <Info className="h-5 w-5" />
                  <span className="font-medium">Knockout tournaments require an even number of players. Current: {players.length}</span>
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
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TournamentManagement;
