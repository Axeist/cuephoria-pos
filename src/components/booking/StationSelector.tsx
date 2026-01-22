import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, GamepadIcon, Headset, Users, EyeOff } from 'lucide-react';
import { getTeamBadge, getHiddenStations, calculatePS5Price } from '@/utils/ps5Teams';
import { cn } from '@/lib/utils';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball' | 'vr';
  hourly_rate: number;
  team_name?: string | null;
  team_color?: string | null;
  max_capacity?: number | null;
  single_rate?: number | null;
}

interface StationSelectorProps {
  stations: Station[];
  selectedStations: string[];
  onStationToggle: (stationId: string) => void;
  loading?: boolean;
  hideTeammates?: boolean; // New prop to control team filtering
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  selectedStations,
  onStationToggle,
  loading = false,
  hideTeammates = true,
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

  const getStationTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'ps5':
        return 'bg-cuephoria-purple/15 text-cuephoria-purple border-cuephoria-purple/20';
      case 'vr':
        return 'bg-blue-400/15 text-blue-300 border-blue-400/20';
      default:
        return 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20';
    }
  };

  const getPriceDisplay = (station: Station) => {
    // Check if this is a PS5 with dynamic pricing
    if (station.type === 'ps5') {
      const selectedPS5Count = selectedStations.filter(id => {
        const s = stations.find(st => st.id === id);
        return s?.type === 'ps5';
      }).length;
      
      // If exactly ONE PS5 controller is selected (or will be after clicking this one)
      const isCurrentlySelected = selectedStations.includes(station.id);
      const willBeSingle = (selectedPS5Count === 0 && !isCurrentlySelected) || 
                           (selectedPS5Count === 1 && isCurrentlySelected);
      
      // Single controller: ₹200/hour (single_rate)
      // Multiple controllers: ₹150/hour each (hourly_rate)
      if (willBeSingle && station.single_rate) {
        return `₹${station.single_rate}/hour`;
      } else {
        // Multiple controllers selected - show regular rate
        return `₹${station.hourly_rate}/hour`;
      }
    }
    
    if (station.type === 'vr') {
      return `₹${station.hourly_rate}/15mins`;
    }
    
    return `₹${station.hourly_rate}/hour`;
  };

  // Get hidden stations based on team selection
  const hiddenStationIds = hideTeammates ? getHiddenStations(selectedStations, stations) : [];
  
  // Filter out hidden stations
  const visibleStations = stations.filter(s => !hiddenStationIds.includes(s.id));

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (visibleStations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No stations available for the selected date and time</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleStations.map((station) => {
        const Icon = getStationIcon(station.type);
        const isSelected = selectedStations.includes(station.id);
        const teamBadge = getTeamBadge(station);
        
        return (
          <Card
            key={station.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md border-white/10 bg-white/5 backdrop-blur-sm",
              isSelected 
                ? 'ring-2 ring-cuephoria-purple bg-cuephoria-purple/10' 
                : 'hover:bg-white/10'
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
              {/* Team Badge */}
              {teamBadge && (
                <div className="mt-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs border flex items-center gap-1 w-fit",
                      teamBadge.color,
                      teamBadge.bgColor,
                      teamBadge.borderColor
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {teamBadge.label}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs border ${getStationTypeBadgeColor(station.type)}`}
                >
                  {getStationTypeLabel(station.type)}
                </Badge>
                <div className="text-sm font-medium text-cuephoria-lightpurple">
                  {getPriceDisplay(station)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
