
import React from 'react';
import { Tournament } from '@/types/tournament.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, History, Users, Trophy, Calendar, Settings, Play, Crown, Medal } from 'lucide-react';
import { format } from 'date-fns';

interface TournamentListProps {
  tournaments: Tournament[];
  onEdit: (tournament: Tournament) => void;
  onManage: (tournament: Tournament) => void;
  onDelete: (id: string) => void;
  onViewHistory: (tournament: Tournament) => void;
}

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  onEdit,
  onManage,
  onDelete,
  onViewHistory
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/40';
      case 'in-progress':
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40';
      case 'completed':
        return 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'knockout':
        return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border-red-500/40';
      case 'league':
        return 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/40';
    }
  };

  if (tournaments.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl border border-purple-500/30">
              <Trophy className="h-20 w-20 text-purple-400" />
            </div>
            <div className="space-y-3 max-w-md">
              <h3 className="text-3xl font-bold text-white">No Tournaments Yet</h3>
              <p className="text-gray-400 leading-relaxed text-lg">Create your first tournament to start organizing competitive matches and track player performance.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="group bg-gradient-to-br from-gray-950/90 to-gray-900/90 border-gray-800/60 hover:border-gray-700/80 transition-all duration-300 shadow-xl hover:shadow-2xl backdrop-blur-sm hover:transform hover:scale-[1.02]">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
                  <Trophy className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl font-bold text-white line-clamp-2 leading-tight">
                    {tournament.name}
                  </CardTitle>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(tournament.status)}>
                {tournament.status === 'in-progress' ? 'Live' : tournament.status}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={getFormatColor(tournament.tournamentFormat)}>
                <Play className="h-3 w-3 mr-1" />
                {tournament.tournamentFormat === 'knockout' ? 'Knockout' : 'League'}
              </Badge>
              <Badge variant="outline" className="bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-indigo-300 border-indigo-500/40">
                {tournament.gameType} {tournament.gameVariant || tournament.gameTitle || ''}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/40">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium">Date</span>
                  <span className="text-sm font-semibold text-white">{format(new Date(tournament.date), 'MMM dd, yyyy')}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/40">
                <Users className="h-5 w-5 text-green-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium">Players</span>
                  <span className="text-sm font-semibold text-white">{tournament.players.length}/{tournament.maxPlayers || 16}</span>
                </div>
              </div>
            </div>

            {tournament.winner && (
              <div className="p-4 bg-gradient-to-r from-yellow-900/30 via-amber-800/30 to-yellow-900/30 rounded-xl border border-yellow-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Crown className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-yellow-200">Champion</span>
                    </div>
                    <span className="text-white font-bold text-lg">{tournament.winner.name}</span>
                  </div>
                </div>
                {tournament.runnerUp && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-yellow-700/30">
                    <div className="p-1.5 bg-gray-600/20 rounded-lg">
                      <Medal className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 font-medium">Runner-up</span>
                      <div className="text-white font-semibold">{tournament.runnerUp.name}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManage(tournament)}
                className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-600/40 text-purple-300 hover:from-purple-600/30 hover:to-blue-600/30 hover:border-purple-500/60 transition-all duration-200 font-medium h-9"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tournament)}
                className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-600/40 text-blue-300 hover:from-blue-600/30 hover:to-cyan-600/30 hover:border-blue-500/60 transition-all duration-200 font-medium h-9"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewHistory(tournament)}
                className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-emerald-600/40 text-emerald-300 hover:from-emerald-600/30 hover:to-green-600/30 hover:border-emerald-500/60 transition-all duration-200 font-medium h-9"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(tournament.id)}
                className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border-red-600/40 text-red-300 hover:from-red-600/30 hover:to-pink-600/30 hover:border-red-500/60 transition-all duration-200 font-medium h-9"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TournamentList;
