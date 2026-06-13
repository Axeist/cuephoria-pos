
import React from 'react';
import { motion } from 'framer-motion';
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
  Timer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TournamentListProps {
  tournaments: Tournament[];
  onEdit: (tournament: Tournament) => void;
  onManage: (tournament: Tournament) => void;
  onDelete: (id: string) => void;
  onViewHistory: (tournament: Tournament) => void;
  isLoading?: boolean;
  canManage?: boolean;
  onCreateClick?: () => void;
}

const formatLabel: Record<string, string> = {
  knockout: 'Knockout',
  league: 'League',
  double_elimination: 'Double elim',
  round_robin: 'Round robin',
  swiss: 'Swiss',
  custom: 'Custom',
  time_trial: 'FIFA Time Trial',
};

const formatAccent: Record<string, string> = {
  time_trial: 'from-emerald-500/15 to-cyan-600/5 border-emerald-500/30',
  knockout: 'from-red-500/15 to-pink-600/5 border-red-500/25',
  league: 'from-purple-500/15 to-violet-600/5 border-purple-500/25',
  default: 'from-primary/10 to-primary/5 border-primary/20',
};

const statusStyle: Record<string, string> = {
  upcoming: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
  'in-progress': 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30 animate-pulse',
  completed: 'bg-slate-500/15 text-slate-200 border-slate-400/30',
};

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  onEdit,
  onManage,
  onDelete,
  onViewHistory,
  canManage = true,
  onCreateClick,
}) => {
  if (tournaments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl border border-dashed border-white/15 bg-gradient-to-br from-purple-950/20 via-transparent to-cyan-950/20 p-12 lg:p-16 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)]" />
        <div className="relative">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/30 to-cyan-500/20 border border-white/10">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">No tournaments yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Run FIFA lap-time events, knockout brackets, or league nights — then show them live on TV.
          </p>
          {canManage && onCreateClick && (
            <Button onClick={onCreateClick} className="btn-gradient gap-2 px-8 h-11">
              <Sparkles className="h-4 w-4" />
              Launch your first tournament
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tournaments.map((tournament, i) => {
        const fmt = tournament.tournamentFormat;
        const accent = formatAccent[fmt] ?? formatAccent.default;
        const isFifa = fmt === 'time_trial';

        return (
          <motion.article
            key={tournament.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              'group relative flex flex-col rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-[0_0_40px_-12px_var(--brand-primary-hex)] hover:border-primary/30',
              accent,
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                {isFifa ? <Timer className="h-5 w-5 text-emerald-400" /> : <Trophy className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn('text-[10px] capitalize border', statusStyle[tournament.status])}>
                  {tournament.status === 'in-progress' ? 'Live' : tournament.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onManage(tournament)}>
                      <Settings className="h-3.5 w-3.5 mr-2" /> Manage
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(tournament)}>
                      <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewHistory(tournament)}>
                      <History className="h-3.5 w-3.5 mr-2" /> History
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(tournament.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <h3 className="font-semibold text-lg leading-tight truncate mb-1">{tournament.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {formatLabel[fmt] ?? fmt}
              {tournament.gameTitle ? ` · ${tournament.gameTitle}` : ` · ${tournament.gameType}`}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs mb-5">
              <div className="rounded-lg bg-black/20 px-3 py-2 border border-white/5">
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</span>
                <p className="font-medium mt-0.5">{format(new Date(tournament.date), 'dd MMM yyyy')}</p>
              </div>
              <div className="rounded-lg bg-black/20 px-3 py-2 border border-white/5">
                <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Players</span>
                <p className="font-medium mt-0.5">
                  {tournament.players.length}
                  {tournament.maxPlayers ? ` / ${tournament.maxPlayers}` : ''}
                </p>
              </div>
            </div>

            {tournament.winner && (
              <div className="flex items-center gap-2 text-xs text-amber-200/90 mb-4 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Crown className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tournament.winner.name}</span>
              </div>
            )}

            <Button
              className="mt-auto w-full gap-2 group/btn"
              variant="secondary"
              onClick={() => onManage(tournament)}
            >
              Open event
              <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </motion.article>
        );
      })}
    </div>
  );
};

export default TournamentList;
