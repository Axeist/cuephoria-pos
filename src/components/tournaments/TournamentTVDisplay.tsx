import React, { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchTournaments } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament.types';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';
import TournamentTVTimeTrial from './TournamentTVTimeTrial';
import TournamentTVBracket from './TournamentTVBracket';
import { TournamentMotionProvider } from './animations/TournamentMotionProvider';
import { TournamentTVBrandProvider } from './tournamentTVBrand';
import { useTournamentTVBrand } from '@/hooks/useTournamentTVBrand';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Radio, Sparkles, ChevronDown, RotateCcw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

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

function EventSelector({
  tournaments,
  selectedIndex,
  onSelect,
  autoRotate,
  onResumeAutoRotate,
  rotationSec,
  primaryHex,
}: {
  tournaments: Tournament[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  autoRotate: boolean;
  onResumeAutoRotate: () => void;
  rotationSec: number;
  primaryHex: string;
}) {
  const [open, setOpen] = useState(false);

  if (tournaments.length <= 1) return null;

  const current = tournaments[selectedIndex];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/70 backdrop-blur-md px-2 py-1.5 shadow-xl">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5 transition-colors min-w-[200px] max-w-[min(90vw,420px)]"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: primaryHex }} />
            <span className="flex-1 truncate text-sm font-semibold text-white">{current?.name ?? 'Select event'}</span>
            <ChevronDown className={cn('h-4 w-4 text-white/50 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/15 bg-black/90 backdrop-blur-md overflow-hidden shadow-2xl">
                {tournaments.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect(i);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0',
                      i === selectedIndex
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-white/70 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <span className="block truncate">{t.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/35 mt-0.5">
                      {t.status === 'in-progress' ? 'Live' : 'Upcoming'}
                      {isTimeTrialFormat(t.tournamentFormat) ? ' · Time trial' : ' · Bracket'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!autoRotate && (
          <button
            type="button"
            onClick={onResumeAutoRotate}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            title={`Resume auto-rotate every ${rotationSec}s`}
          >
            <RotateCcw className="h-3 w-3" />
            Auto
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 backdrop-blur px-3 py-1.5">
        {tournaments.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Show ${t.name}`}
            className={cn(
              'h-2 rounded-full transition-all',
              i === selectedIndex ? 'w-6' : 'w-2 bg-white/20 hover:bg-white/40',
            )}
            style={i === selectedIndex ? { backgroundColor: primaryHex } : undefined}
          />
        ))}
      </div>
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

  return (
    <TournamentTVBrandProvider value={brand}>
      <TournamentMotionProvider intensity="full">
        <div className="relative min-h-screen w-full bg-[#030712]">
          <EventSelector
            tournaments={activeTournaments}
            selectedIndex={safeIndex}
            onSelect={handleSelectEvent}
            autoRotate={autoRotate}
            onResumeAutoRotate={() => setAutoRotate(true)}
            rotationSec={rotationSec}
            primaryHex={brand.primaryHex}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id + safeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className={cn('min-h-screen', activeTournaments.length > 1 && 'pt-20')}
            >
              {isFifa ? (
                <TournamentTVTimeTrial tournament={current} />
              ) : (
                <TournamentTVBracket tournament={current} />
              )}
            </motion.div>
          </AnimatePresence>

          {activeTournaments.length > 0 && (
            <div className="fixed top-4 right-4 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50">
              <Radio className="h-3 w-3 text-red-400 animate-pulse" />
              Live · {activeTournaments.length} event{activeTournaments.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </TournamentMotionProvider>
    </TournamentTVBrandProvider>
  );
}
