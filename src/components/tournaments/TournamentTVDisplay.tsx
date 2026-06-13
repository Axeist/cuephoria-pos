import React, { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchTournaments } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament.types';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';
import FifaLapTimeBoard from './FifaLapTimeBoard';
import { TournamentMotionProvider } from './animations/TournamentMotionProvider';
import { AmbientTournamentBg } from './animations/AmbientTournamentBg';
import { WinnerBurst } from './animations/WinnerBurst';
import { formatLapTimeMs } from '@/types/tournament.types';
import { rankPlayersByLapTime } from '@/utils/tournament/lapTimeRanking';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Users } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface TournamentTVDisplayProps {
  locationId?: string | null;
  branchSlug?: string;
  /** Public TV — no staff chrome */
  publicMode?: boolean;
}

export default function TournamentTVDisplay({
  locationId,
  publicMode = false,
}: TournamentTVDisplayProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);

  const activeTournaments = tournaments.filter(
    (t) => t.status === 'in-progress' || t.status === 'upcoming',
  );
  const current = activeTournaments[slideIndex % Math.max(1, activeTournaments.length)];
  const rotationSec = current?.displayConfig?.tvRotationSeconds ?? 12;

  useEffect(() => {
    if (!locationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTournaments(locationId);
        if (!cancelled) setTournaments(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  useEffect(() => {
    if (!locationId) return;
    let channel: RealtimeChannel | null = null;
    channel = supabase
      .channel(`tournaments-tv-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `location_id=eq.${locationId}`,
        },
        async () => {
          const data = await fetchTournaments(locationId);
          setTournaments(data);
        },
      )
      .subscribe();
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [locationId]);

  useEffect(() => {
    if (activeTournaments.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % activeTournaments.length);
    }, rotationSec * 1000);
    return () => window.clearInterval(id);
  }, [activeTournaments.length, rotationSec]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <Trophy className="h-16 w-16 text-muted-foreground/40" />
        <p className="text-xl text-muted-foreground">No live tournaments — check back soon</p>
      </div>
    );
  }

  const isFifa = isTimeTrialFormat(current.tournamentFormat);
  const ranked = isFifa
    ? rankPlayersByLapTime(current.players, current.lapTimes ?? [], current.formatOptions?.bestLapCount ?? 1)
    : [];
  const leader = ranked[0];
  const currentMatch = current.matches?.find((m) => m.inProgress || (!m.completed && m.player1Id && m.player2Id));

  return (
    <TournamentMotionProvider intensity="full">
      <AmbientTournamentBg />
      <div className="relative min-h-[70vh] rounded-2xl border border-white/10 bg-black/40 p-4 md:p-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + slideIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.5 }}
          >
            {isFifa ? (
              <FifaLapTimeBoard
                tournament={current}
                players={current.players}
                lapTimes={current.lapTimes ?? []}
                onLapTimesChange={() => {}}
                tvMode
                readOnly
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Current match */}
                {currentMatch && (
                  <motion.div
                    className="rounded-2xl border border-primary/40 bg-primary/10 p-8 text-center"
                    animate={{ boxShadow: ['0 0 20px rgba(139,92,246,0.2)', '0 0 40px rgba(139,92,246,0.4)', '0 0 20px rgba(139,92,246,0.2)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <p className="text-xs uppercase tracking-widest text-primary/70 mb-4">Now playing</p>
                    <div className="flex items-center justify-center gap-6">
                      <span className="text-3xl md:text-5xl font-bold">
                        {current.players.find((p) => p.id === currentMatch.player1Id)?.name ?? 'TBD'}
                      </span>
                      <span className="text-2xl text-muted-foreground">VS</span>
                      <span className="text-3xl md:text-5xl font-bold">
                        {current.players.find((p) => p.id === currentMatch.player2Id)?.name ?? 'TBD'}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Leader / winner spotlight */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    {current.name}
                  </p>
                  {current.winner ? (
                    <WinnerBurst show winnerName={current.winner.name} subtitle="Tournament leader" />
                  ) : leader ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-emerald-300/80 mb-2">Fastest lap</p>
                      <p className="text-4xl font-bold">{leader.player.name}</p>
                      <p className="font-mono text-2xl text-emerald-300 mt-2">
                        {formatLapTimeMs(leader.bestLapMs)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-40" />
                      <span>{current.players.length} players registered</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {publicMode && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            Live · {activeTournaments.length} event{activeTournaments.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </TournamentMotionProvider>
  );
}
