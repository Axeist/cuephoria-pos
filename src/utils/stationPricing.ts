import type { Session, Station } from '@/types/pos.types';

export type OccupancyRates = Record<string, number>;

export type PricingMode = 'static' | 'per_player' | 'time_based';

export type StationPricingInput = Pick<
  Station,
  | 'hourlyRate'
  | 'maxPlayers'
  | 'occupancyRates'
  | 'type'
  | 'teamName'
  | 'singleRate'
  | 'maxCapacity'
  | 'pricingMode'
>;

export function clampPlayerCount(station: StationPricingInput, playerCount: number): number {
  const max = Math.max(1, station.maxPlayers ?? station.maxCapacity ?? 1);
  return Math.min(max, Math.max(1, Math.floor(playerCount) || 1));
}

export function hasOccupancyRates(station: StationPricingInput): boolean {
  return Object.keys(station.occupancyRates ?? {}).length > 0;
}

export function resolvePricingMode(station: StationPricingInput): PricingMode {
  if (
    station.pricingMode === 'static' ||
    station.pricingMode === 'per_player' ||
    station.pricingMode === 'time_based'
  ) {
    return station.pricingMode;
  }
  return hasOccupancyRates(station) ? 'per_player' : 'static';
}

export function isTimeBasedPricing(
  station: Pick<StationPricingInput, 'pricingMode'>
): boolean {
  return resolvePricingMode(station) === 'time_based';
}

export function isPerPlayerPricing(station: StationPricingInput): boolean {
  return resolvePricingMode(station) === 'per_player';
}

export function isStaticPricing(station: StationPricingInput): boolean {
  return !isPerPlayerPricing(station);
}

/** Legacy per-controller row (team_name or controller naming, no occupancy grid). */
export function isLegacyControllerStation(station: StationPricingInput): boolean {
  if (hasOccupancyRates(station)) return false;
  if ((station.maxPlayers ?? 1) > 1 && !station.teamName) return false;
  return Boolean(
    station.teamName ||
      (station.maxPlayers ?? 1) <= 1 &&
        (station.singleRate != null || station.maxCapacity != null)
  );
}

export function buildDefaultOccupancyRates(
  maxPlayers: number,
  soloPerPerson: number,
  groupPerPerson: number
): OccupancyRates {
  const rates: OccupancyRates = {};
  const max = Math.max(1, Math.min(8, maxPlayers));
  for (let i = 1; i <= max; i++) {
    if (i === 1) {
      rates['1'] = soloPerPerson;
    } else if (i === max) {
      rates[String(i)] = groupPerPerson;
    } else {
      const t = (i - 1) / (max - 1);
      rates[String(i)] = Math.round(soloPerPerson + (groupPerPerson - soloPerPerson) * t);
    }
  }
  return rates;
}

export function totalRateAtMaxOccupancy(
  maxPlayers: number,
  occupancyRates: OccupancyRates,
  fallbackHourlyRate: number
): number {
  const max = Math.max(1, maxPlayers);
  const key = String(max);
  const perPerson = occupancyRates[key] ?? occupancyRates['1'];
  if (perPerson != null && perPerson > 0) {
    return perPerson * max;
  }
  return fallbackHourlyRate;
}

export function getRateForPlayerCount(
  station: StationPricingInput,
  rawPlayerCount: number
): { perPersonRate: number; totalRate: number; playerCount: number } {
  const playerCount = clampPlayerCount(station, rawPlayerCount);

  if (isStaticPricing(station)) {
    return {
      perPersonRate: station.hourlyRate,
      totalRate: station.hourlyRate,
      playerCount: 1,
    };
  }

  const rates = station.occupancyRates ?? {};
  const key = String(playerCount);

  if (rates[key] != null && rates[key] > 0) {
    const perPersonRate = rates[key];
    return { perPersonRate, totalRate: perPersonRate * playerCount, playerCount };
  }

  if (rates['1'] != null && rates['1'] > 0 && playerCount === 1) {
    const perPersonRate = rates['1'];
    return { perPersonRate, totalRate: perPersonRate, playerCount };
  }

  // Legacy: single controller total rate
  if (playerCount === 1 && station.singleRate != null && station.singleRate > 0) {
    return {
      perPersonRate: station.singleRate,
      totalRate: station.singleRate,
      playerCount,
    };
  }

  // Legacy: multi-controller — hourly_rate is per controller/person
  if (isLegacyControllerStation(station) || !hasOccupancyRates(station)) {
    const perPerson = station.hourlyRate;
    return { perPersonRate: perPerson, totalRate: perPerson * playerCount, playerCount };
  }

  // Fallback: flat hourly rate as total for any count
  const perPerson = station.hourlyRate / Math.max(1, playerCount);
  return { perPersonRate: perPerson, totalRate: station.hourlyRate, playerCount };
}

