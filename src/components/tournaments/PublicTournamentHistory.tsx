
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Calendar, Users, Sword } from 'lucide-react';
import { fetchTournamentHistoryFromData } from '@/services/tournamentHistoryService';
import { TournamentHistoryMatch, MatchStage } from '@/types/tournament.types';

interface PublicTournamentHistoryProps {
  tournamentId: string;
  tournamentName: string;
}

const PublicTournamentHistory: React.FC<PublicTournamentHistoryProps> = ({
  tournamentId,
  tournamentName
}) => {
  const [matches, setMatches] = useState<TournamentHistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Use the improved function that can fetch from both history table and tournament data
        const historyData = await fetchTournamentHistoryFromData(tournamentId);
        setMatches(historyData);
        console.log('Loaded tournament history:', historyData);
      } catch (error) {
        console.error('Error loading tournament history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [tournamentId]);

  const getStageIcon = (stage: MatchStage) => {
    switch (stage) {
      case 'final': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'semi_final': return <Medal className="h-4 w-4 text-gray-400" />;
      case 'quarter_final': return <Trophy className="h-4 w-4 text-orange-400" />;
      default: return <Sword className="h-4 w-4 text-blue-400" />;
    }
  };

  const getStageColor = (stage: MatchStage) => {
    switch (stage) {
      case 'final': return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-yellow-400/40';
      case 'semi_final': return 'bg-gradient-to-r from-gray-900/40 to-gray-800/20 border-gray-400/40';
      case 'quarter_final': return 'bg-gradient-to-r from-orange-900/40 to-orange-800/20 border-orange-400/40';
      default: return 'bg-gradient-to-r from-blue-900/40 to-blue-800/20 border-blue-400/40';
    }
  };

  const formatStage = (stage: MatchStage) => {
    return stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get display name with runner-up notation
  const getDisplayName = (playerName: string, winnerName: string, stage: MatchStage) => {
    // Only show runner-up notation for final match
    if (stage === 'final' && playerName !== winnerName) {
      return `${playerName} (Runner-up)`;
    }
    return playerName;
  };

  if (loading) {
    return (
      <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
        <CardHeader>
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-cuephoria-grey/20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
        <CardHeader>
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-cuephoria-grey">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Match History</p>
            <p>Match results will appear here once the tournament is completed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group matches by stage
  const matchesByStage = matches.reduce((acc, match) => {
    if (!acc[match.match_stage]) {
      acc[match.match_stage] = [];
    }
    acc[match.match_stage].push(match);
    return acc;
  }, {} as Record<MatchStage, TournamentHistoryMatch[]>);

  // Order stages by importance
  const stageOrder: MatchStage[] = ['final', 'semi_final', 'quarter_final', 'regular'];

  return (
    <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
      <CardHeader>
        <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tournament History - {tournamentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {stageOrder.map(stage => {
          const stageMatches = matchesByStage[stage];
          if (!stageMatches || stageMatches.length === 0) return null;

          return (
            <div key={stage} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                {getStageIcon(stage)}
                <h3 className="text-lg font-semibold text-white">
                  {formatStage(stage)} ({stageMatches.length} match{stageMatches.length !== 1 ? 'es' : ''})
                </h3>
              </div>
              
              <div className="grid gap-3">
                {stageMatches.map((match, index) => (
                  <div
                    key={`${match.id}-${index}`}
                    className={`p-4 rounded-lg border ${getStageColor(stage)} hover:scale-[1.02] transition-all duration-300`}
                  >
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                      {/* Players section - left aligned */}
                      <div className="flex items-center justify-start">
                        <span className="font-medium text-white text-left">
                          {getDisplayName(match.player1_name, match.winner_name, match.match_stage)}
                        </span>
                        <span className="mx-3 text-cuephoria-lightpurple font-bold">vs</span>
                        <span className="font-medium text-white text-left">
                          {getDisplayName(match.player2_name, match.winner_name, match.match_stage)}
                        </span>
                      </div>
                      
                      {/* Winner section - center aligned */}
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <Crown className="h-4 w-4" />
                        <span className="font-semibold">{match.winner_name}</span>
                      </div>

                      {/* Stage badge - right aligned */}
                      <div className="flex justify-end">
                        <Badge variant="outline" className="text-xs border-cuephoria-lightpurple/50 text-cuephoria-lightpurple">
                          {formatStage(match.match_stage)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PublicTournamentHistory;
