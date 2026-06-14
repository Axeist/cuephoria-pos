import React, { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchTournaments } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament.types';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';
import TournamentTVTimeTrial from './TournamentTVTimeTrial';
import TournamentTVBracket from './TournamentTVBracket';
import { TournamentTVEventSwitcher } from './TournamentTVEventSwitcher';
import { TournamentMotionProvider } from './animations/TournamentMotionProvider';
import { TournamentTVBrandProvider } from './tournamentTVBrand';
import { useTournamentTVBrand } from '@/hooks/useTournamentTVBrand';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Radio } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface TournamentTVDisplayProps {
  locationId?: string | null;
  branchSlug?: string;
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
  branchSlug,
}: TournamentTVDisplayProps) {
  const brand = useTournamentTVBrand({ locationId, branchSlug });
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  const activeTournaments = tournaments.filter(
    (t) => t.status === 'in-progress' || t.status === 'upcoming',
  );
  const safeIndex = activeTournaments.length
    ? selectedIndex % activeTournaments.length
    : 0;
  const current = activeTournaments[safeIndex];
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
    if (selectedIndex >= activeTournaments.length && activeTournaments.length > 0) {
      setSelectedIndex(0);
    }
  }, [activeTournaments.length, selectedIndex]);

  useEffect(() => {
    if (!autoRotate || activeTournaments.length <= 1) return;
    const id = window.setInterval(() => {
      setSelectedIndex((i) => (i + 1) % activeTournaments.length);
    }, rotationSec * 1000);
    return () => window.clearInterval(id);
  }, [autoRotate, activeTournaments.length, rotationSec]);

  const handleSelectEvent = (index: number) => {
    setSelectedIndex(index);
    setAutoRotate(false);
  };

  if (loading) return <TVLoadingScreen />;
  if (!current) return <TVEmptyScreen />;

  const isFifa = isTimeTrialFormat(current.tournamentFormat);

  const eventSwitcher =
    activeTournaments.length > 1 ? (
      <TournamentTVEventSwitcher
        tournaments={activeTournaments}
        selectedIndex={safeIndex}
        onSelect={handleSelectEvent}
        autoRotate={autoRotate}
        onResumeAutoRotate={() => setAutoRotate(true)}
        rotationSec={rotationSec}
        primaryHex={brand.primaryHex}
      />
    ) : null;

  return (
    <TournamentTVBrandProvider value={brand}>
      <TournamentMotionProvider intensity="full">
        <div className="relative min-h-screen w-full bg-[#030712]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id + safeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="min-h-screen"
            >
              {isFifa ? (
                <TournamentTVTimeTrial tournament={current} eventSwitcher={eventSwitcher} />
              ) : (
                <TournamentTVBracket tournament={current} eventSwitcher={eventSwitcher} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </TournamentMotionProvider>
    </TournamentTVBrandProvider>
  );
}
