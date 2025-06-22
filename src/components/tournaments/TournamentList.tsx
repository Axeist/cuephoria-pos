
import React from 'react';
import { Tournament } from '@/types/tournament.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, History, Users, Trophy, Calendar, Settings } from 'lucide-react';
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'knockout':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'league':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (tournaments.length === 0) {
    return (
      <Card className="bg-gray-950/50 border-gray-800">
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No Tournaments Yet</h3>
          <p className="text-gray-500">Create your first tournament to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="bg-gray-950/50 border-gray-800 hover:border-gray-700 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-semibold text-white truncate">
                {tournament.name}
              </CardTitle>
              <div className="flex gap-1">
                <Badge variant="outline" className={getStatusColor(tournament.status)}>
                  {tournament.status}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={getFormatColor(tournament.tournamentFormat)}>
                {tournament.tournamentFormat === 'knockout' ? 'Knockout' : 'League'}
              </Badge>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                {tournament.gameType} {tournament.gameVariant || tournament.gameTitle || ''}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(tournament.date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4" />
                <span>{tournament.players.length}/{tournament.maxPlayers || 16}</span>
              </div>
            </div>

            {tournament.winner && (
              <div className="p-3 bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 rounded-lg border border-yellow-800/30">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-200">Winner: {tournament.winner.name}</span>
                </div>
                {tournament.runnerUp && (
                  <div className="text-xs text-gray-400 mt-1">
                    Runner-up: {tournament.runnerUp.name}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManage(tournament)}
                className="flex-1 bg-purple-600/20 border-purple-600/30 text-purple-300 hover:bg-purple-600/30"
              >
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tournament)}
                className="bg-blue-600/20 border-blue-600/30 text-blue-300 hover:bg-blue-600/30"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewHistory(tournament)}
                className="bg-green-600/20 border-green-600/30 text-green-300 hover:bg-green-600/30"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(tournament.id)}
                className="bg-red-600/20 border-red-600/30 text-red-300 hover:bg-red-600/30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TournamentList;
