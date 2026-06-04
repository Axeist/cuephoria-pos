import React, { useMemo, useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Plus, MapPin, ArrowRightLeft, Radio, CircleDot, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import ReplaceLegacyStationsDialog from '@/components/station/ReplaceLegacyStationsDialog';
import StationTypeManager from '@/components/station/StationTypeManager';
import { useStationTypes } from '@/hooks/useStationTypes';
import { useStationCustomerIntel } from '@/hooks/stations/useStationCustomerIntel';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import { getStationTheme } from '@/utils/stationTheme';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { useLocation } from '@/context/LocationContext';
import { type Station } from '@/types/pos.types';
import { prefetchPOS } from '@/utils/viewTransition';
import { cn } from '@/lib/utils';

const typeSortWeight = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === 'ps5') return 0;
  if (normalized === '8ball') return 1;
  if (normalized === 'snooker') return 2;
  if (normalized === 'turf') return 3;
  if (normalized === 'vr') return 4;
  return 10;
};

const byNameNumber = (a: Station, b: Station) => {
  const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
  const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
  if (numA !== numB) return numA - numB;
  return a.name.localeCompare(b.name);
};

const Stations = () => {
  const { stations } = usePOS();
  const { activeLocation } = useLocation();
  const { stationTypes } = useStationTypes();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPinDialog, setOpenPinDialog] = useState(false);
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const visibleStations = useMemo(
    () => stations.filter((s) => s.category !== 'nit_event'),
    [stations]
  );

  const typeGroups = useMemo(() => {
    const map = new Map<string, Station[]>();
    for (const station of visibleStations) {
      const key = (station.type || 'unknown').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(station);
    }
    return [...map.entries()]
      .map(([type, grouped]) => ({
        type,
        stations: grouped.sort(byNameNumber),
        activeCount: grouped.filter((s) => s.isOccupied).length,
      }))
      .sort((a, b) => {
        const weight = typeSortWeight(a.type) - typeSortWeight(b.type);
        if (weight !== 0) return weight;
        return a.type.localeCompare(b.type);
      });
  }, [visibleStations]);

  const filteredStations = useMemo(() => {
    const list =
      typeFilter === 'all'
        ? visibleStations
        : visibleStations.filter((s) => (s.type || '').toLowerCase() === typeFilter);
    return [...list].sort((a, b) => {
      const tw = typeSortWeight(a.type) - typeSortWeight(b.type);
      if (tw !== 0) return tw;
      return byNameNumber(a, b);
    });
  }, [visibleStations, typeFilter]);

  const totalActive = visibleStations.filter((s) => s.isOccupied).length;
  const totalAvailable = visibleStations.length - totalActive;

  const activeCustomerIds = useMemo(
    () =>
      visibleStations
        .filter((s) => s.isOccupied && s.currentSession?.customerId)
        .map((s) => s.currentSession!.customerId),
    [visibleStations]
  );

  const { intel, loading: intelLoading } = useStationCustomerIntel(activeCustomerIds);

  useEffect(() => {
    prefetchPOS();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-3 pt-3 sm:p-5 sm:pt-5">
      {/* Command centre header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f0a1a] via-[#120818] to-[#0a0612] p-4 sm:p-5 shadow-[0_8px_40px_rgba(139,92,246,0.12)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-cuephoria-purple animate-pulse-soft" />
              <h2 className="gradient-text font-heading text-2xl font-bold sm:text-3xl">
                Station Command
              </h2>
            </div>
            {activeLocation && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {activeLocation.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl border border-orange-500/30 bg-orange-950/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-orange-300/80">
                <Zap className="h-3 w-3" />
                Live
              </div>
              <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-orange-200">
                {totalActive}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">
                <CircleDot className="h-3 w-3" />
                Open
              </div>
              <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-emerald-200">
                {totalAvailable}
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 px-4 py-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/80">
                Total
              </div>
              <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-violet-200">
                {visibleStations.length}
              </p>
            </div>
          </div>

          <div className="flex gap-2 lg:shrink-0">
            <Button size="sm" variant="outline" onClick={() => setOpenReplaceDialog(true)}>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Legacy
            </Button>
            <Button
              size="sm"
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
              onClick={() => setOpenPinDialog(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Station
            </Button>
          </div>
        </div>

        {/* Type filter chips */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              typeFilter === 'all'
                ? 'border-cuephoria-purple/60 bg-cuephoria-purple/20 text-white'
                : 'border-white/10 bg-black/30 text-muted-foreground hover:border-white/20'
            )}
          >
            All stations
            <span className="tabular-nums opacity-70">{visibleStations.length}</span>
          </button>
          {typeGroups.map((group) => {
            const theme = getStationTheme({ type: group.type });
            const Icon = theme.icon;
            const isActive = typeFilter === group.type;
            return (
              <button
                key={group.type}
                type="button"
                onClick={() => setTypeFilter(group.type)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? `${theme.border} bg-white/10 text-white`
                    : 'border-white/10 bg-black/30 text-muted-foreground hover:border-white/20'
                )}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? theme.accent : ''}`} />
                {stationTypeLabel(group.type, stationTypes)}
                <span className={`tabular-nums ${isActive ? theme.accentMuted : 'opacity-60'}`}>
                  {group.activeCount}/{group.stations.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <StationTypeManager />

      <PinVerificationDialog
        open={openPinDialog}
        onOpenChange={setOpenPinDialog}
        onSuccess={() => setOpenAddDialog(true)}
        title="Admin Access Required"
        description="Enter the admin PIN to add a new game station"
      />
      <AddStationDialog open={openAddDialog} onOpenChange={setOpenAddDialog} />
      <ReplaceLegacyStationsDialog
        open={openReplaceDialog}
        onOpenChange={setOpenReplaceDialog}
        onComplete={() => {}}
      />

      {/* Station cards — horizontal grid (side by side) */}
      <div
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
      >
        {filteredStations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-muted-foreground">
            No stations in this category
          </div>
        ) : (
          filteredStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              recentSessions={
                station.currentSession?.customerId
                  ? intel[station.currentSession.customerId]
                  : undefined
              }
              intelLoading={intelLoading}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Stations;
