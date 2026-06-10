
import React from 'react';
import { Tournament } from '@/types/tournament.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  Trash2,
  History,
  Users,
  Trophy,
  Calendar,
  Settings,
  MoreHorizontal,
  Crown,
} from 'lucide-react';
import { format } from 'date-fns';

interface TournamentListProps {
  tournaments: Tournament[];
  onEdit: (tournament: Tournament) => void;
  onManage: (tournament: Tournament) => void;
  onDelete: (id: string) => void;
  onViewHistory: (tournament: Tournament) => void;
}

const statusLabel: Record<string, string> = {
  upcoming: 'Upcoming',
  'in-progress': 'Live',
  completed: 'Completed',
};

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  onEdit,
  onManage,
  onDelete,
  onViewHistory,
}) => {
  if (tournaments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-12 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-60" />
        <p className="text-sm font-medium">No tournaments yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Create a tournament to run brackets and track winners at this branch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tournaments.map((tournament) => (
        <div
          key={tournament.id}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 sm:px-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-1 sm:gap-3 sm:items-center">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{tournament.name}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(tournament.date), 'dd MMM yyyy')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {tournament.players.length}
                  {tournament.maxPlayers ? ` / ${tournament.maxPlayers}` : ''} players
                </span>
                <span>
                  {tournament.gameType}
                  {tournament.gameVariant ? ` · ${tournament.gameVariant}` : ''}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5 capitalize">
                {statusLabel[tournament.status] ?? tournament.status}
              </Badge>
              <Badge variant="secondary" className="text-[10px] h-5 capitalize">
                {tournament.tournamentFormat === 'knockout' ? 'Knockout' : 'League'}
              </Badge>
              {tournament.winner && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/90">
                  <Crown className="h-3 w-3" />
                  {tournament.winner.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:justify-end">
              <Button size="sm" variant="outline" className="h-8 hidden sm:inline-flex" onClick={() => onManage(tournament)}>
                Manage
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onManage(tournament)}>
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Manage bracket
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(tournament)}>
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewHistory(tournament)}>
                    <History className="h-3.5 w-3.5 mr-2" />
                    View history
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(tournament.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentList;
