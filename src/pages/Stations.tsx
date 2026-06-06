import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import MultiStartSessionDialog from '@/components/station/MultiStartSessionDialog';
import {
  Plus,
  MapPin,
  ArrowRightLeft,
  Radio,
  CircleDot,
  Zap,
  Layers,
  Users,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import ReplaceLegacyStationsDialog from '@/components/station/ReplaceLegacyStationsDialog';
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
import {
  byNameNumber,
  filterByOccupancy,
  loadLocalStationOrder,
  loadStationSortMode,
  reorderStationIds,
  saveLocalStationOrder,
  saveStationSortMode,
  sortStations,
  type StationOccupancyFilter,
  type StationSortMode,
} from '@/utils/stationSort.utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const typeSortWeight = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === 'ps5') return 0;
  if (normalized === '8ball') return 1;
  if (normalized === 'snooker') return 2;
  if (normalized === 'turf') return 3;
  if (normalized === 'vr') return 4;
  return 10;
};

const Stations = () => {
  const { stations, startSession, refreshStations, reorderStations } = usePOS();
  const { toast } = useToast();
  const { activeLocation, activeLocationId } = useLocation();
  const { stationTypes } = useStationTypes();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const {
    showPinDialog,
    requestPinVerification,
    handlePinSuccess,
    handlePinCancel,
  } = usePinVerification();
  const [openTypesDialog, setOpenTypesDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<StationOccupancyFilter>('all');
  const [sortMode, setSortMode] = useState<StationSortMode>('custom');
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedStationIds, setSelectedStationIds] = useState<Set<string>>(new Set());
  const [openMultiStartDialog, setOpenMultiStartDialog] = useState(false);

  useEffect(() => {
    if (!activeLocationId) return;
    setSortMode(loadStationSortMode(activeLocationId));
    setLocalOrder(loadLocalStationOrder(activeLocationId));
  }, [activeLocationId]);

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
    let list =
      typeFilter === 'all'
        ? visibleStations
        : visibleStations.filter((s) => (s.type || '').toLowerCase() === typeFilter);

    list = filterByOccupancy(list, occupancyFilter);
    return sortStations(list, sortMode, localOrder);
  }, [visibleStations, typeFilter, occupancyFilter, sortMode, localOrder]);

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

  const handleSortModeChange = (mode: StationSortMode) => {
    setSortMode(mode);
    if (activeLocationId) saveStationSortMode(activeLocationId, mode);
  };

  const toggleLiveFilter = () => {
    setOccupancyFilter((prev) => (prev === 'live' ? 'all' : 'live'));
  };

  const toggleOpenFilter = () => {
    setOccupancyFilter((prev) => (prev === 'open' ? 'all' : 'open'));
  };

  const persistOrder = useCallback(
    async (orderedIds: string[]) => {
      setLocalOrder(orderedIds);
      if (activeLocationId) saveLocalStationOrder(activeLocationId, orderedIds);
      await reorderStations(orderedIds);
    },
    [activeLocationId, reorderStations]
  );

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggingId || draggingId === targetId) {
        setDragOverId(null);
        return;
      }

      const currentIds = filteredStations.map((s) => s.id);
      const nextIds = reorderStationIds(currentIds, draggingId, targetId);
      void persistOrder(nextIds);
      setDraggingId(null);
      setDragOverId(null);
    },
    [draggingId, filteredStations, persistOrder]
  );

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
          item.prepaidBooking ? undefined : couponCode,
          item.playerCount,
          item.perPersonRate,
          item.plannedDurationMinutes,
          item.prepaidBooking,
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

  const dragEnabled = sortMode === 'custom' && !selectionMode;

  return (
    <div className="flex-1 space-y-4 p-3 pt-3 sm:p-5 sm:pt-5">
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
            <button
              type="button"
              onClick={toggleLiveFilter}
              className={cn(
                'rounded-xl border px-4 py-3 text-center transition-all',
                occupancyFilter === 'live'
                  ? 'border-orange-400 bg-orange-500/25 ring-2 ring-orange-400/40'
                  : 'border-orange-500/30 bg-orange-950/30 hover:border-orange-400/50'
              )}
              title="Show live stations only"
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-orange-300/80">
                <Zap className="h-3 w-3" />
                Live
              </div>
              <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-orange-200">
                {totalActive}
              </p>
            </button>
            <button
              type="button"
              onClick={toggleOpenFilter}
              className={cn(
                'rounded-xl border px-4 py-3 text-center transition-all',
                occupancyFilter === 'open'
                  ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/35'
                  : 'border-emerald-500/30 bg-emerald-950/30 hover:border-emerald-400/45'
              )}
              title="Show open stations only"
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">
                <CircleDot className="h-3 w-3" />
                Open
              </div>
              <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-emerald-200">
                {totalAvailable}
              </p>
            </button>
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
            <Button size="sm" variant="outline" onClick={() => setOpenReplaceDialog(true)}>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Legacy
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

        <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setOccupancyFilter('all');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                typeFilter === 'all' && occupancyFilter === 'all'
                  ? 'border-cuephoria-purple/60 bg-cuephoria-purple/20 text-white'
                  : 'border-white/10 bg-black/30 text-muted-foreground hover:border-white/20'
              )}
            >
              All stations
              <span className="tabular-nums opacity-70">{visibleStations.length}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (occupancyFilter === 'live') {
                  setOccupancyFilter('all');
                } else {
                  setTypeFilter('all');
                  setOccupancyFilter('live');
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                occupancyFilter === 'live'
                  ? 'border-orange-400/60 bg-orange-500/20 text-orange-100 ring-1 ring-orange-400/30'
                  : 'border-white/10 bg-black/30 text-muted-foreground hover:border-orange-400/35 hover:text-orange-200/90'
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Live
              <span className="tabular-nums opacity-70">{totalActive}</span>
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

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Select value={sortMode} onValueChange={(v) => handleSortModeChange(v as StationSortMode)}>
              <SelectTrigger className="h-9 w-[180px] border-white/10 bg-black/30 text-xs">
                <SelectValue placeholder="Sort stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom order (drag)</SelectItem>
                <SelectItem value="type-name">Type, then name</SelectItem>
                <SelectItem value="type">Group by type</SelectItem>
                <SelectItem value="name">Name (C1, R1…)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {occupancyFilter !== 'all' && (
          <p className="mt-2 text-xs text-cuephoria-lightpurple">
            Showing {occupancyFilter === 'live' ? 'live' : 'open'} stations only ·{' '}
            <button
              type="button"
              className="underline hover:text-white"
              onClick={() => setOccupancyFilter('all')}
            >
              Clear filter
            </button>
          </p>
        )}

        {dragEnabled && (
          <p className="mt-2 text-xs text-muted-foreground">
            Drag the grip handle on a card to rearrange stations. Order is saved for this branch.
          </p>
        )}

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
      <ReplaceLegacyStationsDialog
        open={openReplaceDialog}
        onOpenChange={setOpenReplaceDialog}
        onComplete={() => void refreshStations()}
      />
      <StationTypesDialog open={openTypesDialog} onOpenChange={setOpenTypesDialog} />

      <MultiStartSessionDialog
        open={openMultiStartDialog}
        onOpenChange={setOpenMultiStartDialog}
        stations={selectedStations}
        onConfirm={handleMultiStart}
      />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {filteredStations.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-16 text-center text-muted-foreground">
            {occupancyFilter === 'live'
              ? 'No live sessions right now'
              : occupancyFilter === 'open'
                ? 'No open stations in this view'
                : 'No stations in this category'}
          </div>
        ) : (
          filteredStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              selectionMode={selectionMode}
              selected={selectedStationIds.has(station.id)}
              onToggleSelect={toggleStationSelection}
              dragEnabled={dragEnabled}
              isDragging={draggingId === station.id}
              isDragOver={dragOverId === station.id}
              onDragStart={setDraggingId}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              onDragOver={setDragOverId}
              onDrop={handleDrop}
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
