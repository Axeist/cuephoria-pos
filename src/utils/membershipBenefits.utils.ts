import type { Customer } from '@/types/pos.types';
import type { MembershipTier } from '@/types/membership.types';
import { isMembershipActive } from '@/utils/membership.utils';

export function isActiveMember(
  customer: Pick<Customer, 'membershipTierId' | 'membershipExpiryDate' | 'isMember'>,
  tier?: MembershipTier | null,
): boolean {
  if (!customer.membershipTierId) return false;
  if (tier && !tier.isActive) return false;
  return isMembershipActive({
    ...customer,
    isMember: true,
    membershipExpiryDate: customer.membershipExpiryDate,
  } as Customer);
}

export function getPlaytimeDiscountPct(
  customer: Pick<Customer, 'membershipTierId' | 'membershipExpiryDate' | 'isMember'>,
  tier?: MembershipTier | null,
  moduleEnabled = true,
  tierPlansEnabled = true,
): number {
  if (!moduleEnabled || !tierPlansEnabled) return 0;
  if (!isActiveMember(customer, tier)) return 0;
  return Math.max(0, Math.min(100, tier?.playtimeDiscountPct ?? 0));
}

export function getFnbDiscountPct(
  customer: Pick<Customer, 'membershipTierId' | 'membershipExpiryDate' | 'isMember'>,
  tier?: MembershipTier | null,
  moduleEnabled = true,
  tierPlansEnabled = true,
): number {
  if (!moduleEnabled || !tierPlansEnabled) return 0;
  if (!isActiveMember(customer, tier)) return 0;
  if (tier && tier.fnbBenefitsEnabled === false) return 0;
  return Math.max(0, Math.min(100, tier?.fnbDiscountPct ?? 0));
}

export function applyDiscountPct(amount: number, discountPct: number): number {
  if (discountPct <= 0) return amount;
  return Math.max(0, amount * (1 - discountPct / 100));
}

const FNB_CATEGORIES = new Set(['food', 'drinks', 'tobacco', 'fnb']);

export function isFnbCartCategory(category: string): boolean {
  return FNB_CATEGORIES.has(category.toLowerCase());
}

export function resolveMemberFnbUnitPrice(
  basePrice: number,
  category: string,
  customer: Pick<Customer, 'membershipTierId' | 'membershipExpiryDate' | 'isMember'> | null | undefined,
  tier: MembershipTier | null | undefined,
  moduleEnabled = true,
  tierPlansEnabled = true,
): number {
  if (!customer || !isFnbCartCategory(category)) return basePrice;
  const pct = getFnbDiscountPct(customer, tier, moduleEnabled, tierPlansEnabled);
  if (pct <= 0) return basePrice;
  return Math.ceil(applyDiscountPct(basePrice, pct));
}
