import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Calendar, Users, Sword, Clock, ArrowRight } from 'lucide-react';
import { fetchTournamentHistoryFromData } from '@/services/tournamentHistoryService';
import { TournamentHistoryMatch, MatchStage } from '@/types/tournament.types';
import { supabase } from '@/integrations/supabase/client';

interface PublicTournamentHistoryProps {
  tournamentId: string;
  tournamentName: string;
}

interface ScheduledMatch {
  id: string;
  player1_name: string;
  player2_name: string;
  match_stage: MatchStage;
  scheduled_date?: string;
  scheduled_time?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

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

const PublicTournamentHistory: React.FC<PublicTournamentHistoryProps> = ({
  tournamentId,
  tournamentName
}) => {
  const [matches, setMatches] = useState<TournamentHistoryMatch[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Load completed matches from history
        const historyData = await fetchTournamentHistoryFromData(tournamentId);
        setMatches(historyData);

        // Load scheduled matches from tournament data
        const { data: tournamentData, error } = await supabase
          .from('tournaments')
          .select('matches, players')
          .eq('id', tournamentId)
          .single();

        if (!error && tournamentData) {
          // Type guard and cast for matches - cast through unknown first
          const tournamentMatches = Array.isArray(tournamentData.matches) 
            ? (tournamentData.matches as unknown as TournamentMatch[])
            : [];
          
          // Type guard and cast for players - cast through unknown first
          const players = Array.isArray(tournamentData.players) 
            ? (tournamentData.players as unknown as TournamentPlayer[])
            : [];
          
          // Convert tournament matches to scheduled format
          const scheduled = tournamentMatches
            .filter((match: TournamentMatch) => match.status === 'scheduled' || match.status === 'cancelled')
            .map((match: TournamentMatch) => {
              const player1 = players.find((p: TournamentPlayer) => p.id === match.player1Id);
              const player2 = players.find((p: TournamentPlayer) => p.id === match.player2Id);
              
              return {
                id: match.id,
                player1_name: player1?.name || 'TBD',
                player2_name: player2?.name || 'TBD',
                match_stage: match.stage as MatchStage,
                scheduled_date: match.scheduledDate,
                scheduled_time: match.scheduledTime,
                status: match.status as 'scheduled' | 'completed' | 'cancelled'
              };
            });
          
          setScheduledMatches(scheduled);
        }

        console.log('Loaded tournament history:', historyData);
        console.log('Loaded scheduled matches:', scheduledMatches);
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

  const getStageColor = (stage: MatchStage, isScheduled: boolean = false) => {
    const opacity = isScheduled ? '/20' : '/40';
    switch (stage) {
      case 'final': return `bg-gradient-to-r from-yellow-900${opacity} to-yellow-800/10 border-yellow-400/40`;
      case 'semi_final': return `bg-gradient-to-r from-gray-900${opacity} to-gray-800/10 border-gray-400/40`;
      case 'quarter_final': return `bg-gradient-to-r from-orange-900${opacity} to-orange-800/10 border-orange-400/40`;
      default: return `bg-gradient-to-r from-blue-900${opacity} to-blue-800/10 border-blue-400/40`;
    }
  };

  const formatStage = (stage: MatchStage) => {
    return stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return null;
    try {
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return time ? `${formattedDate} at ${time}` : formattedDate;
    } catch {
      return date;
    }
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
      <Card className="bg-cuephoria-dark/60 border-cuephoria-lightpurple/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4" />
            Tournament Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 bg-cuephoria-grey/10 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0 && scheduledMatches.length === 0) {
    return (
      <Card className="bg-cuephoria-dark/60 border-cuephoria-lightpurple/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4" />
            Tournament Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-cuephoria-grey">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No Match Data</p>
            <p className="text-xs">Match results will appear here once the tournament progresses.</p>
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

  // Group scheduled matches by stage
  const scheduledByStage = scheduledMatches.reduce((acc, match) => {
    if (!acc[match.match_stage]) {
      acc[match.match_stage] = [];
    }
    acc[match.match_stage].push(match);
    return acc;
  }, {} as Record<MatchStage, ScheduledMatch[]>);

  // Order stages by importance
  const stageOrder: MatchStage[] = ['final', 'semi_final', 'quarter_final', 'regular'];

  return (
    <Card className="bg-cuephoria-dark/60 border-cuephoria-lightpurple/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4" />
          Tournament Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stageOrder.map(stage => {
          const stageMatches = matchesByStage[stage] || [];
          const stageScheduled = scheduledByStage[stage] || [];
          
          if (stageMatches.length === 0 && stageScheduled.length === 0) return null;

          return (
            <div key={stage} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                {getStageIcon(stage)}
                <h4 className="text-sm font-semibold text-white">
                  {formatStage(stage)}
                </h4>
                <Badge variant="outline" className="text-xs border-cuephoria-lightpurple/30 text-cuephoria-lightpurple">
                  {stageMatches.length + stageScheduled.length} match{stageMatches.length + stageScheduled.length !== 1 ? 'es' : ''}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {/* Completed Matches */}
                {stageMatches.map((match, index) => (
                  <div
                    key={`completed-${match.id}-${index}`}
                    className={`p-3 rounded-lg border ${getStageColor(stage)} transition-all duration-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-sm text-white text-center min-w-0 flex-1">
                          <div className="flex items-center justify-center gap-2">
                            <span className="truncate">
                              {getDisplayName(match.player1_name, match.winner_name, match.match_stage)}
                            </span>
                            <span className="text-cuephoria-lightpurple font-bold">vs</span>
                            <span className="truncate">
                              {getDisplayName(match.player2_name, match.winner_name, match.match_stage)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-green-400 ml-3">
                        <Crown className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium text-xs">{match.winner_name}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Scheduled Matches */}
                {stageScheduled.map((match, index) => (
                  <div
                    key={`scheduled-${match.id}-${index}`}
                    className={`p-3 rounded-lg border ${getStageColor(stage, true)} transition-all duration-200 ${
                      match.status === 'cancelled' ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-sm text-white text-center min-w-0 flex-1">
                          <div className="flex items-center justify-center gap-2">
                            <span className="truncate">{match.player1_name}</span>
                            <ArrowRight className="h-3 w-3 text-cuephoria-lightpurple flex-shrink-0" />
                            <span className="truncate">{match.player2_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-3">
                        {match.status === 'cancelled' ? (
                          <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">
                            Cancelled
                          </Badge>
                        ) : match.scheduled_date && match.scheduled_time ? (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="text-xs font-medium">
                              {formatDateTime(match.scheduled_date, match.scheduled_time)}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-400">
                            Scheduled
                          </Badge>
                        )}
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
