import { adminFetch } from '@/services/adminFetch';
import type {
  MembershipCard,
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

async function membershipGet<T>(query: string): Promise<T> {
  const res = await adminFetch(`/api/admin/memberships?${query}`);
  const json = (await res.json().catch(() => ({}))) as ApiOk<T> | ApiErr;
  if (!res.ok || json.ok === false) {
    throw new Error((json as ApiErr).error || `Request failed (${res.status})`);
  }
  return json as T;
}

async function membershipPost<T>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await adminFetch('/api/admin/memberships', {
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
  if (locationId) q.set('location_id', locationId);
  return membershipGet<{
    settings: { workspace: MembershipSettings | null; branch: MembershipSettings | null };
    flags: MembershipFlags;
  }>(q.toString());
}

export async function fetchMembershipTiers() {
  return membershipGet<{ tiers: MembershipTier[] }>('op=fetchTiers');
}

export async function fetchRechargeTiers() {
  return membershipGet<{ rechargeTiers: MembershipRechargeTier[] }>('op=fetchRechargeTiers');
}

export async function fetchMembershipCoupons() {
  return membershipGet<{ coupons: MembershipCoupon[] }>('op=fetchCoupons');
}

export async function fetchMembershipCards() {
  return membershipGet<{ cards: MembershipCard[] }>('op=fetchCards');
}

export async function lookupMembershipCard(uid: string) {
  const q = new URLSearchParams({ op: 'lookupCard', uid });
  return membershipGet<{ result: unknown }>(q.toString());
}

export async function updateMembershipSettings(args: Record<string, unknown>) {
  return membershipPost<{ settings: MembershipSettings }>('updateSettings', args);
}

export async function upsertMembershipTier(tier: Partial<MembershipTier> & { name: string }) {
  return membershipPost<{ tier: MembershipTier }>('upsertTier', tier as Record<string, unknown>);
}

export async function deleteMembershipTier(tierId: string) {
  return membershipPost('deleteTier', { tierId });
}

export async function upsertRechargeTier(
  tier: Partial<MembershipRechargeTier> & { payAmount: number; creditAmount: number },
) {
  return membershipPost<{ rechargeTier: MembershipRechargeTier }>(
    'upsertRechargeTier',
    tier as Record<string, unknown>,
  );
}

export async function deleteRechargeTier(id: string) {
  return membershipPost('deleteRechargeTier', { id });
}

export async function upsertMembershipCoupon(
  coupon: Partial<MembershipCoupon> & { code: string },
) {
  return membershipPost<{ coupon: MembershipCoupon }>('upsertCoupon', coupon as Record<string, unknown>);
}

export async function deleteMembershipCoupon(id: string) {
  return membershipPost('deleteCoupon', { id });
}

export async function assignMembershipTier(args: Record<string, unknown>) {
  return membershipPost('assignTier', args);
}

export async function rechargeMembershipCard(args: Record<string, unknown>) {
  return membershipPost<{ balanceAfter: number }>('recharge', args);
}

export async function redeemMembershipCard(args: Record<string, unknown>) {
  return membershipPost<{ balanceAfter: number }>('redeem', args);
}

export async function assignNfcCard(args: Record<string, unknown>) {
  return membershipPost<{ card: MembershipCard }>('assignCard', args);
}

export async function addCardToInventory(uid: string, locationId?: string | null) {
  return membershipPost<{ card: MembershipCard }>('addInventoryCard', { uid, locationId });
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
