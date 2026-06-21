import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_MEMBERSHIP_FEATURE_FLAGS,
  type MembershipFeatureFlagKey,
} from '../constants/membershipCatalog.js';
import type { MembershipTier } from '../../types/membership.types.js';
import { mergeMembershipFlags, parseMembershipFeatureFlags } from './membershipFeatureFlags.js';

export type ResolvedMembershipFlags = Record<MembershipFeatureFlagKey, boolean>;

export async function resolveMembershipFlags(
  supabase: SupabaseClient,
  organizationId: string,
  locationId?: string | null,
): Promise<ResolvedMembershipFlags> {
  const { data: rows } = await supabase
    .from('membership_settings')
    .select('location_id, feature_flags')
    .eq('organization_id', organizationId);

  const workspaceRow = (rows ?? []).find((r) => r.location_id == null);
  const branchRow =
    locationId != null ? (rows ?? []).find((r) => r.location_id === locationId) : null;

  const workspaceFlags = parseMembershipFeatureFlags(workspaceRow?.feature_flags ?? {});
  const branchFlags = branchRow ? parseMembershipFeatureFlags(branchRow.feature_flags) : null;
  return mergeMembershipFlags(workspaceFlags, branchFlags);
}

export function assertMembershipFeature(
  flags: ResolvedMembershipFlags,
  key: MembershipFeatureFlagKey,
): { ok: true } | { ok: false; error: string } {
  if (!flags.module_enabled) {
    return { ok: false, error: 'Memberships module is disabled for this workspace.' };
  }
  if (!flags[key]) {
    return { ok: false, error: `Membership feature "${key}" is disabled.` };
  }
  return { ok: true };
}

export function mapTierRow(row: Record<string, unknown>): MembershipTier {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    locationId: row.location_id ? String(row.location_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    playtimeDiscountPct: Number(row.playtime_discount_pct ?? 0),
    fnbDiscountPct: Number(row.fnb_discount_pct ?? 0),
    cardPaymentFnbEnabled: Boolean(row.card_payment_fnb_enabled),
    bookingPayAtVenueEnabled: Boolean(row.booking_pay_at_venue_enabled),
    minRechargeAmount: row.min_recharge_amount != null ? Number(row.min_recharge_amount) : null,
    maxCardBalance: row.max_card_balance != null ? Number(row.max_card_balance) : null,
    retailPrice: Number(row.retail_price ?? 0),
    walletCreditOnPurchase: Number(row.wallet_credit_on_purchase ?? 0),
    defaultDuration: (row.default_duration as 'weekly' | 'monthly') ?? 'monthly',
    defaultMembershipHours: Number(row.default_membership_hours ?? 4),
    productId: row.product_id ? String(row.product_id) : null,
    description: row.description != null ? String(row.description) : '',
    tagline: row.tagline != null ? String(row.tagline) : '',
    accentColor: row.accent_color != null ? String(row.accent_color) : 'violet',
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function fetchTierById(
  supabase: SupabaseClient,
  organizationId: string,
  tierId: string,
): Promise<MembershipTier | null> {
  const { data } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', tierId)
    .maybeSingle();
  return data ? mapTierRow(data as Record<string, unknown>) : null;
}

export async function ensureDefaultSettings(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<void> {
  await supabase.from('membership_settings').upsert(
    {
      organization_id: organizationId,
      location_id: null,
      feature_flags: DEFAULT_MEMBERSHIP_FEATURE_FLAGS,
    },
    { onConflict: 'organization_id,location_id' },
  );
}
