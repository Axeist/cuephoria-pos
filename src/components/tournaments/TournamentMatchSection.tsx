
import React, { useState } from 'react';
import { Match, Player, MatchStatus } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, Users, Plus, Edit, Play, Settings } from 'lucide-react';
import { format } from 'date-fns';
import TournamentMatchEditor from './TournamentMatchEditor';
import { generateTournamentMatches } from '@/utils/tournamentMatchGeneration';

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
  tournamentFormat = 'knockout'
}) => {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'final':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'semi_final':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'quarter_final':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'TBD';
  };

  const formatStage = (stage: string) => {
    switch (stage) {
      case 'final':
        return 'Final';
      case 'semi_final':
        return 'Semi-Final';
      case 'quarter_final':
        return 'Quarter-Final';
      default:
        return 'Match';
    }
  };

  const handleEditMatch = (matchId: string, updates: Partial<Match>) => {
    if (onUpdateMatch) {
      // Check if players changed and regenerate fixtures if needed
      const originalMatch = matches.find(m => m.id === matchId);
      if (originalMatch && (
        updates.player1Id !== originalMatch.player1Id || 
        updates.player2Id !== originalMatch.player2Id
      )) {
        // Player change detected - regenerate entire fixture
        if (onRegenerateFixtures) {
          const newMatches = generateTournamentMatches(players, tournamentFormat);
          // Apply the manual changes to the specific match
          const updatedMatches = newMatches.map(match => 
            match.id === matchId ? { ...match, ...updates } : match
          );
          onRegenerateFixtures(updatedMatches);
        }
      } else {
        // Simple update (date/time only)
        onUpdateMatch(matchId, updates);
        if (updates.scheduledDate && updates.scheduledTime) {
          updateMatchSchedule(matchId, updates.scheduledDate, updates.scheduledTime);
        }
      }
    }
    setEditingMatchId(null);
  };

  // If no matches exist but we have players, show generate button
  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-950/50 border-gray-800 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-full">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">No Fixtures Generated</h3>
                <p className="text-gray-400 max-w-md">Generate tournament fixtures to start organizing matches and managing your tournament bracket.</p>
              </div>
              
              {canGenerateMatches && onGenerateMatches && (
                <Button 
                  onClick={onGenerateMatches}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Generate Fixtures
                </Button>
              )}
              
              {!canGenerateMatches && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <p className="text-amber-300 text-sm font-medium">
                    Add at least 2 players in the Players tab to generate fixtures.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group matches by round for better organization
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Winner and Runner-up Display */}
      {winner && (
        <Card className="bg-gradient-to-r from-yellow-900/30 to-amber-800/30 border-yellow-800/40 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-yellow-200">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              Tournament Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Trophy className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-yellow-200">Champion: </span>
                <span className="text-white font-bold">{winner.name}</span>
              </div>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/40">
                <Badge variant="outline" className="bg-gray-700/50 text-gray-300 border-gray-600">
                  Runner-up: {runnerUp.name}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matches by Round */}
      {rounds.map(round => (
        <div key={round} className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Play className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Round {round}
              {rounds.length > 1 && round === rounds[rounds.length - 1] && (
                <span className="ml-2 text-yellow-400">(Final)</span>
              )}
            </h3>
            <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent"></div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {matchesByRound[round].map(match => (
              <Card key={match.id} className="bg-gray-950/70 border-gray-800/80 hover:border-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm">
                {editingMatchId === match.id ? (
                  <TournamentMatchEditor
                    match={match}
                    players={players}
                    onSave={handleEditMatch}
                    onCancel={() => setEditingMatchId(null)}
                  />
                ) : (
                  <>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-800/60 rounded-md">
                            <Trophy className="h-4 w-4 text-gray-400" />
                          </div>
                          <CardTitle className="text-base font-semibold text-white">
                            {formatStage(match.stage)}
                          </CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMatchId(match.id)}
                            className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-400 hover:text-white"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Badge variant="outline" className={getStageColor(match.stage)}>
                            {formatStage(match.stage)}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(match.status)}>
                            {match.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Players */}
                      <div className="space-y-3">
                        <div className={`p-4 rounded-lg border transition-all duration-200 ${
                          match.winnerId === match.player1Id 
                            ? 'bg-green-900/30 border-green-700/50 shadow-green-900/20 shadow-lg' 
                            : 'bg-gray-800/60 border-gray-700/60 hover:bg-gray-800/80'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{getPlayerName(match.player1Id)}</span>
                            {match.winnerId === match.player1Id && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <span className="text-gray-400 text-sm font-medium px-3 py-1 bg-gray-800/40 rounded-full">VS</span>
                        </div>
                        
                        <div className={`p-4 rounded-lg border transition-all duration-200 ${
                          match.winnerId === match.player2Id 
                            ? 'bg-green-900/30 border-green-700/50 shadow-green-900/20 shadow-lg' 
                            : 'bg-gray-800/60 border-gray-700/60 hover:bg-gray-800/80'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{getPlayerName(match.player2Id)}</span>
                            {match.winnerId === match.player2Id && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-800/40 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span>{format(new Date(match.scheduledDate), 'MMM dd')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock className="h-4 w-4 text-green-400" />
                          <span>{match.scheduledTime}</span>
                        </div>
                      </div>

                      {/* Match Actions */}
                      {!match.completed && match.player1Id && match.player2Id && match.player1Id !== '' && match.player2Id !== '' && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-300">Select Winner:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateMatchResult(match.id, match.player1Id)}
                              className="bg-green-600/20 border border-green-600/30 text-green-300 hover:bg-green-600/30 hover:border-green-600/50 transition-all duration-200"
                            >
                              {getPlayerName(match.player1Id)}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateMatchResult(match.id, match.player2Id)}
                              className="bg-green-600/20 border border-green-600/30 text-green-300 hover:bg-green-600/30 hover:border-green-600/50 transition-all duration-200"
                            >
                              {getPlayerName(match.player2Id)}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentMatchSection;
