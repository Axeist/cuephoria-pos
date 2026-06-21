import { Customer } from '@/types/pos.types';

/**
 * Determines if a customer's membership is currently active (tier-based).
 */
export const isMembershipActive = (customer: Customer): boolean => {
  const hasTier = Boolean(customer.membershipTierId) || customer.isMember;
  if (!hasTier) return false;
  if (!customer.membershipExpiryDate) return true;
  const expiryDate = new Date(customer.membershipExpiryDate);
  return expiryDate > new Date();
};

/**
 * Badge label from tier name or legacy plan text.
 */
export const getMembershipBadgeText = (customer: Customer): string => {
  if (!customer.membershipTierId && !customer.isMember) return 'Non-Member';

  if (customer.membershipTierName) {
    const duration = customer.membershipDuration
      ? customer.membershipDuration === 'weekly'
        ? 'Weekly'
        : 'Monthly'
      : '';
    return `${customer.membershipTierName}${duration ? ` · ${duration}` : ''}`;
  }

  if (customer.membershipPlan) {
    return customer.membershipPlan;
  }

  return 'Member';
};

export const getHoursLeftColor = (hoursLeft: number | undefined): string => {
  if (hoursLeft === undefined) return '';
  if (hoursLeft <= 0) return 'text-red-600';
  if (hoursLeft < 2) return 'text-orange-500';
  return 'text-green-600';
};

/** Resolve playtime discount % from customer embed or legacy member flag. */
export function resolveCustomerPlaytimeDiscountPct(customer: Customer | null | undefined): number {
  if (!customer) return 0;
  if (customer.playtimeDiscountPct != null && customer.playtimeDiscountPct > 0) {
    return isMembershipActive(customer) ? customer.playtimeDiscountPct : 0;
  }
  return 0;
}

/** Resolve F&B discount % from customer embed when tier discount is denormalized on the row. */
export function resolveCustomerFnbDiscountPct(customer: Customer | null | undefined): number {
  if (!customer) return 0;
  const embedded = (customer as Customer & { fnbDiscountPct?: number }).fnbDiscountPct;
  if (embedded != null && embedded > 0) {
    return isMembershipActive(customer) ? embedded : 0;
  }
  return 0;
}
