import React, { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchTournaments } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament.types';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';
import TournamentTVTimeTrial from './TournamentTVTimeTrial';
import TournamentTVBracket from './TournamentTVBracket';
import { TournamentMotionProvider } from './animations/TournamentMotionProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Radio, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface TournamentTVDisplayProps {
  locationId?: string | null;
  branchSlug?: string;
  /** Public TV — no staff chrome */
  publicMode?: boolean;
}

function TVLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#030712]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="rounded-full border-2 border-emerald-500/30 border-t-emerald-400 p-1"
      >
        <LoadingSpinner />
      </motion.div>
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/60 font-semibold">Loading live board</p>
    </div>
  );
}

function TVEmptyScreen() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-6 overflow-hidden bg-[#030712] px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12),transparent_60%)]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-md"
      >
        <Trophy className="h-20 w-20 text-amber-400/40 mx-auto mb-6" />
        <h2 className="text-3xl md:text-4xl font-black text-white mb-3">No live events</h2>
        <p className="text-lg text-white/45 max-w-md">
          Tournaments appear here when they are upcoming or in progress. Check back soon for live standings.
        </p>
        <div className="flex items-center justify-center gap-2 mt-8 text-xs uppercase tracking-widest text-white/30">
          <Radio className="h-3 w-3" />
          Standby
        </div>
      </motion.div>
    </div>
  );
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
  const rotationSec = current?.displayConfig?.tvRotationSeconds ?? 15;

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

  if (loading) return <TVLoadingScreen />;
  if (!current) return <TVEmptyScreen />;

  const isFifa = isTimeTrialFormat(current.tournamentFormat);

  return (
    <TournamentMotionProvider intensity="full">
      <div className="relative min-h-screen w-full bg-[#030712]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + slideIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen"
          >
            {isFifa ? (
              <TournamentTVTimeTrial tournament={current} />
            ) : (
              <TournamentTVBracket tournament={current} />
            )}
          </motion.div>
        </AnimatePresence>

        {activeTournaments.length > 1 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-md px-4 py-2 z-50">
            <Sparkles className="h-3 w-3 text-violet-400" />
            {activeTournaments.map((t, i) => (
              <span
                key={t.id}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === slideIndex % activeTournaments.length
                    ? 'bg-emerald-400 w-6'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        )}

        {publicMode && activeTournaments.length > 0 && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50">
            <Radio className="h-3 w-3 text-red-400 animate-pulse" />
            Live · {activeTournaments.length} event{activeTournaments.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </TournamentMotionProvider>
  );
}
