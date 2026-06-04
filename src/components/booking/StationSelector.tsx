import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, GamepadIcon, Headset, Users, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatOccupancyPriceLabel,
  getRateForPlayerCount,
  isPerPlayerPricing,
} from '@/utils/stationPricing';

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
  loading?: boolean;
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  selectedStations,
  stationPlayerCounts,
  onStationToggle,
  onPlayerCountChange,
  loading = false,
}) => {
  const getStationIcon = (type: string) => {
    switch (type) {
      case 'ps5':
        return Monitor;
      case 'vr':
        return Headset;
      default:
        return GamepadIcon;
    }
  };

  const getStationTypeLabel = (type: string) => {
    switch (type) {
      case 'ps5':
        return 'PlayStation 5';
      case 'vr':
        return 'VR Gaming';
      default:
        return '8-Ball Pool';
    }
  };

  const toPricingStation = (station: BookingStation) => ({
    hourlyRate: station.hourly_rate,
    maxPlayers: station.max_players ?? station.max_capacity ?? 1,
    occupancyRates: station.occupancy_rates ?? {},
    type: station.type,
    slotDuration: station.slot_duration,
    category: station.category,
    teamName: station.team_name,
    singleRate: station.single_rate,
    maxCapacity: station.max_capacity,
    pricingMode: station.pricing_mode,
  });

  const getPriceDisplay = (station: BookingStation) => {
    const count = stationPlayerCounts[station.id] ?? 1;
    return formatOccupancyPriceLabel(
      { ...toPricingStation(station), type: station.type, slotDuration: station.slot_duration, category: station.category },
      count
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No stations available for the selected date and time</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stations.map((station) => {
        const Icon = getStationIcon(station.type);
        const isSelected = selectedStations.includes(station.id);
        const maxPlayers = station.max_players ?? station.max_capacity ?? 1;
        const playerCount = stationPlayerCounts[station.id] ?? 1;
        const multiPlayer = isPerPlayerPricing(toPricingStation(station)) && maxPlayers > 1;

        return (
          <Card
            key={station.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md border-white/10 bg-white/5 backdrop-blur-sm',
              isSelected ? 'ring-2 ring-cuephoria-purple bg-cuephoria-purple/10' : 'hover:bg-white/10'
            )}
            onClick={() => onStationToggle(station.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Icon className="h-5 w-5" />
                  {station.name}
                </CardTitle>
                {isSelected && (
                  <Badge variant="default" className="text-xs bg-cuephoria-purple text-white">
                    Selected
                  </Badge>
                )}
              </div>
              {maxPlayers > 1 && (
                <Badge variant="outline" className="mt-2 text-xs w-fit border-white/20 text-gray-300">
                  <Users className="h-3 w-3 mr-1" />
                  Up to {maxPlayers} players
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-3" onClick={(e) => e.stopPropagation()}>
              <Badge variant="secondary" className="text-xs border bg-white/10 text-gray-200 border-white/10">
                {getStationTypeLabel(station.type)}
              </Badge>
              <div className="text-sm font-medium text-cuephoria-lightpurple">{getPriceDisplay(station)}</div>

              {isSelected && multiPlayer && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-gray-400">Players</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 border-white/20"
                    disabled={playerCount <= 1}
                    onClick={() => onPlayerCountChange(station.id, playerCount - 1)}
                  >
                    −
                  </Button>
                  <span className="text-sm font-semibold text-white w-6 text-center">{playerCount}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 border-white/20"
                    disabled={playerCount >= maxPlayers}
                    onClick={() => onPlayerCountChange(station.id, playerCount + 1)}
                  >
                    +
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export { getRateForPlayerCount };
