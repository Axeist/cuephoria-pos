import type { Session } from '@/types/pos.types';
import { getBillableMs } from '@/utils/sessionTimer.utils';

/** First-hour tier boundaries for preset-duration walk-in sessions. */
export const PRESET_BILLING_HALF_HOUR = 30;
export const PRESET_BILLING_FIRST_HOUR = 60;

/**
 * Billable minutes for a preset-duration session:
 * - Under 30 min played → 30 min
 * - 30–60 min played → 60 min
 * - Over 60 min → exact minutes (per-minute, no buffer)
 */
export function getPresetSessionBilledMinutes(actualMinutes: number): number {
  const played = Math.max(0, Math.ceil(actualMinutes));
  if (played <= 0) return 0;
  if (played > PRESET_BILLING_FIRST_HOUR) return played;
  if (played < PRESET_BILLING_HALF_HOUR) return PRESET_BILLING_HALF_HOUR;
  return PRESET_BILLING_FIRST_HOUR;
}

export interface PresetSessionExtensionPlan {
  /** New planned_duration_minutes after extension. */
  newPlannedMinutes: number;
  /** Minutes added to the countdown (may be less than the package if already overdue). */
  effectiveAddedMinutes: number;
  /** Minutes already played past the current planned duration. */
  overtimeMinutes: number;
}

/**
 * Extension packages add to the original planned total, not to elapsed time.
 * Overtime already played counts against the package (e.g. 65 min + 30 pkg → 90 total, 25 left).
 */
export function getPresetSessionExtensionPlan(
  session: Pick<
    Session,
    'plannedDurationMinutes' | 'startTime' | 'isPaused' | 'pausedAt' | 'totalPausedMs'
  >,
  extensionPackageMinutes: number,
  now = new Date()
): PresetSessionExtensionPlan | null {
  const planned = session.plannedDurationMinutes ?? 0;
  if (planned <= 0 || extensionPackageMinutes <= 0) return null;

  const billableMinutes = Math.ceil(getBillableMs(session, now) / (1000 * 60));
  const overtimeMinutes = Math.max(0, billableMinutes - planned);
  const newPlannedMinutes = planned + extensionPackageMinutes;
  const effectiveAddedMinutes = Math.max(0, newPlannedMinutes - billableMinutes);

  return {
    newPlannedMinutes,
    effectiveAddedMinutes,
    overtimeMinutes,
  };
}

export function usesPresetSessionBilling(plannedDurationMinutes?: number): boolean {
  return (plannedDurationMinutes ?? 0) > 0;
}

/** Checkout-only: apply tier rounding, not used for live timer display. */
export function calculatePresetSessionCheckoutCost(
  hourlyRate: number,
  billableMs: number,
  playtimeDiscountPct = 0
): { cost: number; actualMinutes: number; billedMinutes: number } {
  const actualMinutes = Math.max(0, Math.ceil(billableMs / (1000 * 60)));
  const billedMinutes = getPresetSessionBilledMinutes(actualMinutes);
  let cost = Math.ceil((billedMinutes / 60) * hourlyRate);
  if (playtimeDiscountPct > 0) {
    cost = Math.ceil(cost * (1 - Math.min(100, playtimeDiscountPct) / 100));
  }
  return { cost, actualMinutes, billedMinutes };
}

// ─────────────────────────────────────────────────────────────────────────────
// Early-end billing prompt utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minutes before the planned end below which we skip showing the early-end prompt.
 * If the customer ends with less than this much time remaining the session is
 * essentially finished, so no prompt is needed.
 */
export const EARLY_END_THRESHOLD_MINUTES = 20;

type EarlyEndSession = Pick<
  Session,
  'plannedDurationMinutes' | 'startTime' | 'isPaused' | 'pausedAt' | 'totalPausedMs' | 'prepaidBooking'
>;

