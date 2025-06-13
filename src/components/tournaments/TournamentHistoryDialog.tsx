import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TournamentHistoryMatch, MatchStage } from '@/types/tournament.types';
import { fetchTournamentHistoryFromData } from '@/services/tournamentHistoryService';
import { Trophy, Medal, Flag, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TournamentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
}

const TournamentHistoryDialog: React.FC<TournamentHistoryDialogProps> = ({
  open,
  onOpenChange,
  tournamentId,
  tournamentName
}) => {
  const [historyMatches, setHistoryMatches] = useState<TournamentHistoryMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tournamentId) {
      loadTournamentHistory();
    }
  }, [open, tournamentId]);

  const loadTournamentHistory = async () => {
    setLoading(true);
    try {
      // Use the new function that can fetch from tournament data if history table is empty
      const history = await fetchTournamentHistoryFromData(tournamentId);
      setHistoryMatches(history);
      console.log('Loaded tournament history:', history);
    } catch (error) {
      console.error('Error loading tournament history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageDisplayInfo = (stage: MatchStage) => {
    switch (stage) {
      case 'final':
        return {
          label: 'FINAL',
          color: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
          icon: <Trophy className="h-4 w-4 mr-1" />
        };
      case 'semi_final':
        return {
          label: 'SEMI FINAL',
          color: 'bg-gradient-to-r from-purple-600 to-purple-400 text-white',
          icon: <Medal className="h-4 w-4 mr-1" />
        };
      case 'quarter_final':
        return {
          label: 'QUARTER FINAL',
          color: 'bg-gradient-to-r from-blue-600 to-blue-400 text-white',
          icon: <Flag className="h-4 w-4 mr-1" />
        };
      default:
        return {
          label: 'ROUND',
          color: 'bg-gradient-to-r from-gray-600 to-gray-400 text-white',
          icon: <Users className="h-4 w-4 mr-1" />
        };
    }
  };

  // Group matches by stage
  const groupedMatches = historyMatches.reduce((acc, match) => {
    if (!acc[match.match_stage]) {
      acc[match.match_stage] = [];
    }
    acc[match.match_stage].push(match);
    return acc;
  }, {} as Record<MatchStage, TournamentHistoryMatch[]>);

  // Display order for stages
  const stageOrder: MatchStage[] = ['final', 'semi_final', 'quarter_final', 'regular'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-100 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tournament History: {tournamentName}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-300">Loading tournament history...</span>
          </div>
        ) : historyMatches.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No match history available for this tournament.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {stageOrder.map(stage => {
              const matches = groupedMatches[stage];
              if (!matches || matches.length === 0) return null;
              
              const stageInfo = getStageDisplayInfo(stage);
              
              return (
                <div key={stage} className="space-y-3">
                  <div className="flex items-center justify-center">
                    <Badge className={`text-sm px-4 py-2 ${stageInfo.color}`}>
                      {stageInfo.icon}
                      {stageInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-3">
                    {matches.map((match, index) => (
                      <Card 
                        key={match.id} 
                        className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-400">Match #{index + 1}</span>
                              <div className="text-sm text-gray-300">
                                <span className={match.winner_name === match.player1_name ? 'text-green-400 font-semibold' : ''}>
                                  {match.player1_name}
                                </span>
                                <span className="text-gray-500 mx-2">vs</span>
                                <span className={match.winner_name === match.player2_name ? 'text-green-400 font-semibold' : ''}>
                                  {match.player2_name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-green-400 font-semibold">
                                Winner: {match.winner_name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {format(new Date(match.match_date), 'dd MMM yyyy')}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TournamentHistoryDialog;
