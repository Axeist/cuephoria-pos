import { useEffect, useMemo, useState } from 'react';
import type { BranchBookingCoupon } from '@/types/bookingCoupon.types';
import type { PromoCoupon } from '@/types/promoCoupon.types';
import { buildCouponSelectOptions, fetchBranchBookingCoupons } from '@/utils/branchCoupons.utils';
import { fetchPromoCouponsAdmin } from '@/services/promoCouponService';

function mapPromoToBranch(coupon: PromoCoupon): BranchBookingCoupon {
  return {
    code: coupon.code,
    description: coupon.description,
    discount_type:
      coupon.discountType === 'fixed' ? 'fixed' : 'percentage',
    discount_value: coupon.discountValue,
    enabled: coupon.enabled,
  };
}

export function useBranchCoupons(locationId: string | null | undefined, enabled = true) {
  const [coupons, setCoupons] = useState<BranchBookingCoupon[]>([]);
  const [promoCoupons, setPromoCoupons] = useState<PromoCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId || !enabled) {
      setCoupons([]);
      setPromoCoupons([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void Promise.all([
      fetchPromoCouponsAdmin(locationId).catch(() => [] as PromoCoupon[]),
      fetchBranchBookingCoupons(locationId).catch(() => [] as BranchBookingCoupon[]),
    ])
      .then(([promos, legacy]) => {
        if (cancelled) return;
        const posPromos = promos.filter(
          (c) => c.enabled && c.channels.includes('pos_session'),
        );
        setPromoCoupons(posPromos);
        const promoAsBranch = posPromos.map(mapPromoToBranch);
        const legacyOnly = legacy.filter(
          (l) => !promoAsBranch.some((p) => p.code === l.code),
        );
        setCoupons([...promoAsBranch, ...legacyOnly]);
      })
      .catch(() => {
        if (!cancelled) {
          setCoupons([]);
          setPromoCoupons([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, enabled]);

  const options = useMemo(() => buildCouponSelectOptions(coupons), [coupons]);

  return { coupons, promoCoupons, options, loading };
}
