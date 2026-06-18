import { useEffect, useMemo, useState } from 'react';
import type { BranchBookingCoupon } from '@/types/bookingCoupon.types';
import { buildCouponSelectOptions, fetchBranchBookingCoupons } from '@/utils/branchCoupons.utils';

export function useBranchCoupons(locationId: string | null | undefined, enabled = true) {
  const [coupons, setCoupons] = useState<BranchBookingCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId || !enabled) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchBranchBookingCoupons(locationId)
      .then((rows) => {
        if (!cancelled) setCoupons(rows);
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, enabled]);

  const options = useMemo(() => buildCouponSelectOptions(coupons), [coupons]);

  return { coupons, options, loading };
}
