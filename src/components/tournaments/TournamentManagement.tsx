
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
import { Loader2, Info } from 'lucide-react';
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

  // Get tournament format display info
  const getFormatInfo = () => {
    switch (tournament.tournamentFormat) {
      case 'knockout':
        return {
          label: 'Knockout Tournament',
          description: 'Single elimination format',
          color: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'league':
        return {
          label: 'League Tournament', 
          description: 'Round-robin format',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      default:
        return {
          label: 'Unknown Format',
          description: '',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const formatInfo = getFormatInfo();

  return (
    <Card className="bg-gray-950/50 border-gray-800">
      <CardContent className="p-5 sm:p-6">
        {/* Tournament Format Badge */}
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className={formatInfo.color}>
            {formatInfo.label}
          </Badge>
          <span className="text-sm text-gray-400">{formatInfo.description}</span>
          {tournament.tournamentFormat === 'league' && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Info className="h-3 w-3" />
              <span>Every player plays against every other player</span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="matches">Fixtures</TabsTrigger>
          </TabsList>
          
          <TabsContent value="players" className="space-y-4 animate-fade-in">
            <TournamentPlayerSection 
              players={players} 
              setPlayers={setPlayers} 
              matchesExist={matches.length > 0}
              updatePlayerName={updatePlayerName}
              tournamentId={tournament.id}
              maxPlayers={tournament.maxPlayers} // Pass maxPlayers prop
            />
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleGenerateMatches} 
                disabled={players.length < 2 || saving || isLoading || isCompleted}
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                {(saving || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {matches.length > 0 ? 'Regenerate Fixtures' : 'Generate Fixtures'}
              </Button>
            </div>
            {isCompleted && matches.length > 0 && (
              <div className="text-amber-400 text-sm mt-2 text-center">
                Cannot regenerate fixtures for completed tournaments.
              </div>
            )}
            {tournament.tournamentFormat === 'knockout' && players.length > 0 && players.length % 2 !== 0 && (
              <div className="text-orange-400 text-sm mt-2 text-center flex items-center justify-center gap-2">
                <Info className="h-4 w-4" />
                Knockout tournaments require an even number of players. Current: {players.length}
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
              winner={winner}
              runnerUp={runnerUp}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TournamentManagement;
