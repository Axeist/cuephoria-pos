
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Medal, Star, TrendingUp, RefreshCw, Sparkles, Award, Zap } from 'lucide-react';
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
      case 1: return <Crown className="h-8 w-8 text-yellow-400" />;
      case 2: return <Medal className="h-8 w-8 text-gray-400" />;
      case 3: return <Trophy className="h-8 w-8 text-orange-400" />;
      default: return <Star className="h-6 w-6 text-blue-400" />;
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-orange-400/20 border-yellow-400/50 shadow-yellow-400/20';
      case 2: return 'bg-gradient-to-r from-gray-500/20 via-gray-400/10 to-gray-300/20 border-gray-400/50 shadow-gray-400/20';
      case 3: return 'bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-amber-400/20 border-orange-400/50 shadow-orange-400/20';
      default: return 'bg-gradient-to-r from-blue-500/20 via-blue-400/10 to-cuephoria-lightpurple/20 border-blue-400/40 shadow-blue-400/10';
    }
  };

  const getRankGlow = (position: number) => {
    switch (position) {
      case 1: return 'shadow-2xl shadow-yellow-400/30';
      case 2: return 'shadow-xl shadow-gray-400/20';
      case 3: return 'shadow-xl shadow-orange-400/20';
      default: return 'shadow-lg shadow-blue-400/10';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-cuephoria-dark/90 to-cuephoria-darkpurple/60 border-cuephoria-lightpurple/30">
        <CardHeader>
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Champions Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gradient-to-r from-cuephoria-grey/20 to-cuephoria-grey/10 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-cuephoria-dark/90 to-cuephoria-darkpurple/60 border-cuephoria-lightpurple/30">
        <CardHeader>
          <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Champions Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/20 to-cuephoria-blue/20 mb-8 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
              <Crown className="h-12 w-12 text-cuephoria-lightpurple relative z-10" />
              <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-cuephoria-lightpurple mb-4">🏆 No Champions Yet</h3>
            <p className="text-cuephoria-grey mb-6">Tournament legends will be crowned here once competitions begin!</p>
            <button
              onClick={handleSyncData}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/80 hover:to-cuephoria-blue/80 text-white rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-lightpurple/30 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Champions...' : 'Sync Tournament Data'}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-cuephoria-dark/90 to-cuephoria-darkpurple/60 border-cuephoria-lightpurple/30 shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-cuephoria-lightpurple/10 to-cuephoria-blue/10 border-b border-cuephoria-lightpurple/20">
        <CardTitle className="text-cuephoria-lightpurple flex items-center gap-2 justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue p-2 rounded-full">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">🏆 Champions Leaderboard</h3>
              <p className="text-cuephoria-grey text-sm font-normal">Hall of Fame • Top Tournament Winners</p>
            </div>
          </div>
          <button
            onClick={handleSyncData}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-cuephoria-lightpurple/20 hover:bg-cuephoria-lightpurple/30 text-cuephoria-lightpurple rounded-lg transition-all duration-300 disabled:opacity-50 hover:shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {leaderboard.slice(0, 10).map((entry, index) => {
          const position = index + 1;
          const isTopThree = position <= 3;
          
          return (
            <div
              key={entry.player}
              className={`relative p-6 rounded-xl border-2 ${getRankColor(position)} ${getRankGlow(position)} hover:scale-[1.02] transition-all duration-500 group overflow-hidden`}
            >
              {/* Background sparkles for top 3 */}
              {isTopThree && (
                <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: `${1 + Math.random()}s`
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Enhanced rank display */}
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-full ${
                      isTopThree 
                        ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border-2 border-yellow-400/50' 
                        : 'bg-gradient-to-r from-blue-400/20 to-cuephoria-lightpurple/20 border-2 border-blue-400/30'
                    } relative`}>
                      <span className="text-2xl font-bold text-white absolute">{position}</span>
                      {getRankIcon(position)}
                      {isTopThree && (
                        <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-cuephoria-lightpurple transition-colors duration-300">
                        {entry.player}
                      </h3>
                      {position === 1 && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold px-3 py-1 animate-pulse">
                          <Crown className="h-3 w-3 mr-1" />
                          LEGEND
                        </Badge>
                      )}
                      {position === 2 && (
                        <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold px-3 py-1">
                          <Medal className="h-3 w-3 mr-1" />
                          ELITE
                        </Badge>
                      )}
                      {position === 3 && (
                        <Badge className="bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold px-3 py-1">
                          <Trophy className="h-3 w-3 mr-1" />
                          MASTER
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-cuephoria-grey">
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        <span>{entry.tournaments.length} tournament{entry.tournaments.length !== 1 ? 's' : ''} won</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-400 font-medium">Victory Streak</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue p-2 rounded-full">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-white">{entry.wins}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-sm font-semibold ${
                      isTopThree 
                        ? 'border-yellow-400/50 text-yellow-400 bg-yellow-400/10' 
                        : 'border-cuephoria-lightpurple/50 text-cuephoria-lightpurple bg-cuephoria-lightpurple/10'
                    }`}
                  >
                    {entry.wins === 1 ? 'Champion' : `${entry.wins}x Champion`}
                  </Badge>
                </div>
              </div>
              
              {/* Tournament titles - enhanced display */}
              {(position <= 3 || entry.tournaments.length <= 2) && (
                <div className="mt-4 pt-4 border-t border-cuephoria-lightpurple/20">
                  <div className="flex flex-wrap gap-2">
                    {entry.tournaments.slice(0, 3).map((tournament, idx) => (
                      <Badge 
                        key={idx}
                        variant="secondary" 
                        className="text-xs bg-cuephoria-lightpurple/20 text-cuephoria-lightpurple border border-cuephoria-lightpurple/30 hover:bg-cuephoria-lightpurple/30 transition-colors duration-300"
                      >
                        🏆 {tournament}
                      </Badge>
                    ))}
                    {entry.tournaments.length > 3 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-cuephoria-grey/20 text-cuephoria-grey border border-cuephoria-grey/30"
                      >
                        +{entry.tournaments.length - 3} more victories
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
