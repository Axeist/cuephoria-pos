import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PromoCoupon,
  PromoCouponChannel,
  PromoCouponValidateContext,
} from '../../types/promoCoupon.types.js';
import {
  validatePromoCouponCustomer,
  validatePromoCouponEligibility,
} from '../../utils/promoCouponEligibility.utils.js';

/** Legacy simple coupons stored in booking_settings.booking_coupons */
export type LegacyBookingCoupon = {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  enabled: boolean;
};

function normalizeLegacyBookingCoupon(raw: unknown): LegacyBookingCoupon | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const code = String(row.code || '').trim().toUpperCase();
  if (!code) return null;
  return {
    code,
    description: String(row.description ?? '').trim(),
    discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discount_value:
      typeof row.discount_value === 'number' && Number.isFinite(row.discount_value)
        ? row.discount_value
        : Number(row.discount_value) || 0,
    enabled: row.enabled !== false,
  };
}

export async function fetchLocationLegacyBookingCoupons(
  supabase: SupabaseClient,
  locationId: string,
): Promise<LegacyBookingCoupon[] | null> {
  const { data, error } = await supabase
    .from('booking_settings')
    .select('setting_value')
    .eq('setting_key', 'booking_coupons')
    .eq('location_id', locationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.setting_value) return null;
  if (!Array.isArray(data.setting_value)) return null;
  return data.setting_value
    .map(normalizeLegacyBookingCoupon)
    .filter((c): c is LegacyBookingCoupon => c != null);
}

export function legacyBookingCouponToPromo(
  legacy: LegacyBookingCoupon,
  organizationId: string,
  locationId: string,
): PromoCoupon {
  return {
    id: `legacy-${legacy.code}`,
    organizationId,
    locationId,
    code: legacy.code,
    description: legacy.description,
    enabled: true,
    discountType: legacy.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: legacy.discount_value,
    discountScope: 'whole_booking',
    channels: ['public_booking'],
    memberOnly: false,
    customerGroups: ['all'],
    allowsOnlinePayment: true,
    allowsVenuePayment: false,
    eligibilityRules: {},
    gates: {},
    stackable: false,
    usesCount: 0,
    sortOrder: 0,
  };
}

/** When a branch manages legacy booking coupons, those codes are the public-booking allowlist. */
function applyLegacyPublicOverrides(
  promo: PromoCoupon,
  legacy: LegacyBookingCoupon,
): PromoCoupon {
  return {
    ...promo,
    description: legacy.description || promo.description,
    discountType: legacy.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: legacy.discount_value,
    discountScope: 'whole_booking',
    eligibilityRules: {},
    gates: {},
  };
}

