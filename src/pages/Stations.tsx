import React, { useMemo, useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Plus, MapPin, ArrowRightLeft, Radio, CircleDot, Zap, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import ReplaceLegacyStationsDialog from '@/components/station/ReplaceLegacyStationsDialog';
import { StationTypesDialog } from '@/components/station/StationTypeManager';
import { useStationTypes } from '@/hooks/useStationTypes';
import { useStationCustomerIntel } from '@/hooks/stations/useStationCustomerIntel';
import { useStationGridLayout } from '@/hooks/stations/useStationGridLayout';
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
  const [openTypesDialog, setOpenTypesDialog] = useState(false);
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
  const { gridRef, layout } = useStationGridLayout(filteredStations.length);

  useEffect(() => {
    prefetchPOS();
  }, []);

  return (
    <div className="flex h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] flex-col overflow-hidden p-3 pt-2 sm:p-4 sm:pt-3 md:h-[calc(100dvh-3.25rem)]">
      {/* Compact command bar */}
      <div className="mb-2 shrink-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <Radio className="h-4 w-4 shrink-0 text-cuephoria-purple animate-pulse-soft" />
            <div className="min-w-0">
              <h2 className="gradient-text font-heading text-base font-bold leading-tight sm:text-lg">
                Station Command
              </h2>
              {activeLocation && (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {activeLocation.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-950/30 px-2 py-1">
              <Zap className="h-3 w-3 text-orange-400" />
              <span className="font-mono text-sm font-bold tabular-nums text-orange-200">{totalActive}</span>
              <span className="text-[9px] uppercase text-orange-300/70">live</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2 py-1">
              <CircleDot className="h-3 w-3 text-emerald-400" />
              <span className="font-mono text-sm font-bold tabular-nums text-emerald-200">{totalAvailable}</span>
              <span className="text-[9px] uppercase text-emerald-300/70">open</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-950/30 px-2 py-1">
              <span className="font-mono text-sm font-bold tabular-nums text-violet-200">
                {visibleStations.length}
              </span>
              <span className="text-[9px] uppercase text-violet-300/70">total</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all',
                typeFilter === 'all'
                  ? 'border-cuephoria-purple/60 bg-cuephoria-purple/20 text-white'
                  : 'border-white/10 bg-black/30 text-muted-foreground hover:border-white/20'
              )}
            >
              All
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
                    'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all',
                    isActive
                      ? `${theme.border} bg-white/10 text-white`
                      : 'border-white/10 bg-black/30 text-muted-foreground hover:border-white/20'
                  )}
                >
                  <Icon className={`h-3 w-3 ${isActive ? theme.accent : ''}`} />
                  {stationTypeLabel(group.type, stationTypes)}
                  <span className={`tabular-nums ${isActive ? theme.accentMuted : 'opacity-60'}`}>
                    {group.activeCount}/{group.stations.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpenReplaceDialog(true)}>
              <ArrowRightLeft className="mr-1 h-3 w-3" />
              Legacy
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpenTypesDialog(true)}>
              <Layers className="mr-1 h-3 w-3" />
              Types
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-cuephoria-purple hover:bg-cuephoria-purple/80"
              onClick={() => setOpenPinDialog(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Station
            </Button>
          </div>
        </div>
      </div>

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
      <StationTypesDialog open={openTypesDialog} onOpenChange={setOpenTypesDialog} />

      {/* Square tile grid — fills remaining viewport, no page scroll */}
      <div ref={gridRef} className="min-h-0 flex-1 overflow-hidden">
        {filteredStations.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-muted-foreground">
            No stations in this category
          </div>
        ) : (
          <div
            className="grid h-full w-full place-content-center"
            style={{
              gap: layout.gap,
              gridTemplateColumns: `repeat(${layout.cols}, ${layout.tileSize}px)`,
              gridTemplateRows: `repeat(${layout.rows}, ${layout.tileSize}px)`,
            }}
          >
            {filteredStations.map((station) => (
              <div key={station.id} className="min-h-0 min-w-0">
                <StationCard
                  station={station}
                  recentSessions={
                    station.currentSession?.customerId
                      ? intel[station.currentSession.customerId]
                      : undefined
                  }
                  intelLoading={intelLoading}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stations;
