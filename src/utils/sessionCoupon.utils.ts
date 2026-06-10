/** Shared coupon / happy-hour helpers for start-session flows */

import type { BranchBookingCoupon } from '@/types/bookingCoupon.types';

export const isHappyHour = (): boolean => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  return dayOfWeek >= 1 && dayOfWeek <= 5 && currentHour >= 11 && currentHour < 16;
};

export function applyCouponToRate(
  undiscountedRate: number,
  couponCode: string | undefined,
  playerCount: number,
  branchCoupons: BranchBookingCoupon[] = [],
): { finalRate: number; perPersonRate: number; invalidCoupon?: string } {
  const perPerson = (rate: number) =>
    playerCount > 0 ? Math.round(rate / playerCount) : rate;

  if (!couponCode || couponCode === 'none') {
    return {
      finalRate: undiscountedRate,
      perPersonRate: perPerson(undiscountedRate),
    };
  }

  const code = couponCode.toUpperCase();

  // Legacy happy-hour flat rate — kept for workspaces that still use HH99.
  if (code === 'HH99') {
    if (!isHappyHour()) {
      return {
        finalRate: undiscountedRate,
        perPersonRate: perPerson(undiscountedRate),
        invalidCoupon: 'HH99',
      };
    }
    return { finalRate: 99, perPersonRate: perPerson(99) };
  }

  const coupon = branchCoupons.find((c) => c.code === code);
  if (!coupon) {
    return {
      finalRate: undiscountedRate,
      perPersonRate: perPerson(undiscountedRate),
    };
  }

  let newRate = undiscountedRate;
  if (coupon.discount_type === 'percentage') {
    newRate = undiscountedRate * (1 - coupon.discount_value / 100);
  } else {
    newRate = undiscountedRate - coupon.discount_value;
  }

  const finalRate = Math.max(0, Math.round(newRate));
  return {
    finalRate,
    perPersonRate: perPerson(finalRate),
  };
}
