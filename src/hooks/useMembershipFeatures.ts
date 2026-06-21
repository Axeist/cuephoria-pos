import { useQuery } from '@tanstack/react-query';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocation } from '@/context/LocationContext';
import { fetchMembershipSettings, parseFlagsFromApi, canUseFlag } from '@/services/membershipService';
import type { MembershipFeatureFlagKey } from '@/types/membership.types';
import { DEFAULT_MEMBERSHIP_FEATURE_FLAGS } from '@/types/membership.types';

export function useMembershipFeatures() {
  const { can: canPlan, loading: planLoading } = useEntitlements();
  const { activeLocationId } = useLocation();
  const isAvailable = canPlan('memberships_enabled');

  const { data, isLoading: settingsLoading } = useQuery({
    queryKey: ['membership-features', activeLocationId],
    queryFn: async () => {
      const res = await fetchMembershipSettings(activeLocationId);
      return {
        flags: parseFlagsFromApi(res.flags),
        settings: res.settings,
      };
    },
    enabled: isAvailable,
    staleTime: 60_000,
  });

  const flags = data?.flags ?? { ...DEFAULT_MEMBERSHIP_FEATURE_FLAGS };
  const isEnabled = isAvailable && flags.module_enabled;

  const canUse = (key: MembershipFeatureFlagKey) => {
    if (!isAvailable) return false;
    return canUseFlag(flags, key);
  };

  return {
    loading: planLoading || (isAvailable && settingsLoading),
    isAvailable,
    isEnabled,
    flags,
    settings: data?.settings ?? null,
    canUse,
  };
}