/** Legacy public booking: sum rates when multiple PS5 controller stations selected. */
export function getLegacyBookingRateForSelection(
  stations: Array<
    StationPricingInput & { id?: string; type?: string }
  >,
  selectedIds: string[],
  playerCountsByStation: Record<string, number> = {}
): number {
  let total = 0;
  const ps5Selected = stations.filter(
    (s) => s.type === 'ps5' && s.id && selectedIds.includes(s.id)
  );
  const nonPs5 = stations.filter(
    (s) => s.type !== 'ps5' && s.id && selectedIds.includes(s.id)
  );

  if (ps5Selected.length === 1) {
    const s = ps5Selected[0];
    const count = playerCountsByStation[s.id!] ?? 1;
    if (hasOccupancyRates(s)) {
      total += getRateForPlayerCount(s, count).totalRate;
    } else {
      total += s.singleRate ?? s.hourlyRate;
    }
  } else if (ps5Selected.length > 1) {
    total += ps5Selected.reduce((sum, s) => sum + s.hourlyRate, 0);
  }

  for (const s of nonPs5) {
    const count = playerCountsByStation[s.id!] ?? 1;
    total += getRateForPlayerCount(s, count).totalRate;
  }

  return total;
}

export function getRateSuffix(station: Pick<Station, 'type' | 'slotDuration' | 'category'>): string {
  if (station.type === 'vr' || station.slotDuration === 15) return '/15mins';
  if (station.slotDuration === 30) return '/30mins';
  return '/hr';
}

/** Active session rate for station card badges (uses locked-in session pricing). */
export function formatLiveSessionRate(
  station: Pick<Station, 'type' | 'slotDuration' | 'category' | 'pricingMode' | 'occupancyRates'>,
  session: Pick<
    Session,
    'hourlyRate' | 'perPersonRate' | 'playerCount' | 'timeTierPrice' | 'overtimePerMinute' | 'plannedDurationMinutes'
  >
): { totalRate: number; suffix: string; detail?: string } {
  if (
    isTimeBasedPricing(station) &&
    session.timeTierPrice != null &&
    session.overtimePerMinute != null
  ) {
    const mins = session.plannedDurationMinutes ?? 0;
    const ot = Math.round(session.overtimePerMinute * 10) / 10;
    const otLabel = Number.isInteger(ot) ? String(ot) : ot.toFixed(1);
    return {
      totalRate: session.timeTierPrice,
      suffix: mins > 0 ? ` / ${mins}m` : '',
      detail: `₹${otLabel}/min OT`,
    };
  }

  const totalRate = session.hourlyRate ?? 0;
  const suffix = getRateSuffix(station);
  const players = session.playerCount ?? 1;
  const perPerson = session.perPersonRate;

  if (isPerPlayerPricing(station) && players > 1 && perPerson != null && perPerson > 0) {
    return {
      totalRate,
      suffix,
      detail: `₹${Math.round(perPerson)}/person`,
    };
  }

  return { totalRate, suffix };
}

export function formatOccupancyPriceLabel(
  station: StationPricingInput & Pick<Station, 'type' | 'slotDuration' | 'category'>,
  playerCount: number
): string {
  const { perPersonRate, totalRate } = getRateForPlayerCount(station, playerCount);
  const suffix = getRateSuffix(station);
  if (playerCount <= 1) {
    return `₹${totalRate}${suffix}`;
  }
  return `₹${totalRate}${suffix} (${playerCount} × ₹${perPersonRate}/person)`;
}