export async function resolvePublicBookingCoupons(
  supabase: SupabaseClient,
  organizationId: string,
  locationId: string,
  channel: PromoCouponChannel,
): Promise<PromoCoupon[]> {
  const promos = await fetchPromoCoupons(supabase, organizationId, locationId);
  const channelPromos = promos.filter((c) => c.enabled && c.channels.includes(channel));
  const legacy = await fetchLocationLegacyBookingCoupons(supabase, locationId);
  if (legacy === null) return channelPromos;

  const enabledLegacy = legacy.filter((c) => c.enabled);
  const result: PromoCoupon[] = [];
  for (const leg of enabledLegacy) {
    const promo = channelPromos.find((c) => c.code === leg.code);
    if (promo) {
      result.push(applyLegacyPublicOverrides(promo, leg));
    } else {
      result.push(legacyBookingCouponToPromo(leg, organizationId, locationId));
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function syncLegacyBookingCouponsToPromo(
  supabase: SupabaseClient,
  organizationId: string,
  coupons: LegacyBookingCoupon[],
): Promise<void> {
  for (const leg of coupons) {
    const code = leg.code.toUpperCase().trim();
    if (!code) continue;

    const existing = await fetchPromoCouponByCode(supabase, organizationId, code, null);
    const channels = existing?.channels ?? ['public_booking'];
    const mergedChannels = channels.includes('public_booking')
      ? channels
      : ([...channels, 'public_booking'] as PromoCoupon['channels']);

    await upsertPromoCoupon(supabase, organizationId, {
      id: existing?.id,
      code,
      description: leg.description || existing?.description || '',
      discountType: leg.discount_type === 'fixed' ? 'fixed' : 'percentage',
      discountValue: leg.discount_value,
      discountScope: existing?.discountScope ?? 'whole_booking',
      channels: mergedChannels,
      locationId: existing?.locationId ?? null,
      memberOnly: existing?.memberOnly ?? false,
      membershipTierIds: existing?.membershipTierIds ?? null,
      customerGroups: existing?.customerGroups ?? ['all'],
      allowsOnlinePayment: existing?.allowsOnlinePayment ?? true,
      allowsVenuePayment: existing?.allowsVenuePayment ?? false,
      validFrom: existing?.validFrom ?? null,
      validUntil: existing?.validUntil ?? null,
      eligibilityRules: {},
      gates: {},
      stackable: existing?.stackable ?? false,
      maxUsesTotal: existing?.maxUsesTotal ?? null,
      maxUsesPerCustomer: existing?.maxUsesPerCustomer ?? null,
      successMessage: existing?.successMessage ?? null,
      emoji: existing?.emoji ?? null,
      sortOrder: existing?.sortOrder ?? 0,
      enabled: existing?.enabled ?? true,
    });
  }
}

export function mapPromoCouponRow(row: Record<string, unknown>): PromoCoupon {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    locationId: row.location_id ? String(row.location_id) : null,
    code: String(row.code).toUpperCase(),
    description: String(row.description ?? ''),
    enabled: Boolean(row.enabled),
    discountType: (row.discount_type as PromoCoupon['discountType']) ?? 'percentage',
    discountValue: Number(row.discount_value ?? 0),
    discountScope: (row.discount_scope as PromoCoupon['discountScope']) ?? 'whole_booking',
    channels: Array.isArray(row.channels)
      ? (row.channels as PromoCouponChannel[])
      : ['public_booking'],
    memberOnly: Boolean(row.member_only),
    membershipTierIds: Array.isArray(row.membership_tier_ids)
      ? (row.membership_tier_ids as string[])
      : null,
    customerGroups: Array.isArray(row.customer_groups)
      ? (row.customer_groups as PromoCoupon['customerGroups'])
      : ['all'],
    allowsOnlinePayment: row.allows_online_payment !== false,
    allowsVenuePayment: Boolean(row.allows_venue_payment),
    validFrom: row.valid_from ? String(row.valid_from) : null,
    validUntil: row.valid_until ? String(row.valid_until) : null,
    eligibilityRules:
      row.eligibility_rules && typeof row.eligibility_rules === 'object'
        ? (row.eligibility_rules as PromoCoupon['eligibilityRules'])
        : {},
    gates:
      row.gates && typeof row.gates === 'object'
        ? (row.gates as PromoCoupon['gates'])
        : {},
    stackable: Boolean(row.stackable),
    maxUsesTotal: row.max_uses_total != null ? Number(row.max_uses_total) : null,
    usesCount: Number(row.uses_count ?? 0),
    maxUsesPerCustomer:
      row.max_uses_per_customer != null ? Number(row.max_uses_per_customer) : null,
    successMessage: row.success_message != null ? String(row.success_message) : null,
    emoji: row.emoji != null ? String(row.emoji) : null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function rowFromInput(
  organizationId: string,
  input: Partial<PromoCoupon> & { code: string },
): Record<string, unknown> {
  return {
    organization_id: organizationId,
    location_id: input.locationId ?? null,
    code: input.code.toUpperCase().trim(),
    description: input.description ?? '',
    enabled: input.enabled ?? true,
    discount_type: input.discountType ?? 'percentage',
    discount_value: input.discountValue ?? 0,
    discount_scope: input.discountScope ?? 'whole_booking',
    channels: input.channels ?? ['public_booking'],
    member_only: input.memberOnly ?? false,
    membership_tier_ids: input.membershipTierIds ?? null,
    customer_groups: input.customerGroups ?? ['all'],
    allows_online_payment: input.allowsOnlinePayment ?? true,
    allows_venue_payment: input.allowsVenuePayment ?? false,
    valid_from: input.validFrom ?? null,
    valid_until: input.validUntil ?? null,
    eligibility_rules: input.eligibilityRules ?? {},
    gates: input.gates ?? {},
    stackable: input.stackable ?? false,
    max_uses_total: input.maxUsesTotal ?? null,
    max_uses_per_customer: input.maxUsesPerCustomer ?? null,
    success_message: input.successMessage ?? null,
    emoji: input.emoji ?? null,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchPromoCoupons(
  supabase: SupabaseClient,
  organizationId: string,
  locationId?: string | null,
): Promise<PromoCoupon[]> {
  let q = supabase
    .from('promo_coupons')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  if (locationId) {
    q = q.or(`location_id.is.null,location_id.eq.${locationId}`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapPromoCouponRow(r as Record<string, unknown>));
}

export async function fetchPromoCouponByCode(
  supabase: SupabaseClient,
  organizationId: string,
  code: string,
  locationId?: string | null,
): Promise<PromoCoupon | null> {
  const normalized = code.toUpperCase().trim();
  const { data, error } = await supabase
    .from('promo_coupons')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('code', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const coupon = mapPromoCouponRow(data as Record<string, unknown>);
  if (coupon.locationId && locationId && coupon.locationId !== locationId) {
    return null;
  }
  return coupon;
}

export async function upsertPromoCoupon(
  supabase: SupabaseClient,
  organizationId: string,
  input: Partial<PromoCoupon> & { code: string },
): Promise<PromoCoupon> {
  const row = rowFromInput(organizationId, input);
  if (input.id) {
    const { data, error } = await supabase
      .from('promo_coupons')
      .update(row)
      .eq('id', input.id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapPromoCouponRow(data as Record<string, unknown>);
  }
  const { data, error } = await supabase
    .from('promo_coupons')
    .insert(row)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapPromoCouponRow(data as Record<string, unknown>);
}

export async function deletePromoCoupon(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('promo_coupons')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

export async function validatePromoCoupon(
  supabase: SupabaseClient,
  organizationId: string,
  code: string,
  ctx: PromoCouponValidateContext,
): Promise<{ ok: true; coupon: PromoCoupon } | { ok: false; error: string }> {
  const normalized = code.toUpperCase().trim();
  const legacy = await fetchLocationLegacyBookingCoupons(supabase, ctx.locationId);

  if (legacy !== null) {
    const leg = legacy.find((c) => c.code === normalized);
    if (!leg || !leg.enabled) {
      return { ok: false, error: 'Invalid coupon code.' };
    }
  }

  let coupon = await fetchPromoCouponByCode(
    supabase,
    organizationId,
    code,
    ctx.locationId,
  );

  if (!coupon && legacy !== null) {
    const leg = legacy.find((c) => c.code === normalized);
    if (leg?.enabled) {
      coupon = legacyBookingCouponToPromo(leg, organizationId, ctx.locationId);
    }
  }

  if (!coupon) {
    return { ok: false, error: 'Invalid coupon code.' };
  }

  if (legacy !== null) {
    const leg = legacy.find((c) => c.code === normalized);
    if (leg?.enabled) {
      coupon = applyLegacyPublicOverrides(coupon, leg);
    }
  }

  const eligibility = validatePromoCouponEligibility(coupon, ctx);
  if (eligibility.ok === false) {
    return { ok: false, error: eligibility.error };
  }

  const customerCheck = validatePromoCouponCustomer(coupon, ctx.customer);
  if (customerCheck.ok === false) {
    return { ok: false, error: customerCheck.error };
  }

  if (coupon.maxUsesPerCustomer != null && ctx.customer?.id) {
    const { count } = await supabase
      .from('promo_coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_id', ctx.customer.id);
    if ((count ?? 0) >= coupon.maxUsesPerCustomer) {
      return { ok: false, error: 'You have already used this coupon the maximum number of times.' };
    }
  }

  return { ok: true, coupon };
}

export async function recordPromoRedemption(
  supabase: SupabaseClient,
  organizationId: string,
  couponId: string,
  customerId: string | null,
  referenceType: string,
  referenceId: string,
): Promise<void> {
  await supabase.from('promo_coupon_redemptions').insert({
    organization_id: organizationId,
    coupon_id: couponId,
    customer_id: customerId,
    reference_type: referenceType,
    reference_id: referenceId,
  });
  const { data } = await supabase
    .from('promo_coupons')
    .select('uses_count')
    .eq('id', couponId)
    .single();
  const next = Number(data?.uses_count ?? 0) + 1;
  await supabase
    .from('promo_coupons')
    .update({ uses_count: next, updated_at: new Date().toISOString() })
    .eq('id', couponId);
}
