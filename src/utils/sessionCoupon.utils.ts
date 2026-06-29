/** Shared coupon helpers for start-session flows */

import type { BranchBookingCoupon } from '@/types/bookingCoupon.types';
import type { MembershipCoupon } from '@/types/membership.types';
import type { PromoCoupon } from '@/types/promoCoupon.types';
import { validatePromoCouponEligibility } from '@/utils/promoCouponEligibility.utils';
import type { Customer } from '@/types/pos.types';
import { isActiveMember } from '@/utils/membershipBenefits.utils';
import {
  hasOccupancyRates,
  isLegacyControllerStation,
  isPerPlayerPricing,
  type StationPricingInput,
} from '@/utils/stationPricing';

function flatRateForStation(
  station: StationPricingInput,
  playerCount: number,
  flat: number,
): number {
  const count = Math.max(1, playerCount);
  if (
    count > 1 &&
    (isPerPlayerPricing(station) ||
      isLegacyControllerStation(station) ||
      hasOccupancyRates(station))
  ) {
    return flat * count;
  }
  return flat;
}

/** @deprecated Use promo coupon flat_rate instead — kept for callers importing HH helpers */
export const HH99_FLAT_RATE = 99;

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
  return flatRateForStation(station, playerCount, HH99_FLAT_RATE);
}

export const isHappyHour = (): boolean => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  return dayOfWeek >= 1 && dayOfWeek <= 5 && currentHour >= 11 && currentHour < 16;
};

function applyPromoToRate(
  undiscountedRate: number,
  promo: PromoCoupon,
  playerCount: number,
  station?: StationPricingInput,
): { finalRate: number; perPersonRate: number } {
  const perPerson = (rate: number) =>
    playerCount > 0 ? Math.round(rate / playerCount) : rate;

  if (promo.discountType === 'flat_rate' && station) {
    const finalRate = flatRateForStation(station, playerCount, promo.discountValue);
    const perPersonRate =
      playerCount > 1 && hh99AppliesPerPerson(station, playerCount)
        ? promo.discountValue
        : perPerson(finalRate);
    return { finalRate, perPersonRate };
  }

  let newRate = undiscountedRate;
  if (promo.discountType === 'percentage') {
    newRate = undiscountedRate * (1 - promo.discountValue / 100);
  } else if (promo.discountType === 'fixed') {
    newRate = undiscountedRate - promo.discountValue;
  }

  const finalRate = Math.max(0, Math.round(newRate));
  return { finalRate, perPersonRate: perPerson(finalRate) };
}

export function applyCouponToRate(
  undiscountedRate: number,
  couponCode: string | undefined,
  playerCount: number,
  branchCoupons: BranchBookingCoupon[] = [],
  station?: StationPricingInput,
  membershipCoupons: MembershipCoupon[] = [],
  customer?: Pick<Customer, 'membershipTierId' | 'membershipExpiryDate' | 'isMember'> | null,
  promoCoupons: PromoCoupon[] = [],
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

  const promo = promoCoupons.find((c) => c.code === code);
  if (promo) {
    const now = new Date();
    const eligibility = validatePromoCouponEligibility(promo, {
      channel: 'pos_session',
      locationId: '',
      selectedDate: now,
      slots: [{ start: now }],
      stations: station
        ? [
            {
              id: 'session',
              type: String(station.type ?? 'ps5'),
              pricingMode: station.pricingMode ?? null,
            },
          ]
        : [],
      slotCount: 1,
      now,
    });
    if (!eligibility.ok) {
      return {
        finalRate: undiscountedRate,
        perPersonRate: perPerson(undiscountedRate),
        invalidCoupon: code,
      };
    }
    const { finalRate, perPersonRate } = applyPromoToRate(
      undiscountedRate,
      promo,
      playerCount,
      station,
    );
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
