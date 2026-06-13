import React from 'react';
import { motion } from 'framer-motion';
import { TournamentFormat } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, Zap, Timer, Target, Sparkles, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentFormatSelectorProps {
  selectedFormat: TournamentFormat;
  onFormatChange: (format: TournamentFormat) => void;
  maxPlayers: number;
  gameTitle?: string;
}

const TournamentFormatSelector: React.FC<TournamentFormatSelectorProps> = ({
  selectedFormat,
  onFormatChange,
  maxPlayers,
  gameTitle,
}) => {
  const formatOptions: {
    format: TournamentFormat;
    title: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
    estimatedMatches: number;
    estimatedDuration: string;
    highlight?: boolean;
  }[] = [
    {
      format: 'time_trial',
      title: 'FIFA Time Trial',
      description: 'Fastest lap wins — live leaderboard, no bracket. Perfect for racing & FIFA.',
      icon: <Timer className="h-5 w-5" />,
      accent: 'from-emerald-500/30 to-cyan-500/20 border-emerald-400/50',
      estimatedMatches: 0,
      estimatedDuration: 'Flexible',
      highlight: gameTitle?.toUpperCase().includes('FIFA') || gameTitle?.toUpperCase().includes('FC'),
    },
    {
      format: 'knockout',
      title: 'Knockout',
      description: 'Single elimination — lose once and you are out',
      icon: <Target className="h-5 w-5" />,
      accent: 'from-red-500/20 to-pink-500/20 border-red-400/40',
      estimatedMatches: maxPlayers > 0 ? maxPlayers - 1 : 0,
      estimatedDuration: 'Short–Medium',
    },
    {
      format: 'double_elimination',
      title: 'Double Elimination',
      description: 'Winners + losers bracket with grand final',
      icon: <Layers className="h-5 w-5" />,
      accent: 'from-orange-500/20 to-red-500/20 border-orange-400/40',
      estimatedMatches: maxPlayers > 0 ? maxPlayers * 2 - 2 : 0,
      estimatedDuration: 'Medium',
    },
    {
      format: 'league',
      title: 'League',
      description: 'Round-robin — everyone plays everyone',
      icon: <Users className="h-5 w-5" />,
      accent: 'from-purple-500/20 to-violet-500/20 border-purple-400/40',
      estimatedMatches: maxPlayers > 1 ? (maxPlayers * (maxPlayers - 1)) / 2 : 0,
      estimatedDuration: 'Medium–Long',
    },
    {
      format: 'round_robin',
      title: 'Round Robin',
      description: 'All-play-all groups',
      icon: <Trophy className="h-5 w-5" />,
      accent: 'from-blue-500/20 to-indigo-500/20 border-blue-400/40',
      estimatedMatches: maxPlayers > 1 ? (maxPlayers * (maxPlayers - 1)) / 2 : 0,
      estimatedDuration: 'Medium',
    },
    {
      format: 'swiss',
      title: 'Swiss System',
      description: 'Pair by score each round — fair for large fields',
      icon: <Sparkles className="h-5 w-5" />,
      accent: 'from-teal-500/20 to-green-500/20 border-teal-400/40',
      estimatedMatches: maxPlayers > 1 ? maxPlayers * 3 : 0,
      estimatedDuration: 'Medium',
    },
    {
      format: 'custom',
      title: 'Custom Bracket',
      description: 'Build and edit pairings manually',
      icon: <Zap className="h-5 w-5" />,
      accent: 'from-violet-500/20 to-purple-500/20 border-violet-400/40',
      estimatedMatches: 0,
      estimatedDuration: 'Custom',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose format — FIFA time trial uses lap times instead of brackets
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formatOptions.map((option, i) => (
          <motion.div
            key={option.format}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 h-full',
                selectedFormat === option.format
                  ? `border-2 bg-gradient-to-br ${option.accent} shadow-lg shadow-primary/10`
                  : 'border-white/10 hover:border-white/25',
                option.highlight && selectedFormat !== option.format && 'ring-1 ring-emerald-400/30',
              )}
              onClick={() => onFormatChange(option.format)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <CardTitle className="text-base">{option.title}</CardTitle>
                  </div>
                  {selectedFormat === option.format && (
                    <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                  )}
                  {option.highlight && option.format === 'time_trial' && (
                    <Badge variant="outline" className="text-emerald-300 border-emerald-400/50 text-[10px]">
                      Recommended for FIFA
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </CardHeader>
              <CardContent className="flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {option.estimatedDuration}
                </span>
                {option.format !== 'time_trial' && (
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    ~{option.estimatedMatches} matches
                  </span>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TournamentFormatSelector;
