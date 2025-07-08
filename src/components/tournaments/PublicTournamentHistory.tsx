
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Calendar, Users, Sword, Clock, ArrowRight } from 'lucide-react';
import { fetchTournamentHistoryFromData } from '@/services/tournamentHistoryService';
import { TournamentHistoryMatch, MatchStage } from '@/types/tournament.types';
import { supabase } from '@/integrations/supabase/client';

interface TournamentPlayer {
  id: string;
  name: string;
}

interface TournamentMatch {
  id: string;
  player1Id: string;
  player2Id: string;
  stage: string;
  status: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

interface AllTournamentHistoryData {
  tournament_id: string;
  tournament_name: string;
  matches: TournamentHistoryMatch[];
}

const PublicTournamentHistory: React.FC = () => {
  const [allTournamentHistory, setAllTournamentHistory] = useState<AllTournamentHistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllTournamentHistory();
  }, []);

  const loadAllTournamentHistory = async () => {
    try {
      console.log('Loading all tournament history...');
      
      // Get all completed tournaments
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name, status')
        .eq('status', 'completed');

      if (tournamentsError) {
        console.error('Error fetching tournaments:', tournamentsError);
        return;
      }

      if (!tournaments || tournaments.length === 0) {
        console.log('No completed tournaments found');
        setLoading(false);
        return;
      }

      // Load history for each tournament
      const allHistory: AllTournamentHistoryData[] = [];
      
      for (const tournament of tournaments) {
        try {
          const historyData = await fetchTournamentHistoryFromData(tournament.id);
          if (historyData.length > 0) {
            allHistory.push({
              tournament_id: tournament.id,
              tournament_name: tournament.name,
              matches: historyData
            });
          }
        } catch (error) {
          console.error(`Error loading history for tournament ${tournament.id}:`, error);
        }
      }

      setAllTournamentHistory(allHistory);
      console.log('Loaded all tournament history:', allHistory);
    } catch (error) {
      console.error('Error loading all tournament history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: MatchStage) => {
    switch (stage) {
      case 'final': return <Crown className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
      case 'semi_final': return <Medal className="h-4 w-4 text-gray-400 flex-shrink-0" />;
      case 'quarter_final': return <Trophy className="h-4 w-4 text-orange-400 flex-shrink-0" />;
      default: return <Sword className="h-4 w-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const getStageColor = (stage: MatchStage) => {
    switch (stage) {
      case 'final': return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/10 border-yellow-400/40';
      case 'semi_final': return 'bg-gradient-to-r from-gray-900/40 to-gray-800/10 border-gray-400/40';
      case 'quarter_final': return 'bg-gradient-to-r from-orange-900/40 to-orange-800/10 border-orange-400/40';
      default: return 'bg-gradient-to-r from-blue-900/40 to-blue-800/10 border-blue-400/40';
    }
  };

  const formatStage = (stage: MatchStage) => {
    return stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDisplayName = (playerName: string, winnerName: string, stage: MatchStage) => {
    if (stage === 'final' && playerName !== winnerName) {
      return `${playerName} (Runner-up)`;
    }
    return playerName;
  };

  if (loading) {
    return (
      <Card className="bg-cuephoria-dark/60 border-cuephoria-lightpurple/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 text-base font-semibold">
            <Trophy className="h-5 w-5" />
            Tournament History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-cuephoria-grey/10 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allTournamentHistory.length === 0) {
    return (
      <Card className="bg-cuephoria-dark/60 border-cuephoria-lightpurple/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 text-base font-semibold">
            <Trophy className="h-5 w-5" />
            Tournament History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-cuephoria-grey">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No Tournament History</p>
            <p className="text-xs">Completed tournament results will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {allTournamentHistory.map((tournamentData) => (
        <Card key={tournamentData.tournament_id} className="bg-cuephoria-dark/60 border-cuephoria-lightpurple/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 text-lg font-semibold">
              <Trophy className="h-5 w-5" />
              {tournamentData.tournament_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            {/* Group matches by stage */}
            {(() => {
              const matchesByStage = tournamentData.matches.reduce((acc, match) => {
                if (!acc[match.match_stage]) {
                  acc[match.match_stage] = [];
                }
                acc[match.match_stage].push(match);
                return acc;
              }, {} as Record<MatchStage, TournamentHistoryMatch[]>);

              const stageOrder: MatchStage[] = ['final', 'semi_final', 'quarter_final', 'regular'];

              return stageOrder.map(stage => {
                const stageMatches = matchesByStage[stage] || [];
                if (stageMatches.length === 0) return null;

                return (
                  <div key={stage} className="space-y-3">
                    <div className="flex items-center gap-3">
                      {getStageIcon(stage)}
                      <h4 className="text-sm font-semibold text-white">
                        {formatStage(stage)}
                      </h4>
                      <Badge variant="outline" className="text-xs border-cuephoria-lightpurple/30 text-cuephoria-lightpurple ml-auto">
                        {stageMatches.length} match{stageMatches.length !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {stageMatches.map((match, index) => (
                        <div
                          key={`${match.id}-${index}`}
                          className={`p-4 rounded-lg border ${getStageColor(stage)} transition-all duration-200`}
                        >
                          <div className="flex flex-col space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="text-sm text-white">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <span className="font-medium break-words">
                                      {getDisplayName(match.player1_name, match.winner_name, match.match_stage)}
                                    </span>
                                    <span className="text-cuephoria-lightpurple font-bold text-xs self-start sm:self-center">vs</span>
                                    <span className="font-medium break-words">
                                      {getDisplayName(match.player2_name, match.winner_name, match.match_stage)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-green-400 flex-shrink-0">
                                <Crown className="h-3 w-3" />
                                <span className="font-medium text-xs break-words">{match.winner_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PublicTournamentHistory;
