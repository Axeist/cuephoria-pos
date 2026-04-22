import React, { useMemo, useState } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, Plus, Table2, Headset, Calendar, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/LocationContext';
import { Badge } from '@/components/ui/badge';
import { type Station } from '@/types/pos.types';

const typeLabel = (type: string) =>
  type.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const iconForType = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === '8ball') return Table2;
  if (normalized === 'vr') return Headset;
  return Gamepad2;
};

const typeSortWeight = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === 'ps5') return 0;
  if (normalized === '8ball') return 1;
  if (normalized === 'vr') return 2;
  return 10;
};

const byNameNumber = (a: Station, b: Station) => {
  const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
  const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
  if (numA !== numB) return numA - numB;
  return a.name.localeCompare(b.name);
};

const groupByType = (list: Station[]): Array<{ type: string; stations: Station[]; activeCount: number }> => {
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
  const { stations, setStations } = usePOS();
  const { toast } = useToast();
  const { activeLocation, activeLocationId } = useLocation();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPinDialog, setOpenPinDialog] = useState(false);
  const isMobile = useIsMobile();

  const regularStations = stations.filter((station) => !station.category || station.category !== 'nit_event');
  const eventStations = stations.filter((station) => station.category === 'nit_event');
  const regularTypeGroups = useMemo(() => groupByType(regularStations), [regularStations]);
  const eventTypeGroups = useMemo(() => groupByType(eventStations), [eventStations]);
  const enabledEventStations = eventStations.filter((s) => s.eventEnabled).length;

  const handleAddStationClick = () => setOpenPinDialog(true);
  const handlePinSuccess = () => setOpenAddDialog(true);

  const handleToggleAllEventStations = async (enable: boolean) => {
    if (!activeLocationId) {
      toast({
        title: 'Select a branch',
        description: 'Choose Main or Lite in the header before changing event stations.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('stations')
        .update({ event_enabled: enable })
        .eq('category', 'nit_event')
        .eq('location_id', activeLocationId);

      if (error) throw error;

      setStations(stations.map((s) => (s.category === 'nit_event' ? { ...s, eventEnabled: enable } : s)));

      toast({
        title: enable ? 'All Event Stations Enabled' : 'All Event Stations Disabled',
        description: `All event stations ${enable ? 'will now appear' : 'will no longer appear'} on public booking page.`,
      });
    } catch (error) {
      console.error('Error toggling all event stations:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event status',
        variant: 'destructive',
      });
    }
  };

  const branchSlug = activeLocation?.slug ?? '';
  const branchBannerClass =
    branchSlug === 'lite'
      ? 'border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-950/40 to-transparent border border-amber-500/25'
      : 'border-l-4 border-l-cuephoria-lightpurple bg-gradient-to-r from-cuephoria-purple/15 to-transparent border border-cuephoria-purple/25';

  return (
    <div className="flex-1 space-y-3 p-3 pt-3 sm:space-y-4 sm:p-6 sm:pt-6 md:p-8">
      <div className="animate-slide-down flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="gradient-text font-heading text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
          Gaming Stations
        </h2>
        <div className="flex w-full space-x-2 sm:w-auto">
          <Button
            size={isMobile ? 'sm' : 'default'}
            className="h-10 flex-1 rounded-lg bg-cuephoria-purple text-xs hover:bg-cuephoria-purple/80 sm:h-11 sm:flex-none sm:text-sm"
            onClick={handleAddStationClick}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Add Station
          </Button>
        </div>
      </div>

      {activeLocation && (
        <div
          className={`animate-slide-down delay-75 rounded-xl px-4 py-3 sm:px-5 sm:py-4 ${branchBannerClass}`}
          role="region"
          aria-label={`Stations for ${activeLocation.name}`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-lg p-2 ${
                  branchSlug === 'lite'
                    ? 'bg-amber-500/15 text-amber-200'
                    : 'bg-cuephoria-purple/25 text-cuephoria-lightpurple'
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                  Stations for this branch
                </p>
                <p className="mt-0.5 font-heading text-base font-semibold text-foreground sm:text-lg">
                  {activeLocation.name}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`w-fit shrink-0 text-[10px] uppercase tracking-wide sm:text-xs ${
                branchSlug === 'lite'
                  ? 'border-amber-400/50 bg-amber-950/40 text-amber-100'
                  : 'border-cuephoria-lightpurple/40 bg-cuephoria-purple/10 text-cuephoria-lightpurple'
              }`}
            >
              {branchSlug === 'lite' ? 'Cuephoria Lite' : branchSlug === 'main' ? 'Main' : activeLocation.short_code}
            </Badge>
          </div>
        </div>
      )}

      <PinVerificationDialog
        open={openPinDialog}
        onOpenChange={setOpenPinDialog}
        onSuccess={handlePinSuccess}
        title="Admin Access Required"
        description="Enter the admin PIN to add a new game station"
      />

      <AddStationDialog open={openAddDialog} onOpenChange={setOpenAddDialog} />

      <div className="animate-slide-up grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-3">
        {regularTypeGroups.map((group) => {
          const Icon = iconForType(group.type);
          return (
            <Card
              key={`stat-${group.type}`}
              className="animate-fade-in rounded-xl border border-cuephoria-purple/30 bg-gradient-to-r from-cuephoria-purple/20 to-cuephoria-lightpurple/20 transition-all hover:shadow-lg hover:shadow-cuephoria-purple/20"
            >
              <CardContent className="flex items-center justify-between p-3 sm:p-4">
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">{typeLabel(group.type)}</p>
                  <p className="text-xl font-bold sm:text-2xl">
                    {group.activeCount} / {group.stations.length} Active
                  </p>
                </div>
                <div className="rounded-full bg-cuephoria-purple/20 p-2 sm:p-3">
                  <Icon className="h-5 w-5 text-cuephoria-lightpurple sm:h-6 sm:w-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-5 sm:space-y-6">
        {regularTypeGroups.map((group, groupIndex) => {
          const Icon = iconForType(group.type);
          return (
            <div key={`regular-${group.type}`} className="animate-slide-up" style={{ animationDelay: `${groupIndex * 120}ms` }}>
              <div className="mb-3 flex items-center sm:mb-4">
                <Icon className="mr-2 h-4 w-4 text-cuephoria-lightpurple sm:h-5 sm:w-5" />
                <h3 className="font-heading text-base font-semibold sm:text-xl">{typeLabel(group.type)}</h3>
                <span className="ml-2 rounded-full bg-cuephoria-purple/20 px-2 py-1 text-[10px] text-cuephoria-lightpurple sm:text-xs">
                  {group.activeCount} active
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {group.stations.map((station, index) => (
                  <div key={station.id} className="animate-scale-in" style={{ animationDelay: `${index * 90}ms` }}>
                    <StationCard station={station} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {eventStations.length > 0 && (
          <div className="animate-slide-up mt-6 border-t border-yellow-500/30 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-yellow-400 sm:h-6 sm:w-6" />
                <h3 className="font-heading text-base font-semibold text-yellow-400 sm:text-xl">Event Stations</h3>
                <span className="ml-2 rounded-full bg-yellow-800/30 px-2 py-1 text-[10px] text-yellow-400 sm:text-xs">
                  {enabledEventStations} enabled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleAllEventStations(true)}
                  className="h-8 border-yellow-500/30 bg-yellow-500/20 text-xs text-yellow-400 hover:bg-yellow-500/30"
                >
                  <ToggleRight className="mr-1 h-3.5 w-3.5" />
                  Enable All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleAllEventStations(false)}
                  className="h-8 border-gray-500/30 bg-gray-500/20 text-xs text-gray-400 hover:bg-gray-500/30"
                >
                  <ToggleLeft className="mr-1 h-3.5 w-3.5" />
                  Disable All
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {eventTypeGroups.map((group) => {
                const Icon = iconForType(group.type);
                return (
                  <div key={`event-${group.type}`}>
                    <div className="mb-3 flex items-center">
                      <Icon className="mr-2 h-4 w-4 text-yellow-400 sm:h-5 sm:w-5" />
                      <h4 className="text-sm font-semibold sm:text-lg">{typeLabel(group.type)}</h4>
                      <span className="ml-2 rounded-full bg-yellow-800/30 px-2 py-1 text-[10px] text-yellow-400 sm:text-xs">
                        {group.activeCount} active
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      {group.stations.map((station, index) => (
                        <div key={station.id} className="animate-scale-in" style={{ animationDelay: `${index * 90}ms` }}>
                          <StationCard station={station} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stations;
