import type { PromoCoupon } from '@/types/promoCoupon.types';
import {
  hasOccupancyRates,
  isLegacyControllerStation,
  isPerPlayerPricing,
  type StationPricingInput,
} from '@/utils/stationPricing';

function flatRateForStation(
  station: PromoDiscountStation,
  coupon: PromoCoupon,
): number {
  const flat = coupon.discountValue;
  const input = station.pricingInput;
  const count = Math.max(1, station.playerCount);
  if (
    input &&
    count > 1 &&
    (isPerPlayerPricing(input) || isLegacyControllerStation(input) || hasOccupancyRates(input))
  ) {
    return flat * count;
  }
  return flat;
}

export type PromoDiscountStation = {
  id: string;
  type: string;
  pricingMode?: string | null;
  undiscountedPrice: number;
  playerCount: number;
  pricingInput?: StationPricingInput;
};

export type PromoDiscountInput = {
  originalTotal: number;
  applied: Array<{ scopeKey: string; code: string; coupon: PromoCoupon }>;
  stations: PromoDiscountStation[];
};

function applyDiscountToAmount(amount: number, coupon: PromoCoupon): number {
  if (amount <= 0) return 0;
  switch (coupon.discountType) {
    case 'percentage':
      return amount * (coupon.discountValue / 100);
    case 'fixed':
      return Math.min(amount, coupon.discountValue);
    case 'flat_rate':
      return 0;
    default:
      return 0;
  }
}

function flatRateDiscount(station: PromoDiscountStation, coupon: PromoCoupon): number {
  const flat = coupon.discountValue;
  if (!station.pricingInput) {
    return Math.max(0, station.undiscountedPrice - flat);
  }
  const finalRate = flatRateForStation(station, coupon);
  return Math.max(0, station.undiscountedPrice - finalRate);
}

export function computePromoDiscount(input: PromoDiscountInput): {
  total: number;
  breakdown: Record<string, number>;
} {
  const { originalTotal, applied, stations } = input;
  if (!applied.length || originalTotal <= 0) {
    return { total: 0, breakdown: {} };
  }

  let totalDiscount = 0;
  const breakdown: Record<string, number> = {};

  for (const entry of applied) {
    const { coupon, code, scopeKey } = entry;
    let discount = 0;

    if (coupon.discountScope === 'whole_booking') {
      discount = applyDiscountToAmount(originalTotal, coupon);
      breakdown[code] = (breakdown[code] ?? 0) + discount;
    } else if (coupon.discountScope === 'per_station_type') {
      const typeKey = scopeKey === 'all' ? null : scopeKey;
      const matched = typeKey
        ? stations.filter((s) => s.type === typeKey)
        : stations;
      for (const st of matched) {
        let d = 0;
        if (coupon.discountType === 'flat_rate') {
          d = flatRateDiscount(st, coupon);
        } else {
          d = applyDiscountToAmount(st.undiscountedPrice, coupon);
        }
        if (d > 0) {
          discount += d;
          const label = `${st.type} (${code})`;
          breakdown[label] = (breakdown[label] ?? 0) + d;
        }
      }
    } else {
      const st = stations.find((s) => s.id === scopeKey);
      if (st) {
        if (coupon.discountType === 'flat_rate') {
          discount = flatRateDiscount(st, coupon);
        } else {
          discount = applyDiscountToAmount(st.undiscountedPrice, coupon);
        }
        breakdown[`${st.type} (${code})`] = discount;
      }
    }

    totalDiscount += discount;
  }

  return {
    total: Math.min(originalTotal, Math.round(totalDiscount * 100) / 100),
    breakdown,
  };
}

export function resolveCouponScopeKey(
  coupon: PromoCoupon,
  stations: PromoDiscountStation[],
): string {
  if (coupon.discountScope === 'whole_booking') return 'all';
  if (coupon.discountScope === 'per_station_type' && stations.length === 1) {
    return stations[0].type;
  }
  if (coupon.discountScope === 'per_station' && stations.length === 1) {
    return stations[0].id;
  }
  return 'all';
}
