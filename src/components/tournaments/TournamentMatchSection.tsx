
import React, { useState } from 'react';
import { Match, Player, MatchStatus } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, Users, Plus, Edit, Play, Settings, Star, Award } from 'lucide-react';
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
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/40';
      case 'semi_final':
        return 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/40';
      case 'quarter_final':
        return 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/40';
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
        return 'Round Match';
    }
  };

  const handleEditMatch = (matchId: string, updates: Partial<Match>) => {
    console.log('handleEditMatch called with:', { matchId, updates });
    
    if (onUpdateMatch) {
      const originalMatch = matches.find(m => m.id === matchId);
      if (originalMatch && (
        updates.player1Id !== originalMatch.player1Id || 
        updates.player2Id !== originalMatch.player2Id
      )) {
        console.log('Player change detected, regenerating fixtures');
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
        console.log('Simple update (date/time only)');
        // Simple update (date/time only)
        onUpdateMatch(matchId, updates);
      }
    }
    setEditingMatchId(null);
  };

  // If no matches exist but we have players, show generate button
  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl">
                <Users className="h-16 w-16 text-purple-400" />
              </div>
              <div className="space-y-3 max-w-md">
                <h3 className="text-2xl font-bold text-white">No Fixtures Generated</h3>
                <p className="text-gray-400 leading-relaxed">Create tournament fixtures to organize matches and manage your tournament bracket with automated scheduling.</p>
              </div>
              
              {canGenerateMatches && onGenerateMatches && (
                <Button 
                  onClick={onGenerateMatches}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Generate Tournament Fixtures
                </Button>
              )}
              
              {!canGenerateMatches && (
                <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <p className="text-amber-300 font-medium">
                    Add at least 2 players to generate fixtures.
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
    <div className="space-y-8">
      {/* Winner and Runner-up Display */}
      {winner && (
        <Card className="bg-gradient-to-r from-yellow-900/40 via-amber-800/40 to-yellow-900/40 border-yellow-700/50 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-4 text-yellow-200">
              <div className="p-3 bg-gradient-to-br from-yellow-500/30 to-amber-500/30 rounded-xl">
                <Award className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Tournament Champions</h3>
                <p className="text-yellow-300/80 text-sm font-normal">Tournament completed successfully</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-500/15 to-amber-500/15 rounded-xl border border-yellow-500/30">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="font-semibold text-yellow-200">Champion</span>
                </div>
                <span className="text-white font-bold text-lg">{winner.name}</span>
              </div>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600/40">
                <div className="p-2 bg-gray-600/20 rounded-lg">
                  <Award className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-300">Runner-up</span>
                  </div>
                  <span className="text-white font-bold">{runnerUp.name}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matches by Round */}
      {rounds.map(round => (
        <div key={round} className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl">
              <Play className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                Round {round}
                {rounds.length > 1 && round === rounds[rounds.length - 1] && (
                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30">
                    Final Round
                  </Badge>
                )}
              </h3>
              <div className="h-px bg-gradient-to-r from-purple-500/40 via-blue-500/40 to-transparent mt-2"></div>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {matchesByRound[round].map(match => (
              <Card key={match.id} className="group bg-gradient-to-br from-gray-950/80 to-gray-900/80 border-gray-800/60 hover:border-gray-700/80 transition-all duration-300 shadow-xl hover:shadow-2xl backdrop-blur-sm hover:transform hover:scale-[1.02]">
                {editingMatchId === match.id ? (
                  <TournamentMatchEditor
                    match={match}
                    players={players}
                    onSave={handleEditMatch}
                    onCancel={() => setEditingMatchId(null)}
                  />
                ) : (
                  <>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-gray-800/60 to-gray-700/60 rounded-lg">
                            <Trophy className="h-5 w-5 text-gray-400" />
                          </div>
                          <CardTitle className="text-lg font-bold text-white">
                            {formatStage(match.stage)}
                          </CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMatchId(match.id)}
                            className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-200 rounded-lg"
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
                    
                    <CardContent className="space-y-5">
                      {/* Players */}
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${
                          match.winnerId === match.player1Id 
                            ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-600/50 shadow-green-900/20 shadow-lg' 
                            : 'bg-gradient-to-r from-gray-800/40 to-gray-700/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600/60'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-white font-semibold">{getPlayerName(match.player1Id)}</span>
                            </div>
                            {match.winnerId === match.player1Id && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-xs font-medium text-yellow-400">Winner</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <span className="text-gray-400 text-sm font-semibold px-4 py-2 bg-gray-800/40 rounded-full border border-gray-700/50">VS</span>
                        </div>
                        
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${
                          match.winnerId === match.player2Id 
                            ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-600/50 shadow-green-900/20 shadow-lg' 
                            : 'bg-gradient-to-r from-gray-800/40 to-gray-700/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600/60'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span className="text-white font-semibold">{getPlayerName(match.player2Id)}</span>
                            </div>
                            {match.winnerId === match.player2Id && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-xs font-medium text-yellow-400">Winner</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-xl border border-gray-700/40">
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span className="font-medium">{format(new Date(match.scheduledDate), 'MMM dd')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <Clock className="h-4 w-4 text-green-400" />
                          <span className="font-medium">{match.scheduledTime}</span>
                        </div>
                      </div>

                      {/* Match Actions */}
                      {!match.completed && match.player1Id && match.player2Id && match.player1Id !== '' && match.player2Id !== '' && (
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-3">
                            <Settings className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-300">Select Winner:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              size="sm"
                              onClick={() => updateMatchResult(match.id, match.player1Id)}
                              className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-600/40 text-green-300 hover:from-green-600/30 hover:to-emerald-600/30 hover:border-green-600/60 transition-all duration-200 font-medium py-2 rounded-lg"
                            >
                              {getPlayerName(match.player1Id)}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateMatchResult(match.id, match.player2Id)}
                              className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-600/40 text-green-300 hover:from-green-600/30 hover:to-emerald-600/30 hover:border-green-600/60 transition-all duration-200 font-medium py-2 rounded-lg"
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
