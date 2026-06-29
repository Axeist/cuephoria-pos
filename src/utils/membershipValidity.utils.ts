import { addDays, addMonths } from 'date-fns';
import type { MembershipTier } from '@/types/membership.types';

export type MembershipValidityMode = 'lifetime' | 'weekly' | 'monthly' | 'custom_days' | 'custom_date';

export type MembershipValidityOverride =
  | { mode: 'tier_default' }
  | { mode: 'lifetime' }
  | { mode: 'custom_date'; expiryDate: Date };

export function getTierValidityMode(
  tier: Pick<MembershipTier, 'defaultDuration' | 'defaultValidityDays'>,
): Exclude<MembershipValidityMode, 'custom_date'> {
  const mode = tier.defaultDuration ?? 'monthly';
  if (mode === 'lifetime' || mode === 'weekly' || mode === 'monthly' || mode === 'custom_days') {
    return mode;
  }
  return 'monthly';
}

export function formatValidityLabel(
  tier: Pick<MembershipTier, 'defaultDuration' | 'defaultValidityDays'>,
): string {
  const mode = getTierValidityMode(tier);
  switch (mode) {
    case 'lifetime':
      return 'Lifetime';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom_days':
      return tier.defaultValidityDays
        ? `${tier.defaultValidityDays} days`
        : 'Custom days';
    default:
      return 'Monthly';
  }
}

export function computeMembershipExpiry(
  start: Date,
  tier: Pick<MembershipTier, 'defaultDuration' | 'defaultValidityDays'>,
  override: MembershipValidityOverride = { mode: 'tier_default' },
): { expiryDate: Date | null; durationLabel: string } {
  if (override.mode === 'lifetime') {
    return { expiryDate: null, durationLabel: 'lifetime' };
  }
  if (override.mode === 'custom_date') {
    return {
      expiryDate: override.expiryDate,
      durationLabel: 'custom',
    };
  }

  const mode = getTierValidityMode(tier);
  switch (mode) {
    case 'lifetime':
      return { expiryDate: null, durationLabel: 'lifetime' };
    case 'weekly':
      return { expiryDate: addDays(start, 7), durationLabel: 'weekly' };
    case 'monthly':
      return { expiryDate: addMonths(start, 1), durationLabel: 'monthly' };
    case 'custom_days': {
      const days = Math.max(1, tier.defaultValidityDays ?? 30);
      return { expiryDate: addDays(start, days), durationLabel: 'custom_days' };
    }
    default:
      return { expiryDate: addMonths(start, 1), durationLabel: 'monthly' };
  }
}
