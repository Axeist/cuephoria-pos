import React, { useMemo, useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Plus, MapPin, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import ReplaceLegacyStationsDialog from '@/components/station/ReplaceLegacyStationsDialog';
import StationTypeManager from '@/components/station/StationTypeManager';
import { useStationTypes } from '@/hooks/useStationTypes';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import { getStationTheme } from '@/utils/stationTheme';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from '@/context/LocationContext';
import { Badge } from '@/components/ui/badge';
import { type Station } from '@/types/pos.types';
import { prefetchPOS } from '@/utils/viewTransition';

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

const groupByType = (list: Station[]) => {
  const map = new Map<string, Station[]>();
  for (const station of list) {
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
};

const Stations = () => {
  const { stations } = usePOS();
  const { activeLocation } = useLocation();
  const { stationTypes } = useStationTypes();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPinDialog, setOpenPinDialog] = useState(false);
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const isMobile = useIsMobile();

  const visibleStations = stations.filter((s) => s.category !== 'nit_event');
  const typeGroups = useMemo(() => groupByType(visibleStations), [visibleStations]);
  const totalActive = visibleStations.filter((s) => s.isOccupied).length;

  useEffect(() => {
    prefetchPOS();
  }, []);

  const branchSlug = activeLocation?.slug ?? '';

  return (
    <div className="flex-1 space-y-3 p-3 pt-3 sm:p-5 sm:pt-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="gradient-text font-heading text-xl font-bold sm:text-2xl">Gaming Stations</h2>
          {activeLocation && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {activeLocation.name}
              <Badge variant="outline" className="ml-1 h-5 text-[10px] px-1.5">
                {totalActive}/{visibleStations.length} live
              </Badge>
            </p>
          )}
        </div>
        <div className="flex gap-2">
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

      <StationTypeManager />

      <PinVerificationDialog
        open={openPinDialog}
        onOpenChange={setOpenPinDialog}
        onSuccess={() => setOpenAddDialog(true)}
        title="Admin Access Required"
        description="Enter the admin PIN to add a new game station"
      />
      <AddStationDialog open={openAddDialog} onOpenChange={setOpenAddDialog} />
      <ReplaceLegacyStationsDialog open={openReplaceDialog} onOpenChange={setOpenReplaceDialog} onComplete={() => {}} />

      {/* Inline type stats — one row */}
      <div className="flex flex-wrap gap-1.5">
        {typeGroups.map((group) => {
          const theme = getStationTheme({ type: group.type });
          const Icon = theme.icon;
          return (
            <div
              key={group.type}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${theme.border} bg-black/30`}
            >
              <Icon className={`h-3 w-3 ${theme.accent}`} />
              <span className="font-medium text-foreground/90">
                {stationTypeLabel(group.type, stationTypes)}
              </span>
              <span className={`tabular-nums ${theme.accentMuted}`}>
                {group.activeCount}/{group.stations.length}
              </span>
            </div>
          );
        })}
      </div>

      {/* Station groups — dense grid */}
      <div className="space-y-4">
        {typeGroups.map((group) => {
          const theme = getStationTheme({ type: group.type });
          const Icon = theme.icon;
          return (
            <section key={group.type}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${theme.accent}`} />
                <h3 className="font-heading text-sm font-semibold">
                  {stationTypeLabel(group.type, stationTypes)}
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {group.activeCount} active · {group.stations.length} total
                </span>
              </div>
              <div
                className={`grid gap-2 ${
                  isMobile
                    ? 'grid-cols-1'
                    : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                }`}
              >
                {group.stations.map((station) => (
                  <StationCard key={station.id} station={station} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Stations;
