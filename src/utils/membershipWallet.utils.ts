import type { CartItem } from '@/types/pos.types';
import type { MembershipTier } from '@/types/membership.types';
import type { TaxSettings } from '@/hooks/useAppSettings.types';
import { isFnbCartCategory } from '@/utils/membershipBenefits.utils';
import { computeBillTaxFromCart } from '@/utils/tax.utils';

export function isWalletEligibleCartItem(
  item: Pick<CartItem, 'type' | 'category'>,
  tier: Pick<MembershipTier, 'cardPaymentFnbEnabled'> | null | undefined,
): boolean {
  if (!tier || tier.cardPaymentFnbEnabled) return true;
  if (item.type === 'session') return true;
  if (item.type === 'product') {
    const category = (item.category ?? '').toLowerCase();
    if (category === 'membership') return false;
    if (isFnbCartCategory(category)) return false;
  }
  return true;
}

export function getWalletEligibleSubtotal(
  cart: CartItem[],
  tier: Pick<MembershipTier, 'cardPaymentFnbEnabled'> | null | undefined,
): number {
  return cart
    .filter((item) => isWalletEligibleCartItem(item, tier))
    .reduce((sum, item) => sum + item.total, 0);
}

export function getWalletIneligibleSubtotal(
  cart: CartItem[],
  tier: Pick<MembershipTier, 'cardPaymentFnbEnabled'> | null | undefined,
): number {
  return cart
    .filter((item) => !isWalletEligibleCartItem(item, tier))
    .reduce((sum, item) => sum + item.total, 0);
}

function proportionalAmount(total: number, part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (total * part) / whole;
}

export function computeWalletCheckoutAmounts(
  cart: CartItem[],
  discount: number,
  discountType: 'percentage' | 'fixed',
  loyaltyPointsUsed: number,
  taxSettings: TaxSettings,
  tier: Pick<MembershipTier, 'cardPaymentFnbEnabled'> | null | undefined,
  options?: { isComplimentary?: boolean },
): { walletAmount: number; remainderAmount: number; total: number } {
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxResult = computeBillTaxFromCart(
    subtotal,
    discount,
    discountType,
    loyaltyPointsUsed,
    taxSettings,
    { isComplimentary: options?.isComplimentary },
  );
  const total = taxResult.total;

  if (!tier || tier.cardPaymentFnbEnabled) {
    return { walletAmount: total, remainderAmount: 0, total };
  }

  const eligibleSubtotal = getWalletEligibleSubtotal(cart, tier);
  const ineligibleSubtotal = getWalletIneligibleSubtotal(cart, tier);

  if (ineligibleSubtotal <= 0) {
    return { walletAmount: total, remainderAmount: 0, total };
  }
  if (eligibleSubtotal <= 0) {
    return { walletAmount: 0, remainderAmount: total, total };
  }

  const walletAmount = Math.round(
    proportionalAmount(total, eligibleSubtotal, subtotal) * 100,
  ) / 100;
  const remainderAmount = Math.max(0, Math.round((total - walletAmount) * 100) / 100);

  return { walletAmount, remainderAmount, total };
}
