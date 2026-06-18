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
  isMember = false
): { cost: number; actualMinutes: number; billedMinutes: number } {
  const actualMinutes = Math.max(0, Math.ceil(billableMs / (1000 * 60)));
  const billedMinutes = getPresetSessionBilledMinutes(actualMinutes);
  let cost = Math.ceil((billedMinutes / 60) * hourlyRate);
  if (isMember) {
    cost = Math.ceil(cost * 0.5);
  }
  return { cost, actualMinutes, billedMinutes };
}
