import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, EyeOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatOccupancyPriceLabel,
  getRateForPlayerCount,
  isPerPlayerPricing,
} from '@/utils/stationPricing';
import { getStationTheme } from '@/utils/stationTheme';
import { getPublicSlotDurationMinutes, VR_HOURLY_PASSES } from '@/utils/publicBookingAvailability';
import type { Station } from '@/types/pos.types';

export interface BookingStation {
  id: string;
  name: string;
  type: 'ps5' | '8ball' | 'vr';
  hourly_rate: number;
  max_players?: number;
  occupancy_rates?: Record<string, number>;
  pricing_mode?: 'static' | 'per_player';
  slot_duration?: number | null;
  category?: string | null;
  team_name?: string | null;
  single_rate?: number | null;
  max_capacity?: number | null;
}

interface StationSelectorProps {
  stations: BookingStation[];
  selectedStations: string[];
  stationPlayerCounts: Record<string, number>;
  onStationToggle: (stationId: string) => void;
  onPlayerCountChange: (stationId: string, count: number) => void;
  vrPassesLeft?: Record<string, number>;
  loading?: boolean;
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  selectedStations,
  stationPlayerCounts,
  onStationToggle,
  onPlayerCountChange,
  vrPassesLeft = {},
  loading = false,
}) => {
  const toPricingStation = (station: BookingStation) => ({
    hourlyRate: station.hourly_rate,
    maxPlayers: station.max_players ?? station.max_capacity ?? 1,
    occupancyRates: station.occupancy_rates ?? {},
    type: station.type,
    slotDuration: station.type === 'vr' ? 60 : station.slot_duration,
    category: station.category,
    teamName: station.team_name,
    singleRate: station.single_rate,
    maxCapacity: station.max_capacity,
    pricingMode: station.pricing_mode,
  });

  const getPriceDisplay = (station: BookingStation) => {
    const count = stationPlayerCounts[station.id] ?? 1;
    return formatOccupancyPriceLabel(
      {
        ...toPricingStation(station),
        type: station.type,
        slotDuration: station.type === 'vr' ? 60 : station.slot_duration,
        category: station.category,
      },
      count
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/25 p-8 text-center">
        <EyeOff className="h-10 w-10 mx-auto mb-3 text-gray-500" />
        <p className="text-sm font-medium text-gray-300">No stations for this time</p>
        <p className="text-xs text-muted-foreground mt-1">Try another slot or filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
      {stations.map((station) => {
        const theme = getStationTheme({ type: station.type } as Station);
        const Icon = theme.icon;
        const isSelected = selectedStations.includes(station.id);
        const maxPlayers = station.max_players ?? station.max_capacity ?? 1;
        const playerCount = stationPlayerCounts[station.id] ?? 1;
        const multiPlayer = isPerPlayerPricing(toPricingStation(station)) && maxPlayers > 1;
        const durationMin = getPublicSlotDurationMinutes(station);
        const passesLeft = vrPassesLeft[station.id];

        return (
          <button
            key={station.id}
            type="button"
            onClick={() => onStationToggle(station.id)}
            className={cn(
              'group relative flex flex-col text-left rounded-2xl border overflow-hidden transition-all duration-200',
              'min-h-[11.5rem]',
              theme.border,
              theme.bg,
              isSelected
                ? cn(theme.glow, 'ring-2 ring-cuephoria-purple/50')
                : 'hover:scale-[1.01] hover:border-white/20'
            )}
          >
            <div className={cn('absolute inset-0 pointer-events-none opacity-80', theme.mesh)} />
            <div
              className={cn(
                'relative h-1 w-full shrink-0',
                isSelected ? theme.topBarLive : theme.topBarIdle
              )}
            />

            <div className="relative flex flex-1 flex-col p-4 gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      theme.iconBg
                    )}
                  >
                    <Icon className={cn('h-5 w-5', theme.accent)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white leading-tight truncate">
                      {station.name}
                    </p>
                    <p className={cn('text-xs mt-0.5', theme.accentMuted)}>{theme.label}</p>
                  </div>
                </div>
                {isSelected && (
                  <Badge className="shrink-0 bg-cuephoria-purple text-white text-[10px] px-2">
                    Selected
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{durationMin} min session</span>
                </div>
                {maxPlayers > 1 && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>Up to {maxPlayers} players</span>
                  </div>
                )}
                {station.type === 'vr' && passesLeft != null && (
                  <p className="text-left text-[11px] font-medium text-cuephoria-blue leading-snug">
                    {passesLeft} of {VR_HOURLY_PASSES} VR passes left this hour
                  </p>
                )}
              </div>

              <div className="mt-auto pt-2 border-t border-white/10">
                <p className="text-sm font-semibold text-cuephoria-lightpurple text-left">
                  {getPriceDisplay(station)}
                </p>

                {isSelected && multiPlayer && (
                  <div
                    className="flex items-center justify-between gap-2 mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs font-medium text-gray-400">Players</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-white/20 rounded-lg"
                        disabled={playerCount <= 1}
                        onClick={() => onPlayerCountChange(station.id, playerCount - 1)}
                      >
                        −
                      </Button>
                      <span className="text-sm font-bold text-white w-6 text-center tabular-nums">
                        {playerCount}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-white/20 rounded-lg"
                        disabled={playerCount >= maxPlayers}
                        onClick={() => onPlayerCountChange(station.id, playerCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export { getRateForPlayerCount };
