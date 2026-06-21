import {
  DEFAULT_MEMBERSHIP_FEATURE_FLAGS,
  type MembershipFeatureFlagKey,
  type MembershipFeatureFlags,
} from '../constants/membershipCatalog.js';

export function parseMembershipFeatureFlags(
  raw: unknown,
): Record<MembershipFeatureFlagKey, boolean> {
  const base = { ...DEFAULT_MEMBERSHIP_FEATURE_FLAGS };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_MEMBERSHIP_FEATURE_FLAGS) as MembershipFeatureFlagKey[]) {
    const v = obj[key];
    if (typeof v === 'boolean') base[key] = v;
    else if (v === 'true' || v === 1) base[key] = true;
    else if (v === 'false' || v === 0) base[key] = false;
  }
  return base;
}

export function mergeMembershipFlags(
  workspace: MembershipFeatureFlags,
  branch?: MembershipFeatureFlags | null,
): Record<MembershipFeatureFlagKey, boolean> {
  const merged = parseMembershipFeatureFlags(workspace);
  if (!branch) return merged;
  const branchParsed = parseMembershipFeatureFlags(branch);
  for (const key of Object.keys(DEFAULT_MEMBERSHIP_FEATURE_FLAGS) as MembershipFeatureFlagKey[]) {
    if (branch[key] !== undefined) merged[key] = branchParsed[key];
  }
  return merged;
}

export function canUseMembershipFeature(
  flags: Record<MembershipFeatureFlagKey, boolean>,
  key: MembershipFeatureFlagKey,
): boolean {
  if (!flags.module_enabled) return false;
  return !!flags[key];
}
