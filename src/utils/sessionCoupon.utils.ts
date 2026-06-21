/** Shared coupon / happy-hour helpers for start-session flows */

import type { BranchBookingCoupon } from '@/types/bookingCoupon.types';
import type { MembershipCoupon } from '@/types/membership.types';
import type { Customer } from '@/types/pos.types';
import { isActiveMember } from '@/utils/membershipBenefits.utils';
import {
  hasOccupancyRates,
  isLegacyControllerStation,
  isPerPlayerPricing,
  type StationPricingInput,
} from '@/utils/stationPricing';

const HH99_FLAT_RATE = 99;

/** HH99 is ₹99/person when the station price scales with player count. */
export function hh99AppliesPerPerson(
  station: StationPricingInput,
  playerCount: number,
): boolean {
  if (playerCount <= 1) return false;
  return (
    isPerPlayerPricing(station) ||
    isLegacyControllerStation(station) ||
    hasOccupancyRates(station)
  );
}

export function getHh99FinalRate(
  station: StationPricingInput,
  playerCount: number,
): number {
  const count = Math.max(1, playerCount);
  return hh99AppliesPerPerson(station, playerCount)
    ? HH99_FLAT_RATE * count
    : HH99_FLAT_RATE;
}

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
  station?: StationPricingInput,
  membershipCoupons: MembershipCoupon[] = [],
  customer?: Pick<Customer, 'membershipTierId' | 'membershipExpiryDate' | 'isMember'> | null,
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
    const finalRate = station
      ? getHh99FinalRate(station, playerCount)
      : HH99_FLAT_RATE;
    const perPersonRate = station && hh99AppliesPerPerson(station, playerCount)
      ? HH99_FLAT_RATE
      : perPerson(finalRate);
    return { finalRate, perPersonRate };
  }

  const coupon = branchCoupons.find((c) => c.code === code);
  if (!coupon) {
    const memberCoupon = membershipCoupons.find((c) => c.code.toUpperCase() === code);
    if (memberCoupon) {
      if (!customer || !isActiveMember(customer)) {
        return {
          finalRate: undiscountedRate,
          perPersonRate: perPerson(undiscountedRate),
          invalidCoupon: code,
        };
      }
      if (
        memberCoupon.membershipTierId &&
        memberCoupon.membershipTierId !== customer.membershipTierId
      ) {
        return {
          finalRate: undiscountedRate,
          perPersonRate: perPerson(undiscountedRate),
          invalidCoupon: code,
        };
      }
      let newRate = undiscountedRate;
      if (memberCoupon.discountType === 'percentage') {
        newRate = undiscountedRate * (1 - memberCoupon.discountValue / 100);
      } else {
        newRate = undiscountedRate - memberCoupon.discountValue;
      }
      const finalRate = Math.max(0, Math.round(newRate));
      return { finalRate, perPersonRate: perPerson(finalRate) };
    }

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
