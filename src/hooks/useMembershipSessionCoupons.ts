import { useQuery } from '@tanstack/react-query';
import { useMembershipFeatures } from '@/hooks/useMembershipFeatures';
import { fetchMembershipCoupons } from '@/services/membershipService';
import type { MembershipCoupon } from '@/types/membership.types';

export function useMembershipSessionCoupons(enabled = true) {
  const { canUse } = useMembershipFeatures();
  const allowed = enabled && canUse('member_coupons_enabled');

  const query = useQuery({
    queryKey: ['membership-session-coupons'],
    queryFn: async () => {
      const res = await fetchMembershipCoupons();
      return res.coupons.filter((c) => c.enabled);
    },
    enabled: allowed,
    staleTime: 60_000,
  });

  return {
    coupons: query.data ?? ([] as MembershipCoupon[]),
    loading: allowed && query.isLoading,
  };
}
