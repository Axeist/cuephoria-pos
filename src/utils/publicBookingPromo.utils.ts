import { format } from 'date-fns';
import type { PromoCoupon } from '@/types/promoCoupon.types';
import {
  computePromoDiscount,
  type PromoDiscountStation,
} from '@/utils/promoCouponDiscount.utils';

export type PublicBookingSlotLike = { start_time: string; end_time?: string };
export type PublicBookingStationLike = {
  id: string;
  type: string;
  pricing_mode?: string | null;
};

export function promoCouponEmoji(coupon: Pick<PromoCoupon, 'emoji' | 'code'>): string {
  if (coupon.emoji) return coupon.emoji;
  return '🏷️';
}

export function buildPublicPromoValidateSlots(
  selectedDate: Date,
  slots: PublicBookingSlotLike[],
): { start: string; end?: string }[] {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  return slots.map((s) => ({
    start: `${dateStr}T${s.start_time}`,
    end: s.end_time ? `${dateStr}T${s.end_time}` : undefined,
  }));
}

export function buildPublicPromoValidateStations(
  stationIds: string[],
  stations: PublicBookingStationLike[],
): { id: string; type: string; pricingMode?: string | null }[] {
  return stationIds
    .map((id) => stations.find((s) => s.id === id))
    .filter((s): s is PublicBookingStationLike => Boolean(s))
    .map((s) => ({
      id: s.id,
      type: s.type,
      pricingMode: s.pricing_mode ?? null,
    }));
}

export function buildScopeMapForPromo(
  coupon: PromoCoupon,
  selectedStationIds: string[],
  stations: PublicBookingStationLike[],
  existing: Record<string, string> = {},
): Record<string, string> {
  if (coupon.discountScope === 'whole_booking') {
    return coupon.stackable ? { ...existing, all: coupon.code } : { all: coupon.code };
  }

  const rules = coupon.eligibilityRules;
  const allowedTypes = rules.stationTypes?.map((t) => t.toLowerCase());
  const excludeTypes = (rules.excludeStationTypes ?? []).map((t) => t.toLowerCase());
  const map: Record<string, string> = coupon.stackable ? { ...existing } : {};

  for (const id of selectedStationIds) {
    const s = stations.find((st) => st.id === id);
    if (!s) continue;
    const t = s.type.toLowerCase();
    if (allowedTypes?.length && !allowedTypes.includes(t)) continue;
    if (excludeTypes.includes(t)) continue;
    if (coupon.discountScope === 'per_station') {
      map[s.id] = coupon.code;
    } else {
      map[s.type] = coupon.code;
    }
  }
  return map;
}

export function mergePromoDetailsForScope(
  scopeMap: Record<string, string>,
  coupon: PromoCoupon,
  existing: Record<string, PromoCoupon>,
  stackable: boolean,
): Record<string, PromoCoupon> {
  const next: Record<string, PromoCoupon> = {};
  for (const key of Object.keys(scopeMap)) {
    next[key] = coupon;
  }
  return stackable ? { ...existing, ...next } : next;
}

export function computePublicBookingDiscount(
  appliedCoupons: Record<string, string>,
  appliedPromoDetails: Record<string, PromoCoupon>,
  stations: PromoDiscountStation[],
  originalTotal: number,
): { total: number; breakdown: Record<string, number> } {
  if (originalTotal <= 0 || !Object.keys(appliedCoupons).length) {
    return { total: 0, breakdown: {} };
  }

  const applied = Object.entries(appliedCoupons)
    .map(([scopeKey, code]) => {
      const coupon = appliedPromoDetails[scopeKey];
      if (!coupon) return null;
      return { scopeKey, code, coupon };
    })
    .filter((x): x is { scopeKey: string; code: string; coupon: PromoCoupon } => x != null);

  return computePromoDiscount({ originalTotal, applied, stations });
}

export function promoSuccessMessage(coupon: PromoCoupon): string {
  if (coupon.successMessage?.trim()) return coupon.successMessage.trim();
  if (coupon.discountType === 'percentage') {
    return `🎟️ ${coupon.code} applied: ${coupon.discountValue}% off!`;
  }
  if (coupon.discountType === 'fixed') {
    return `🎟️ ${coupon.code} applied: ₹${coupon.discountValue} off!`;
  }
  return `🎟️ ${coupon.code} applied!`;
}
