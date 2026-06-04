import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import MultiStartSessionDialog from '@/components/station/MultiStartSessionDialog';
import { Plus, MapPin, Radio, CircleDot, Zap, Layers, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import { StationTypesDialog } from '@/components/station/StationTypeManager';
import { useStationTypes } from '@/hooks/useStationTypes';
import { useStationCustomerIntel } from '@/hooks/stations/useStationCustomerIntel';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import { getStationTheme } from '@/utils/stationTheme';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { usePinVerification } from '@/hooks/usePinVerification';
import { useLocation } from '@/context/LocationContext';
import { type Station } from '@/types/pos.types';
import { prefetchPOS } from '@/utils/viewTransition';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/utils/pos.utils';
import type { MultiSessionStartItem } from '@/components/station/MultiStartSessionDialog';

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
  const { stations, startSession } = usePOS();
  const { toast } = useToast();
  const { activeLocation } = useLocation();
  const { stationTypes } = useStationTypes();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const {
    showPinDialog,
    requestPinVerification,
    handlePinSuccess,
    handlePinCancel,
  } = usePinVerification();
  const [openTypesDialog, setOpenTypesDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedStationIds, setSelectedStationIds] = useState<Set<string>>(new Set());
  const [openMultiStartDialog, setOpenMultiStartDialog] = useState(false);

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

  const toggleStationSelection = useCallback((stationId: string) => {
    setSelectedStationIds((prev) => {
      const next = new Set(prev);
      if (next.has(stationId)) next.delete(stationId);
      else next.add(stationId);
      return next;
    });
  }, []);

  const selectedStations = useMemo(
    () => visibleStations.filter((s) => selectedStationIds.has(s.id) && !s.isOccupied),
    [visibleStations, selectedStationIds]
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedStationIds(new Set());
  }, []);

  const handleMultiStart = async (
    customerId: string,
    customerName: string,
    couponCode: string | undefined,
    sessions: MultiSessionStartItem[]
  ) => {
    let started = 0;
    const failed: string[] = [];
    const sessionGroupId = generateId();

    for (const item of sessions) {
      const station = stations.find((s) => s.id === item.stationId);
      try {
        await startSession(
          item.stationId,
          customerId,
          item.finalRate,
          couponCode,
          item.playerCount,
          item.perPersonRate,
          item.plannedDurationMinutes,
          sessionGroupId
        );
        started += 1;
      } catch {
        failed.push(station?.name ?? item.stationId);
      }
    }

    exitSelectionMode();
    setOpenMultiStartDialog(false);

    if (started === sessions.length) {
      toast({
        title: 'Sessions started',
        description: `${customerName} · ${started} station${started === 1 ? '' : 's'}`,
      });
    } else if (started > 0) {
      toast({
        title: 'Partially started',
        description: `${started} started${failed.length ? ` · failed: ${failed.join(', ')}` : ''}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Could not start sessions',
        description: 'All selected stations failed to start.',
        variant: 'destructive',
      });
      throw new Error('All failed');
    }
  };

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

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            {selectionMode && selectedStations.length > 0 && (
              <>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {selectedStations.length} selected
                </span>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                  onClick={() => setOpenMultiStartDialog(true)}
                >
                  Start together ({selectedStations.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  onClick={() => setSelectedStationIds(new Set())}
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant={selectionMode ? 'default' : 'outline'}
              className={selectionMode ? 'bg-cuephoria-purple hover:bg-cuephoria-purple/80' : ''}
              onClick={() => {
                if (selectionMode) exitSelectionMode();
                else setSelectionMode(true);
              }}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {selectionMode ? 'Cancel select' : 'Group start'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpenTypesDialog(true)}>
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Types
            </Button>
            <Button
              size="sm"
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
              onClick={() =>
                requestPinVerification(() => setOpenAddDialog(true), { requireForAdmin: true })
              }
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

        {selectionMode && (
          <p className="mt-3 border-t border-white/8 pt-3 text-center text-xs text-cuephoria-lightpurple">
            Tap open stations to select · use <strong className="font-semibold">Start together</strong> in the header when ready
          </p>
        )}
      </div>

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          if (!open) handlePinCancel();
        }}
        onSuccess={handlePinSuccess}
        title="Admin Access Required"
        description="Enter the admin PIN to add a new game station"
      />
      <AddStationDialog open={openAddDialog} onOpenChange={setOpenAddDialog} />
      <StationTypesDialog open={openTypesDialog} onOpenChange={setOpenTypesDialog} />

      <MultiStartSessionDialog
        open={openMultiStartDialog}
        onOpenChange={setOpenMultiStartDialog}
        stations={selectedStations}
        onConfirm={handleMultiStart}
      />

      {/* Station cards — horizontal grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {filteredStations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-muted-foreground">
            No stations in this category
          </div>
        ) : (
          filteredStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              selectionMode={selectionMode}
              selected={selectedStationIds.has(station.id)}
              onToggleSelect={toggleStationSelection}
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
