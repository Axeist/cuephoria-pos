import { supabase } from '@/integrations/supabase/client';
import type { BranchBookingCoupon, CouponSelectOption } from '@/types/bookingCoupon.types';

export async function fetchBranchBookingCoupons(
  locationId: string,
): Promise<BranchBookingCoupon[]> {
  const { data, error } = await supabase
    .from('booking_settings')
    .select('setting_value')
    .eq('setting_key', 'booking_coupons')
    .eq('location_id', locationId)
    .maybeSingle();

  if (error || !data?.setting_value) return [];

  const raw = data.setting_value as BranchBookingCoupon[];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((c) => c.enabled !== false && String(c.code || '').trim())
    .map((c) => ({
      code: String(c.code).trim().toUpperCase(),
      description: String(c.description ?? '').trim(),
      discount_type: c.discount_type === 'fixed' ? 'fixed' : 'percentage',
      discount_value:
        typeof c.discount_value === 'number' && Number.isFinite(c.discount_value)
          ? c.discount_value
          : Number(c.discount_value) || 0,
      enabled: c.enabled !== false,
    }));
}

export function formatCouponOptionLabel(coupon: BranchBookingCoupon): string {
  const discountLabel =
    coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% OFF`
      : `₹${coupon.discount_value} off`;
  return coupon.description ? `${coupon.code} - ${coupon.description}` : `${coupon.code} - ${discountLabel}`;
}

export function buildCouponSelectOptions(coupons: BranchBookingCoupon[]): CouponSelectOption[] {
  return [
    { value: 'none', label: 'No coupon - Regular Price' },
    ...coupons.map((c) => ({
      value: c.code,
      label: formatCouponOptionLabel(c),
    })),
  ];
}
