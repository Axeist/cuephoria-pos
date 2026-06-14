import React, { useState } from 'react';
import type { Tournament } from '@/types/tournament.types';
import { isTimeTrialFormat } from '@/utils/tournament/lapTimeRanking';
import { ChevronDown, Layers, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TournamentTVEventSwitcherProps {
  tournaments: Tournament[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  autoRotate: boolean;
  onResumeAutoRotate: () => void;
  rotationSec: number;
  primaryHex: string;
}

export function TournamentTVEventSwitcher({
  tournaments,
  selectedIndex,
  onSelect,
  autoRotate,
  onResumeAutoRotate,
  rotationSec,
  primaryHex,
}: TournamentTVEventSwitcherProps) {
  const [open, setOpen] = useState(false);

  if (tournaments.length <= 1) return null;

  const current = tournaments[selectedIndex];

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1">
        {tournaments.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Show ${t.name}`}
            aria-current={i === selectedIndex ? 'true' : undefined}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === selectedIndex ? 'w-4' : 'w-1.5 bg-white/25 hover:bg-white/45',
            )}
            style={i === selectedIndex ? { backgroundColor: primaryHex } : undefined}
          />
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 backdrop-blur-md px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
        >
          <Layers className="h-3.5 w-3.5 shrink-0 text-white/50" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            {selectedIndex + 1}/{tournaments.length}
          </span>
          <span className="hidden sm:inline text-xs text-white/90 max-w-[160px] truncate">
            {current?.name}
          </span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-white/45 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute top-full right-0 mt-1 z-50 min-w-[min(90vw,280px)] rounded-xl border border-white/15 bg-black/95 backdrop-blur-md overflow-hidden shadow-2xl">
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
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-white/55 hover:text-white hover:bg-white/5 transition-colors"
          title={`Resume auto-rotate every ${rotationSec}s`}
        >
          <RotateCcw className="h-3 w-3" />
          Auto
        </button>
      )}
    </div>
  );
}
