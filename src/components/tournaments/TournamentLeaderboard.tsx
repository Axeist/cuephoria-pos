
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users, Loader2, RefreshCw } from 'lucide-react';
import { fetchTournamentLeaderboard, saveAllCompletedTournaments } from '@/services/tournamentHistoryService';

interface LeaderboardEntry {
  player: string;
  wins: number;
  tournaments: string[];
}

const TournamentLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
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

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="h-6 w-6 flex items-center justify-center text-lg font-bold text-gray-400">#{index + 1}</div>;
    }
  };

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      case 1:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default:
        return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-950/50 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-300">Loading leaderboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950/50 border-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-100 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tournament Leaderboard
          </div>
          <button
            onClick={handleSyncData}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No tournament winners recorded yet.</p>
            <button
              onClick={handleSyncData}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Tournament Data'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.player}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  index < 3 
                    ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800' 
                    : 'bg-gray-800/30 border-gray-800 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {getRankIcon(index)}
                  <div>
                    <div className="font-semibold text-gray-100">{entry.player}</div>
                    <div className="text-sm text-gray-400">
                      {entry.tournaments.length > 1 
                        ? `Latest: ${entry.tournaments[0]}`
                        : entry.tournaments[0]
                      }
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-sm px-3 py-1 ${getRankBadgeColor(index)}`}>
                    {entry.wins} {entry.wins === 1 ? 'Win' : 'Wins'}
                  </Badge>
                  {entry.tournaments.length > 1 && (
                    <div className="text-xs text-gray-400 mt-1">
                      +{entry.tournaments.length - 1} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentLeaderboard;
