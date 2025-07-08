
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Medal, Star, TrendingUp, RefreshCw } from 'lucide-react';
import { fetchTournamentLeaderboard, saveAllCompletedTournaments } from '@/services/tournamentHistoryService';

interface LeaderboardEntry {
  player: string;
  wins: number;
  tournaments: string[];
}

const PublicLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      console.log('Loading tournament leaderboard...');
      const data = await fetchTournamentLeaderboard();
      console.log('Leaderboard data loaded:', data);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      console.log('Manually syncing tournament data...');
      await saveAllCompletedTournaments();
      await loadLeaderboard();
      console.log('Tournament data sync completed');
    } catch (error) {
      console.error('Error syncing tournament data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Trophy className="h-6 w-6 text-orange-400" />;
      default: return <Star className="h-5 w-5 text-blue-400" />;
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-yellow-400/40';
      case 2: return 'bg-gradient-to-r from-gray-900/40 to-gray-800/20 border-gray-400/40';
      case 3: return 'bg-gradient-to-r from-orange-900/40 to-orange-800/20 border-orange-400/40';
      default: return 'bg-gradient-to-r from-blue-900/40 to-blue-800/20 border-blue-400/40';
    }
  };

  if (loading) {
    return (
      <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
        <CardHeader>
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Champions Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-cuephoria-grey/20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
        <CardHeader>
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Champions Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-cuephoria-grey">
            <Crown className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Champions Yet</p>
            <p className="mb-4">Tournament winners will appear here once tournaments are completed.</p>
            <button
              onClick={handleSyncData}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/80 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Tournament Data'}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
      <CardHeader>
        <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Champions Leaderboard
          </div>
          <button
            onClick={handleSyncData}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-cuephoria-lightpurple/20 hover:bg-cuephoria-lightpurple/30 text-cuephoria-lightpurple rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </CardTitle>
        <p className="text-cuephoria-grey text-sm">Top tournament winners of all time</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.slice(0, 10).map((entry, index) => {
          const position = index + 1;
          return (
            <div
              key={entry.player}
              className={`p-4 rounded-lg border ${getRankColor(position)} hover:scale-[1.02] transition-all duration-300 group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white w-8 text-center">
                      #{position}
                    </span>
                    {getRankIcon(position)}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-cuephoria-lightpurple transition-colors">
                      {entry.player}
                    </h3>
                    <p className="text-sm text-cuephoria-grey">
                      {entry.tournaments.length} tournament{entry.tournaments.length !== 1 ? 's' : ''} won
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">{entry.wins}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs border-cuephoria-lightpurple/50 text-cuephoria-lightpurple mt-1"
                  >
                    {entry.wins === 1 ? 'Champion' : `${entry.wins}x Champion`}
                  </Badge>
                </div>
              </div>
              
              {/* Tournament titles - show on hover or for top 3 */}
              {(position <= 3 || entry.tournaments.length <= 2) && (
                <div className="mt-3 pt-3 border-t border-cuephoria-lightpurple/20">
                  <div className="flex flex-wrap gap-1">
                    {entry.tournaments.slice(0, 3).map((tournament, idx) => (
                      <Badge 
                        key={idx}
                        variant="secondary" 
                        className="text-xs bg-cuephoria-lightpurple/20 text-cuephoria-lightpurple"
                      >
                        {tournament}
                      </Badge>
                    ))}
                    {entry.tournaments.length > 3 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-cuephoria-grey/20 text-cuephoria-grey"
                      >
                        +{entry.tournaments.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PublicLeaderboard;
