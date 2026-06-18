import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Users, Timer } from 'lucide-react';
import type { Tournament } from '@/types/tournament.types';
import { cn } from '@/lib/utils';

interface TournamentHubStatsProps {
  tournaments: Tournament[];
}

export default function TournamentHubStats({ tournaments }: TournamentHubStatsProps) {
  const stats = useMemo(() => {
    const live = tournaments.filter((t) => t.status === 'in-progress').length;
    const upcoming = tournaments.filter((t) => t.status === 'upcoming').length;
    const completed = tournaments.filter((t) => t.status === 'completed').length;
    const players = tournaments.reduce((sum, t) => sum + (t.players?.length ?? 0), 0);
    const fifa = tournaments.filter((t) => t.tournamentFormat === 'time_trial').length;
    return { total: tournaments.length, live, upcoming, completed, players, fifa };
  }, [tournaments]);

  const cards = [
    {
      label: 'Total events',
      value: stats.total,
      sub: `${stats.upcoming} upcoming`,
      icon: Trophy,
      accent: 'from-purple-500/20 to-violet-600/10 border-purple-400/30 text-purple-200',
    },
    {
      label: 'Live now',
      value: stats.live,
      sub: stats.live > 0 ? 'In progress' : 'None active',
      icon: Zap,
      accent: 'from-emerald-500/20 to-cyan-600/10 border-emerald-400/30 text-emerald-200',
      pulse: stats.live > 0,
    },
    {
      label: 'Registered players',
      value: stats.players,
      sub: `${stats.completed} completed`,
      icon: Users,
      accent: 'from-blue-500/20 to-indigo-600/10 border-blue-400/30 text-blue-200',
    },
    {
      label: 'FIFA / lap events',
      value: stats.fifa,
      sub: 'Time trial format',
      icon: Timer,
      accent: 'from-cyan-500/20 to-teal-600/10 border-cyan-400/30 text-cyan-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 lg:p-5',
            card.accent,
          )}
        >
          {card.pulse && (
            <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-medium">{card.label}</p>
              <p className="text-3xl lg:text-4xl font-bold mt-1 tabular-nums">{card.value}</p>
              <p className="text-xs opacity-60 mt-1">{card.sub}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
              <card.icon className="h-5 w-5 opacity-90" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
