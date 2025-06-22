
import React from 'react';
import { Match, Player, MatchStatus } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface TournamentMatchSectionProps {
  matches: Match[];
  players: Player[];
  updateMatchResult: (matchId: string, winnerId: string) => void;
  updateMatchSchedule: (matchId: string, date: string, time: string) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  winner?: Player;
  runnerUp?: Player;
  onGenerateMatches?: () => void;
  canGenerateMatches?: boolean;
}

const TournamentMatchSection: React.FC<TournamentMatchSectionProps> = ({
  matches,
  players,
  updateMatchResult,
  updateMatchSchedule,
  updateMatchStatus,
  winner,
  runnerUp,
  onGenerateMatches,
  canGenerateMatches = false
}) => {
  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'final':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'semi_final':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'quarter_final':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // If no matches exist but we have players, show generate button
  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-950/50 border-gray-800">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No Fixtures Generated</h3>
            <p className="text-gray-500 mb-4">Generate tournament fixtures to start organizing matches.</p>
            
            {canGenerateMatches && onGenerateMatches && (
              <Button 
                onClick={onGenerateMatches}
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Fixtures
              </Button>
            )}
            
            {!canGenerateMatches && (
              <p className="text-amber-400 text-sm">
                Add at least 2 players in the Players tab to generate fixtures.
              </p>
            )}
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
        <Card className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border-yellow-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-200">
              <Trophy className="h-5 w-5" />
              Tournament Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-yellow-200">Winner: {winner.name}</span>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
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
          <h3 className="text-lg font-semibold text-white">
            Round {round} {rounds.length > 1 && round === rounds[rounds.length - 1] ? '(Final)' : ''}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {matchesByRound[round].map(match => (
              <Card key={match.id} className="bg-gray-950/50 border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium text-white">
                      {formatStage(match.stage)}
                    </CardTitle>
                    <div className="flex gap-2">
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
                    <div className={`p-3 rounded-lg border ${match.winnerId === match.player1Id ? 'bg-green-900/20 border-green-800/30' : 'bg-gray-800/50 border-gray-700'}`}>
                      <span className="text-white font-medium">{getPlayerName(match.player1Id)}</span>
                      {match.winnerId === match.player1Id && (
                        <Trophy className="inline h-4 w-4 ml-2 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="text-center text-gray-400 text-sm">VS</div>
                    
                    <div className={`p-3 rounded-lg border ${match.winnerId === match.player2Id ? 'bg-green-900/20 border-green-800/30' : 'bg-gray-800/50 border-gray-700'}`}>
                      <span className="text-white font-medium">{getPlayerName(match.player2Id)}</span>
                      {match.winnerId === match.player2Id && (
                        <Trophy className="inline h-4 w-4 ml-2 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(match.scheduledDate), 'MMM dd')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{match.scheduledTime}</span>
                    </div>
                  </div>

                  {/* Match Actions */}
                  {!match.completed && match.player1Id && match.player2Id && match.player1Id !== '' && match.player2Id !== '' && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Select Winner:</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMatchResult(match.id, match.player1Id)}
                          className="flex-1 bg-green-600/20 border-green-600/30 text-green-300 hover:bg-green-600/30"
                        >
                          {getPlayerName(match.player1Id)}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMatchResult(match.id, match.player2Id)}
                          className="flex-1 bg-green-600/20 border-green-600/30 text-green-300 hover:bg-green-600/30"
                        >
                          {getPlayerName(match.player2Id)}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentMatchSection;
