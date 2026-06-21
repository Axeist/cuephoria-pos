import { useQuery } from '@tanstack/react-query';
import { useMembershipFeatures } from '@/hooks/useMembershipFeatures';
import { fetchMembershipTiers } from '@/services/membershipService';
import type { MembershipTier } from '@/types/membership.types';

export function useMembershipTiers() {
  const { isEnabled } = useMembershipFeatures();

  const query = useQuery({
    queryKey: ['membership-tiers'],
    queryFn: async () => {
      const res = await fetchMembershipTiers();
      return res.tiers;
    },
    enabled: isEnabled,
    staleTime: 60_000,
  });

  return {
    tiers: query.data ?? ([] as MembershipTier[]),
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
