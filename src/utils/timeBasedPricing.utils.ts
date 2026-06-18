import type { Session } from '@/types/pos.types';

export interface DurationTier {
  minutes: number;
  price: number;
}

export function getDefaultDurationTiers(): DurationTier[] {
  return [
    { minutes: 30, price: 250 },
    { minutes: 60, price: 400 },
    { minutes: 90, price: 650 },
  ];
}

export function parseDurationTiers(raw: unknown): DurationTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: DurationTier[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const minutes = Number(row.minutes);
    const price = Number(row.price);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    tiers.push({ minutes: Math.round(minutes), price: Math.round(price) });
  }
  tiers.sort((a, b) => a.minutes - b.minutes);
  const seen = new Set<number>();
  return tiers.filter((t) => {
    if (seen.has(t.minutes)) return false;
    seen.add(t.minutes);
    return true;
  });
}

export function getDurationPresetMinutesFromTiers(tiers: DurationTier[]): number[] {
  if (tiers.length === 0) return [];
  return tiers.map((t) => t.minutes);
}

/** Package price for a target duration — exact tier or sum of tier blocks (e.g. 90 = 60 + 30). */
export function getTierPackagePrice(targetMinutes: number, tiers: DurationTier[]): number {
  if (targetMinutes <= 0 || tiers.length === 0) return 0;

  const exact = tiers.find((t) => t.minutes === targetMinutes);
  if (exact) return exact.price;

  const sortedDesc = [...tiers].sort((a, b) => b.minutes - a.minutes);
  let remaining = targetMinutes;
  let total = 0;

  for (const tier of sortedDesc) {
    while (remaining >= tier.minutes) {
      total += tier.price;
      remaining -= tier.minutes;
    }
  }

  if (remaining > 0) {
    const smallest = sortedDesc[sortedDesc.length - 1];
    if (smallest) {
      total += remaining * (smallest.price / smallest.minutes);
    }
  }

  return Math.ceil(total);
}

/** Per-minute overtime rate derived from the tier matching planned duration. */
export function getOvertimePerMinute(plannedMinutes: number, tiers: DurationTier[]): number {
  if (plannedMinutes <= 0 || tiers.length === 0) return 0;

  const exact = tiers.find((t) => t.minutes === plannedMinutes);
  if (exact) return exact.price / exact.minutes;

  const sortedAsc = [...tiers].sort((a, b) => a.minutes - b.minutes);
  let best = sortedAsc[0];
  for (const tier of sortedAsc) {
    if (tier.minutes <= plannedMinutes) best = tier;
  }
  return best ? best.price / best.minutes : 0;
}

export function buildTimeBasedSessionPricing(
  plannedMinutes: number,
  tiers: DurationTier[],
  priceMultiplier = 1
): {
  timeTierPrice: number;
  overtimePerMinute: number;
  hourlyRate: number;
} {
  const basePrice = getTierPackagePrice(plannedMinutes, tiers);
  const timeTierPrice = Math.ceil(basePrice * priceMultiplier);
  const overtimePerMinute = getOvertimePerMinute(plannedMinutes, tiers);
  return {
    timeTierPrice,
    overtimePerMinute,
    hourlyRate: Math.ceil(overtimePerMinute * 60),
  };
}

export function calculateTimeBasedLiveCost(
  session: Pick<Session, 'plannedDurationMinutes' | 'timeTierPrice' | 'overtimePerMinute'>,
  billableMs: number,
  isMember = false
): number {
  const planned = session.plannedDurationMinutes ?? 0;
  const base = session.timeTierPrice ?? 0;
  const perMin = session.overtimePerMinute ?? 0;
  if (planned <= 0) return 0;

  const playedMinutes = Math.ceil(billableMs / (1000 * 60));
  const overtimeMinutes = Math.max(0, playedMinutes - planned);
  let cost = base + overtimeMinutes * perMin;
  if (isMember) cost = Math.ceil(cost * 0.5);
  return Math.ceil(cost);
}

export function isTimeBasedSession(
  session: Pick<Session, 'timeTierPrice' | 'overtimePerMinute'>
): boolean {
  return session.timeTierPrice != null && session.overtimePerMinute != null;
}

export function formatOvertimePerMinute(perMin: number): string {
  const rounded = Math.round(perMin * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
