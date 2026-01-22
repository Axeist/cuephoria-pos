/**
 * PS5 Team Grouping Utilities
 * Handles team-based controller grouping and dynamic pricing
 */

interface Station {
  id: string;
  name: string;
  type: string;
  hourly_rate: number;
  team_name?: string | null;
  team_color?: string | null;
  max_capacity?: number | null;
  single_rate?: number | null;
}

/**
 * Get the team for a given station
 */
export const getStationTeam = (station: Station): string | null => {
  return station.team_name || null;
};

/**
 * Get other stations in the same team
 */
export const getTeamMates = (station: Station, allStations: Station[]): Station[] => {
  if (!station.team_name) return [];
  
  return allStations.filter(
    s => s.team_name === station.team_name && s.id !== station.id
  );
};

/**
 * Check if selecting this station would conflict with already selected stations
 * Returns true if there's a conflict (same team already partially selected)
 */
export const hasTeamConflict = (
  stationToAdd: Station,
  selectedStationIds: string[],
  allStations: Station[]
): boolean => {
  if (!stationToAdd.team_name) return false;
  
  const selectedStations = allStations.filter(s => selectedStationIds.includes(s.id));
  const selectedFromSameTeam = selectedStations.filter(
    s => s.team_name === stationToAdd.team_name
  );
  
  // If no stations from same team are selected, no conflict
  if (selectedFromSameTeam.length === 0) return false;
  
  // If stations from same team are already selected, we have a conflict
  // because the entire PS5 console is being used
  return true;
};

/**
 * Get stations that should be hidden based on current selection
 * When a controller from a team is selected, hide other controllers from the same team
 */
export const getHiddenStations = (
  selectedStationIds: string[],
  allStations: Station[]
): string[] => {
  const hiddenIds: Set<string> = new Set();
  
  const selectedStations = allStations.filter(s => selectedStationIds.includes(s.id));
  
  selectedStations.forEach(selected => {
    if (selected.team_name) {
      // Hide all other stations from the same team
      const teammates = getTeamMates(selected, allStations);
      teammates.forEach(tm => hiddenIds.add(tm.id));
    }
  });
  
  return Array.from(hiddenIds);
};

/**
 * Calculate dynamic pricing based on number of controllers selected
 * Single controller: ₹200/hr
 * Multiple controllers: ₹150/hr each
 */
export const calculatePS5Price = (
  stationIds: string[],
  allStations: Station[]
): { total: number; breakdown: { stationId: string; name: string; rate: number }[] } => {
  const selectedPS5Stations = allStations.filter(
    s => stationIds.includes(s.id) && s.type === 'ps5'
  );
  
  if (selectedPS5Stations.length === 0) {
    return { total: 0, breakdown: [] };
  }
  
  // Single controller gets single_rate (₹200) or falls back to hourly_rate
  const isSingleController = selectedPS5Stations.length === 1;
  
  const breakdown = selectedPS5Stations.map(station => {
    const rate = isSingleController && station.single_rate 
      ? station.single_rate 
      : station.hourly_rate;
    
    return {
      stationId: station.id,
      name: station.name,
      rate,
    };
  });
  
  const total = breakdown.reduce((sum, item) => sum + item.rate, 0);
  
  return { total, breakdown };
};

/**
 * Get available stations after filtering based on selected date/time
 * This will be used in the new flow where date/time comes first
 */
export const filterAvailableStations = (
  allStations: Station[],
  bookedStationIds: string[]
): Station[] => {
  return allStations.filter(s => !bookedStationIds.includes(s.id));
};

/**
 * Get team badge configuration for display
 */
export const getTeamBadge = (station: Station): { label: string; color: string; bgColor: string; borderColor: string } | null => {
  if (!station.team_name) return null;
  
  const colorMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    'red': {
      color: 'text-red-400',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-400/30',
    },
    'blue': {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-400/30',
    },
    'green': {
      color: 'text-green-400',
      bgColor: 'bg-green-500/15',
      borderColor: 'border-green-400/30',
    },
    'yellow': {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/15',
      borderColor: 'border-yellow-400/30',
    },
  };
  
  const colors = colorMap[station.team_color || ''] || colorMap['blue'];
  
  return {
    label: station.team_name,
    ...colors,
  };
};
