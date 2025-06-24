
import React, { useState } from 'react';
import { Match, Player, MatchStatus } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, Users, Plus, Edit, Play, Settings, Star, Award, Crown, Zap, Target } from 'lucide-react';
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
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/40';
      case 'completed':
        return 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/40';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/40';
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
        return 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-indigo-300 border-indigo-500/40';
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
        console.log('Player change detected, regenerating fixtures intelligently');
        if (onRegenerateFixtures) {
          // Generate new matches but preserve completed matches
          const newMatches = generateTournamentMatches(players, tournamentFormat);
          
          // Merge with existing matches, preserving completed ones
          const updatedMatches = newMatches.map(newMatch => {
            const existingMatch = matches.find(m => m.id === newMatch.id);
            
            // If the existing match has a winner, preserve all its data
            if (existingMatch && existingMatch.winnerId && existingMatch.completed) {
              return existingMatch;
            }
            
            // For the match being edited, apply the updates
            if (newMatch.id === matchId) {
              return { ...newMatch, ...updates };
            }
            
            return newMatch;
          });
          
          onRegenerateFixtures(updatedMatches);
        }
      } else {
        console.log('Simple update (date/time only)');
        onUpdateMatch(matchId, updates);
      }
    }
    setEditingMatchId(null);
  };

  // If no matches exist but we have players, show generate button
  if (matches.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                <div className="p-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl border border-purple-500/30">
                  <Target className="h-16 w-16 text-purple-400" />
                </div>
              </div>
              <div className="space-y-4 max-w-md">
                <h3 className="text-2xl font-bold text-white">No Fixtures Generated</h3>
                <p className="text-gray-400 leading-relaxed">Create tournament fixtures to organize matches and manage your tournament bracket with automated scheduling.</p>
              </div>
              
              {canGenerateMatches && onGenerateMatches && (
                <Button 
                  onClick={onGenerateMatches}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Generate Tournament Fixtures
                </Button>
              )}
              
              {!canGenerateMatches && (
                <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl backdrop-blur-sm">
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
    <div className="space-y-8 animate-fade-in">
      {/* Winner and Runner-up Display */}
      {winner && (
        <Card className="bg-gradient-to-r from-yellow-900/50 via-amber-800/50 to-yellow-900/50 border-yellow-600/60 shadow-2xl backdrop-blur-sm animate-scale-in">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-4 text-yellow-200">
              <div className="p-4 bg-gradient-to-br from-yellow-500/40 to-amber-500/40 rounded-xl border border-yellow-500/50">
                <Crown className="h-8 w-8 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  Tournament Champions
                  <Star className="h-6 w-6 text-yellow-400" />
                </h3>
                <p className="text-yellow-300/80 font-normal">Congratulations to our winners!</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/40 transform hover:scale-105 transition-all duration-300">
              <div className="p-3 bg-yellow-500/30 rounded-xl">
                <Trophy className="h-7 w-7 text-yellow-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="h-5 w-5 text-yellow-400" />
                  <span className="font-bold text-yellow-200">Champion</span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <span className="text-white font-bold text-xl">{winner.name}</span>
              </div>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-6 p-5 bg-gradient-to-r from-gray-700/40 to-gray-600/40 rounded-xl border border-gray-600/50 transform hover:scale-105 transition-all duration-300">
                <div className="p-3 bg-gray-600/30 rounded-xl">
                  <Award className="h-6 w-6 text-gray-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-200">Runner-up</span>
                  </div>
                  <span className="text-white font-bold text-lg">{runnerUp.name}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matches by Round */}
      {rounds.map((round, roundIndex) => (
        <div key={round} className="space-y-6 animate-fade-in" style={{ animationDelay: `${roundIndex * 0.1}s` }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/40">
              <Play className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                Round {round}
                {rounds.length > 1 && round === rounds[rounds.length - 1] && (
                  <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border-yellow-500/50 px-3 py-1 font-semibold">
                    <Crown className="h-4 w-4 mr-2" />
                    Final Round
                  </Badge>
                )}
              </h3>
              <div className="h-1 bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-transparent rounded-full mt-2"></div>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {matchesByRound[round].map((match, matchIndex) => (
              <Card 
                key={match.id} 
                className="group bg-gradient-to-br from-gray-950/85 to-gray-900/85 border-gray-800/60 hover:border-gray-700/80 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${matchIndex * 0.1}s` }}
              >
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
                          <div className="p-2 bg-gradient-to-br from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-700/50">
                            <Trophy className="h-4 w-4 text-gray-300" />
                          </div>
                          <CardTitle className="text-base font-bold text-white">
                            {formatStage(match.stage)}
                          </CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMatchId(match.id)}
                            className="h-7 w-7 p-0 hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-300 rounded-lg"
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
                      <div className="space-y-2">
                        <div className={`p-3 rounded-lg border transition-all duration-300 ${
                          match.winnerId === match.player1Id 
                            ? 'bg-gradient-to-r from-emerald-900/50 to-green-900/50 border-emerald-500/60 shadow-md' 
                            : 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-700/60 hover:bg-gray-800/70 hover:border-gray-600/70'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                              <span className="text-white font-medium text-sm">{getPlayerName(match.player1Id)}</span>
                            </div>
                            {match.winnerId === match.player1Id && (
                              <div className="flex items-center gap-1">
                                <Crown className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs font-semibold text-yellow-300">Winner</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center py-1">
                          <span className="text-gray-300 font-medium text-xs px-3 py-1 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-full border border-gray-600/50">
                            VS
                          </span>
                        </div>
                        
                        <div className={`p-3 rounded-lg border transition-all duration-300 ${
                          match.winnerId === match.player2Id 
                            ? 'bg-gradient-to-r from-emerald-900/50 to-green-900/50 border-emerald-500/60 shadow-md' 
                            : 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-700/60 hover:bg-gray-800/70 hover:border-gray-600/70'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
                              <span className="text-white font-medium text-sm">{getPlayerName(match.player2Id)}</span>
                            </div>
                            {match.winnerId === match.player2Id && (
                              <div className="flex items-center gap-1">
                                <Crown className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs font-semibold text-yellow-300">Winner</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="p-1 bg-blue-500/20 rounded">
                            <Calendar className="h-3 w-3 text-blue-400" />
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 font-medium">Date</span>
                            <div className="font-medium text-white text-sm">{format(new Date(match.scheduledDate), 'MMM dd')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="p-1 bg-green-500/20 rounded">
                            <Clock className="h-3 w-3 text-green-400" />
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 font-medium">Time</span>
                            <div className="font-medium text-white text-sm">{match.scheduledTime}</div>
                          </div>
                        </div>
                      </div>

                      {/* Match Actions */}
                      {!match.completed && match.player1Id && match.player2Id && match.player1Id !== '' && match.player2Id !== '' && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-purple-500/20 rounded">
                              <Settings className="h-3 w-3 text-purple-400" />
                            </div>
                            <span className="font-medium text-gray-200 text-sm">Select Winner:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateMatchResult(match.id, match.player1Id)}
                              className="bg-gradient-to-r from-blue-600/80 to-cyan-600/80 hover:from-blue-700 hover:to-cyan-700 border border-blue-500/50 hover:border-blue-400/70 text-white transition-all duration-300 font-medium text-xs py-2 rounded-lg transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                            >
                              <Trophy className="h-3 w-3 mr-1" />
                              {getPlayerName(match.player1Id)}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateMatchResult(match.id, match.player2Id)}
                              className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700 hover:to-pink-700 border border-purple-500/50 hover:border-purple-400/70 text-white transition-all duration-300 font-medium text-xs py-2 rounded-lg transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                            >
                              <Trophy className="h-3 w-3 mr-1" />
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
