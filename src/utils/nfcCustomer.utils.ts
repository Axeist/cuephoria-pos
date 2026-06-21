import type { Customer } from '@/types/pos.types';
import type { MembershipCardLookupResult } from '@/types/membership.types';

/** Merge NFC lookup payload into an existing POS customer row (or build a minimal one). */
export function mergeNfcLookupWithCustomer(
  result: MembershipCardLookupResult,
  existing?: Customer | null,
): Customer {
  const tierId = result.customer.membershipTierId ?? existing?.membershipTierId;
  const base: Customer = existing ?? {
    id: result.customer.id,
    name: result.customer.name,
    phone: result.customer.phone,
    email: result.customer.email ?? undefined,
    isMember: Boolean(tierId),
    loyaltyPoints: 0,
    totalSpent: 0,
    totalPlayTime: 0,
    createdAt: new Date(),
  };

  return {
    ...base,
    membershipTierId: tierId ?? undefined,
    membershipTierName: result.tier?.name ?? base.membershipTierName,
    cardBalance: result.customer.cardBalance ?? base.cardBalance ?? 0,
    isMember: Boolean(tierId) || base.isMember,
    playtimeDiscountPct: result.tier?.playtimeDiscountPct ?? base.playtimeDiscountPct,
    membershipExpiryDate: result.customer.membershipExpiryDate
      ? new Date(result.customer.membershipExpiryDate)
      : base.membershipExpiryDate,
    membershipHoursLeft:
      result.customer.membershipHoursLeft ?? base.membershipHoursLeft,
  };
}
