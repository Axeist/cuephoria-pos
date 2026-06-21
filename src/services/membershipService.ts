import { adminFetch } from '@/services/adminFetch';
import type {
  MembershipCard,
  MembershipCardWithMember,
  MembershipCoupon,
  MembershipFeatureFlagKey,
  MembershipRechargeTier,
  MembershipSettings,
  MembershipTier,
} from '@/types/membership.types';
import { canUseMembershipFeature, parseMembershipFeatureFlags } from '@/utils/membershipFeatureFlags';

export type MembershipFlags = Record<MembershipFeatureFlagKey, boolean>;

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };

function appendLocation(q: URLSearchParams, locationId?: string | null) {
  if (locationId) q.set('location_id', locationId);
  return q;
}

async function membershipGet<T>(query: URLSearchParams, locationId?: string | null): Promise<T> {
  appendLocation(query, locationId);
  const res = await adminFetch(`/api/admin/memberships?${query.toString()}`);
  const json = (await res.json().catch(() => ({}))) as ApiOk<T> | ApiErr;
  if (!res.ok || json.ok === false) {
    throw new Error((json as ApiErr).error || `Request failed (${res.status})`);
  }
  return json as T;
}

async function membershipPost<T>(
  op: string,
  args: Record<string, unknown> = {},
  locationId?: string | null,
): Promise<T> {
  const loc = locationId ?? (typeof args.locationId === 'string' ? args.locationId : null);
  const qs = loc ? `?location_id=${encodeURIComponent(loc)}` : '';
  const res = await adminFetch(`/api/admin/memberships${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, args }),
  });
  const json = (await res.json().catch(() => ({}))) as ApiOk<T> | ApiErr;
  if (!res.ok || json.ok === false) {
    throw new Error((json as ApiErr).error || `Request failed (${res.status})`);
  }
  return json as T;
}

export async function fetchMembershipSettings(locationId?: string | null) {
  const q = new URLSearchParams({ op: 'fetchSettings' });
  return membershipGet<{
    settings: { workspace: MembershipSettings | null; branch: MembershipSettings | null };
    flags: MembershipFlags;
  }>(q, locationId);
}

export async function fetchMembershipTiers(locationId?: string | null) {
  const q = new URLSearchParams({ op: 'fetchTiers' });
  return membershipGet<{ tiers: MembershipTier[] }>(q, locationId);
}

export async function fetchRechargeTiers(locationId?: string | null) {
  const q = new URLSearchParams({ op: 'fetchRechargeTiers' });
  return membershipGet<{ rechargeTiers: MembershipRechargeTier[] }>(q, locationId);
}

export async function fetchMembershipCoupons(locationId?: string | null) {
  const q = new URLSearchParams({ op: 'fetchCoupons' });
  return membershipGet<{ coupons: MembershipCoupon[] }>(q, locationId);
}

export async function fetchMembershipCards(locationId?: string | null) {
  const q = new URLSearchParams({ op: 'fetchCards' });
  return membershipGet<{ cards: MembershipCardWithMember[] }>(q, locationId);
}

export async function lookupMembershipCard(uid: string, locationId?: string | null) {
  const q = new URLSearchParams({ op: 'lookupCard', uid });
  return membershipGet<{ result: unknown }>(q, locationId);
}

export async function lookupMember(ref: string, locationId?: string | null) {
  const q = new URLSearchParams({ op: 'lookupMember', ref });
  return membershipGet<{ result: unknown }>(q, locationId);
}

export async function updateMembershipSettings(
  args: Record<string, unknown>,
  locationId?: string | null,
) {
  return membershipPost<{ settings: MembershipSettings }>(
    'updateSettings',
    args,
    locationId ?? (args.locationId as string | null | undefined),
  );
}

export async function upsertMembershipTier(
  tier: Partial<MembershipTier> & { name: string },
  locationId?: string | null,
) {
  return membershipPost<{ tier: MembershipTier }>(
    'upsertTier',
    tier as Record<string, unknown>,
    locationId,
  );
}

export async function deleteMembershipTier(tierId: string, locationId?: string | null) {
  return membershipPost('deleteTier', { tierId }, locationId);
}

export async function upsertRechargeTier(
  tier: Partial<MembershipRechargeTier> & { payAmount: number; creditAmount: number },
  locationId?: string | null,
) {
  return membershipPost<{ rechargeTier: MembershipRechargeTier }>(
    'upsertRechargeTier',
    tier as Record<string, unknown>,
    locationId,
  );
}

export async function deleteRechargeTier(id: string, locationId?: string | null) {
  return membershipPost('deleteRechargeTier', { id }, locationId);
}

export async function upsertMembershipCoupon(
  coupon: Partial<MembershipCoupon> & { code: string },
  locationId?: string | null,
) {
  return membershipPost<{ coupon: MembershipCoupon }>(
    'upsertCoupon',
    coupon as Record<string, unknown>,
    locationId,
  );
}

export async function deleteMembershipCoupon(id: string, locationId?: string | null) {
  return membershipPost('deleteCoupon', { id }, locationId);
}

export async function assignMembershipTier(args: Record<string, unknown>, locationId?: string | null) {
  return membershipPost('assignTier', args, locationId);
}

export async function rechargeMembershipCard(
  args: Record<string, unknown>,
  locationId?: string | null,
) {
  return membershipPost<{ balanceAfter: number }>(
    'recharge',
    args,
    locationId ?? (args.locationId as string | null | undefined),
  );
}

export async function redeemMembershipCard(args: Record<string, unknown>, locationId?: string | null) {
  return membershipPost<{ balanceAfter: number }>('redeem', args, locationId);
}

export async function assignNfcCard(args: Record<string, unknown>, locationId?: string | null) {
  return membershipPost<{ card: MembershipCard }>(
    'assignCard',
    args,
    locationId ?? (args.locationId as string | null | undefined),
  );
}

export async function addCardToInventory(
  uid: string,
  customerId: string,
  locationId?: string | null,
) {
  return membershipPost<{ card: MembershipCard }>(
    'addInventoryCard',
    { uid, customerId, locationId },
    locationId,
  );
}

export function parseFlagsFromApi(raw: unknown) {
  return parseMembershipFeatureFlags(raw);
}

export function canUseFlag(
  flags: MembershipFlags,
  key: MembershipFeatureFlagKey,
  moduleEnabled = flags.module_enabled,
) {
  if (!moduleEnabled) return false;
  return canUseMembershipFeature(flags, key);
}