/**
 * Returns true when the early-end billing prompt should be offered to staff.
 *
 * Conditions:
 * - Session has a planned duration (i.e. was booked for a block, not open billing)
 * - Session is not a pre-paid online booking (handled separately)
 * - The customer ends MORE than EARLY_END_THRESHOLD_MINUTES before the planned end
 *   → they left early enough that rounding to the full block is worth asking about
 */
export function shouldShowEarlyEndPrompt(
  session: EarlyEndSession,
  now = new Date(),
): boolean {
  const planned = session.plannedDurationMinutes ?? 0;
  if (planned <= 0) return false;
  if (session.prepaidBooking) return false;

  const billableMs = getBillableMs(session, now);
  const playedMinutes = Math.ceil(billableMs / (1000 * 60));

  // Only relevant when customer ends BEFORE the planned block expires
  if (playedMinutes >= planned) return false;

  const minutesRemaining = planned - playedMinutes;
  return minutesRemaining > EARLY_END_THRESHOLD_MINUTES;
}

/**
 * Calculates the "bill full block" cost for a standard hourly-rate session.
 * Charges the full planned-duration package price (e.g. 2 hr at ₹300/hr = ₹600).
 */
export function calculateFullBlockCost(
  hourlyRate: number,
  plannedDurationMinutes: number,
  playtimeDiscountPct = 0,
): number {
  let cost = Math.ceil((plannedDurationMinutes / 60) * hourlyRate);
  if (playtimeDiscountPct > 0) {
    cost = Math.ceil(cost * (1 - Math.min(100, playtimeDiscountPct) / 100));
  }
  return cost;
}

/**
 * Calculates the "bill full block" cost for a time-based tier-pricing session.
 * Uses the tier price for the full planned duration.
 */
export function calculateFullBlockTierCost(
  plannedDurationMinutes: number,
  tiers: { minutes: number; price: number }[],
  playtimeDiscountPct = 0,
): number {
  const sorted = [...tiers].sort((a, b) => a.minutes - b.minutes);
  const match = sorted.find((t) => plannedDurationMinutes <= t.minutes) ?? sorted[sorted.length - 1];
  let cost = match?.price ?? 0;
  if (playtimeDiscountPct > 0) {
    cost = Math.ceil(cost * (1 - Math.min(100, playtimeDiscountPct) / 100));
  }
  return cost;
}

export interface EarlyEndDetails {
  playedMinutes: number;
  plannedMinutes: number;
  minutesRemaining: number;
  /** Actual per-minute / hourly cost (what would be billed today without the prompt). */
  actualCost: number;
  /** Full block package cost. */
  fullBlockCost: number;
}

/**
 * Gather all the numbers needed to render the early-end prompt dialog.
 * Returns null if the prompt should not be shown.
 */
export function getEarlyEndDetails(
  session: EarlyEndSession,
  hourlyRate: number,
  playtimeDiscountPct: number,
  billableMs: number,
  tiers?: { minutes: number; price: number }[],
): EarlyEndDetails | null {
  const planned = session.plannedDurationMinutes ?? 0;
  if (planned <= 0 || session.prepaidBooking) return null;

  const playedMinutes = Math.ceil(billableMs / (1000 * 60));
  if (playedMinutes >= planned) return null;

  const minutesRemaining = planned - playedMinutes;
  if (minutesRemaining <= EARLY_END_THRESHOLD_MINUTES) return null;

  // Actual cost — uses existing preset billing logic (≤60 min applies tier rounding)
  const { cost: actualCost } = calculatePresetSessionCheckoutCost(hourlyRate, billableMs, playtimeDiscountPct);

  const fullBlockCost =
    tiers && tiers.length > 0
      ? calculateFullBlockTierCost(planned, tiers, playtimeDiscountPct)
      : calculateFullBlockCost(hourlyRate, planned, playtimeDiscountPct);

  return { playedMinutes, plannedMinutes: planned, minutesRemaining, actualCost, fullBlockCost };
}
