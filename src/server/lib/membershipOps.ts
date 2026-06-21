import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MembershipCard,
  MembershipCoupon,
  MembershipRechargeTier,
  MembershipSettings,
  MembershipTier,
} from '../../types/membership.types';
import { normalizeNfcUid } from '../../utils/nfcUid.utils';
import { mapTierRow } from './membershipFeatures';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'tier';
}

function mapSettings(row: Record<string, unknown>): MembershipSettings {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    locationId: row.location_id ? String(row.location_id) : null,
    registrationDepositAmount: Number(row.registration_deposit_amount ?? 0),
    replacementCardFee: Number(row.replacement_card_fee ?? 0),
    depositProductId: row.deposit_product_id ? String(row.deposit_product_id) : null,
    replacementCardProductId: row.replacement_card_product_id
      ? String(row.replacement_card_product_id)
      : null,
    featureFlags: (row.feature_flags as MembershipSettings['featureFlags']) ?? {},
  };
}

function mapCard(row: Record<string, unknown>): MembershipCard {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    locationId: row.location_id ? String(row.location_id) : null,
    uid: String(row.uid),
    status: row.status as MembershipCard['status'],
    customerId: row.customer_id ? String(row.customer_id) : null,
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    retiredAt: row.retired_at ? String(row.retired_at) : null,
  };
}

function mapRechargeTier(row: Record<string, unknown>): MembershipRechargeTier {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    membershipTierId: row.membership_tier_id ? String(row.membership_tier_id) : null,
    payAmount: Number(row.pay_amount),
    creditAmount: Number(row.credit_amount),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapCoupon(row: Record<string, unknown>): MembershipCoupon {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    code: String(row.code).toUpperCase(),
    description: String(row.description ?? ''),
    discountType: row.discount_type as MembershipCoupon['discountType'],
    discountValue: Number(row.discount_value),
    enabled: Boolean(row.enabled),
    memberOnly: Boolean(row.member_only),
    membershipTierId: row.membership_tier_id ? String(row.membership_tier_id) : null,
    allowsVenuePayment: Boolean(row.allows_venue_payment),
    validFrom: row.valid_from ? String(row.valid_from) : null,
    validUntil: row.valid_until ? String(row.valid_until) : null,
    maxUses: row.max_uses != null ? Number(row.max_uses) : null,
    usesCount: Number(row.uses_count ?? 0),
  };
}

export async function fetchSettings(
  supabase: SupabaseClient,
  organizationId: string,
  locationId?: string | null,
) {
  const { data: rows } = await supabase
    .from('membership_settings')
    .select('*')
    .eq('organization_id', organizationId);

  const workspace = (rows ?? []).find((r) => r.location_id == null);
  const branch =
    locationId != null ? (rows ?? []).find((r) => r.location_id === locationId) : null;

  return {
    workspace: workspace ? mapSettings(workspace as Record<string, unknown>) : null,
    branch: branch ? mapSettings(branch as Record<string, unknown>) : null,
  };
}

export async function updateSettings(
  supabase: SupabaseClient,
  organizationId: string,
  patch: Partial<{
    locationId: string | null;
    registrationDepositAmount: number;
    replacementCardFee: number;
    depositProductId: string | null;
    replacementCardProductId: string | null;
    featureFlags: Record<string, boolean>;
  }>,
) {
  const locationId = patch.locationId ?? null;
  let existingQuery = supabase
    .from('membership_settings')
    .select('*')
    .eq('organization_id', organizationId);
  existingQuery =
    locationId === null
      ? existingQuery.is('location_id', null)
      : existingQuery.eq('location_id', locationId);
  const { data: existing } = await existingQuery.maybeSingle();

  const mergedFlags = {
    ...((existing?.feature_flags as Record<string, boolean>) ?? {}),
    ...(patch.featureFlags ?? {}),
  };

  const row = {
    organization_id: organizationId,
    location_id: locationId,
    registration_deposit_amount: patch.registrationDepositAmount ?? existing?.registration_deposit_amount ?? 0,
    replacement_card_fee: patch.replacementCardFee ?? existing?.replacement_card_fee ?? 0,
    deposit_product_id: patch.depositProductId !== undefined ? patch.depositProductId : existing?.deposit_product_id,
    replacement_card_product_id:
      patch.replacementCardProductId !== undefined
        ? patch.replacementCardProductId
        : existing?.replacement_card_product_id,
    feature_flags: mergedFlags,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('membership_settings')
    .upsert(row, { onConflict: 'organization_id,location_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapSettings(data as Record<string, unknown>);
}

export async function fetchTiers(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapTierRow(r as Record<string, unknown>));
}

export async function upsertTier(
  supabase: SupabaseClient,
  organizationId: string,
  input: Partial<MembershipTier> & { name: string },
) {
  const slug = input.slug || slugify(input.name);
  const row = {
    organization_id: organizationId,
    location_id: input.locationId ?? null,
    name: input.name,
    slug,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    playtime_discount_pct: input.playtimeDiscountPct ?? 0,
    fnb_discount_pct: input.fnbDiscountPct ?? 0,
    card_payment_fnb_enabled: input.cardPaymentFnbEnabled ?? false,
    booking_pay_at_venue_enabled: input.bookingPayAtVenueEnabled ?? false,
    min_recharge_amount: input.minRechargeAmount ?? null,
    max_card_balance: input.maxCardBalance ?? null,
    retail_price: input.retailPrice ?? 0,
    wallet_credit_on_purchase: input.walletCreditOnPurchase ?? 0,
    default_duration: input.defaultDuration ?? 'monthly',
    default_membership_hours: input.defaultMembershipHours ?? null,
    description: input.description ?? '',
    tagline: input.tagline ?? '',
    accent_color: input.accentColor ?? 'violet',
    compare_at_price: input.compareAtPrice ?? null,
    updated_at: new Date().toISOString(),
  };

  let tier: MembershipTier;

  if (input.id) {
    const { data, error } = await supabase
      .from('membership_tiers')
      .update(row)
      .eq('id', input.id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    tier = mapTierRow(data as Record<string, unknown>);
  } else {
    const { data, error } = await supabase
      .from('membership_tiers')
      .insert(row)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    tier = mapTierRow(data as Record<string, unknown>);
  }

  return syncTierProduct(supabase, organizationId, tier);
}

async function syncTierProduct(
  supabase: SupabaseClient,
  organizationId: string,
  tier: MembershipTier,
): Promise<MembershipTier> {
  if (!tier.isActive) return tier;

  let locationId = tier.locationId ?? null;
  if (!locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    locationId = loc?.id ? String(loc.id) : null;
  }
  if (!locationId) {
    throw new Error('No branch location found — cannot sync membership product to POS catalog.');
  }

  const now = new Date().toISOString();
  const retail = tier.retailPrice ?? 0;
  const compareAt = tier.compareAtPrice ?? null;
  const productPayload: Record<string, unknown> = {
    organization_id: organizationId,
    location_id: locationId,
    name: tier.name,
    category: 'membership',
    price: retail,
    stock: 999,
    membership_tier_id: tier.id,
    duration: tier.defaultDuration ?? 'monthly',
    membership_hours: tier.defaultMembershipHours ?? null,
  };
  if (compareAt != null && compareAt > retail) {
    productPayload.original_price = compareAt;
    productPayload.offer_price = retail;
  } else {
    productPayload.original_price = null;
    productPayload.offer_price = null;
  }

  if (tier.productId) {
    const { error } = await supabase
      .from('products')
      .update(productPayload)
      .eq('id', tier.productId)
      .eq('organization_id', organizationId);
    if (error) throw new Error(error.message);
    return tier;
  }

  const { data: product, error: insertErr } = await supabase
    .from('products')
    .insert({ ...productPayload, created_at: now })
    .select('id')
    .single();
  if (insertErr) throw new Error(insertErr.message);

  const productId = String(product.id);
  const { data: updated, error: linkErr } = await supabase
    .from('membership_tiers')
    .update({ product_id: productId, updated_at: now })
    .eq('id', tier.id)
    .eq('organization_id', organizationId)
    .select('*')
    .single();
  if (linkErr) throw new Error(linkErr.message);
  return mapTierRow(updated as Record<string, unknown>);
}

export async function deleteTier(supabase: SupabaseClient, organizationId: string, tierId: string) {
  const { error } = await supabase
    .from('membership_tiers')
    .delete()
    .eq('id', tierId)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

export async function fetchRechargeTiers(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('membership_recharge_tiers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRechargeTier(r as Record<string, unknown>));
}

export async function upsertRechargeTier(
  supabase: SupabaseClient,
  organizationId: string,
  input: Partial<MembershipRechargeTier> & { payAmount: number; creditAmount: number },
) {
  const row = {
    organization_id: organizationId,
    membership_tier_id: input.membershipTierId ?? null,
    pay_amount: input.payAmount,
    credit_amount: input.creditAmount,
    is_active: input.isActive ?? true,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('membership_recharge_tiers')
      .update(row)
      .eq('id', input.id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapRechargeTier(data as Record<string, unknown>);
  }

  const { data, error } = await supabase.from('membership_recharge_tiers').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return mapRechargeTier(data as Record<string, unknown>);
}

export async function deleteRechargeTier(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
) {
  const { error } = await supabase
    .from('membership_recharge_tiers')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

export async function fetchCoupons(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('membership_coupons')
    .select('*')
    .eq('organization_id', organizationId)
    .order('code', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapCoupon(r as Record<string, unknown>));
}

export async function upsertCoupon(
  supabase: SupabaseClient,
  organizationId: string,
  input: Partial<MembershipCoupon> & { code: string },
) {
  const row = {
    organization_id: organizationId,
    code: input.code.toUpperCase().trim(),
    description: input.description ?? '',
    discount_type: input.discountType ?? 'percentage',
    discount_value: input.discountValue ?? 0,
    enabled: input.enabled ?? true,
    member_only: true,
    membership_tier_id: input.membershipTierId ?? null,
    allows_venue_payment: input.allowsVenuePayment ?? true,
    valid_from: input.validFrom ?? null,
    valid_until: input.validUntil ?? null,
    max_uses: input.maxUses ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('membership_coupons')
      .update(row)
      .eq('id', input.id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapCoupon(data as Record<string, unknown>);
  }

  const { data, error } = await supabase.from('membership_coupons').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return mapCoupon(data as Record<string, unknown>);
}

export async function deleteCoupon(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('membership_coupons')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function displayCustomerId(row: Record<string, unknown>): string | null {
  const custom = row.custom_id != null ? String(row.custom_id).trim() : '';
  if (custom) return custom;
  const legacy = row.customer_id != null ? String(row.customer_id).trim() : '';
  if (legacy && !UUID_RE.test(legacy)) return legacy;
  return null;
}

export async function fetchCards(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('membership_cards')
    .select(
      `
      *,
      customers:customer_id (
        id,
        name,
        phone,
        custom_id,
        customer_id
      )
    `,
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const card = mapCard(row as Record<string, unknown>);
    const cust = (row as { customers?: Record<string, unknown> | null }).customers;
    const displayId = cust ? displayCustomerId(cust) : null;
    return {
      ...card,
      customerName: cust?.name ? String(cust.name) : null,
      customerDisplayId: displayId,
      customerPhone: cust?.phone ? String(cust.phone) : null,
    };
  });
}

export async function lookupCardByUid(
  supabase: SupabaseClient,
  organizationId: string,
  uid: string,
) {
  const normalized = normalizeNfcUid(uid);
  const { data: card, error } = await supabase
    .from('membership_cards')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('uid', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!card) return null;

  const mapped = mapCard(card as Record<string, unknown>);
  if (!mapped.customerId) {
    return { card: mapped, customer: null, tier: null };
  }

  return buildMemberLookupForCustomerId(supabase, organizationId, mapped.customerId, mapped);
}

async function buildMemberLookupForCustomerId(
  supabase: SupabaseClient,
  organizationId: string,
  customerUuid: string,
  card: MembershipCard | null,
) {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerUuid)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!customer) return { card, customer: null, tier: null };

  let tier = null;
  if (customer.membership_tier_id) {
    const { data: tierRow } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', customer.membership_tier_id)
      .maybeSingle();
    if (tierRow) tier = mapTierRow(tierRow as Record<string, unknown>);
  }

  let linkedCard = card;
  if (!linkedCard && customer.active_card_id) {
    const { data: cardRow } = await supabase
      .from('membership_cards')
      .select('*')
      .eq('id', customer.active_card_id)
      .maybeSingle();
    if (cardRow) linkedCard = mapCard(cardRow as Record<string, unknown>);
  }

  const row = customer as Record<string, unknown>;
  return {
    card: linkedCard,
    customer: {
      id: String(customer.id),
      customerId: displayCustomerId(row),
      name: String(customer.name),
      phone: String(customer.phone),
      email: customer.email ? String(customer.email) : null,
      membershipTierId: customer.membership_tier_id ? String(customer.membership_tier_id) : null,
      cardBalance: Number(customer.card_balance ?? 0),
      membershipExpiryDate: customer.membership_expiry_date
        ? String(customer.membership_expiry_date)
        : null,
      membershipHoursLeft: customer.membership_hours_left ?? null,
    },
    tier,
  };
}

/** Find member by Customer ID (custom_id), phone, name, or internal UUID. */
export async function lookupMemberByRef(
  supabase: SupabaseClient,
  organizationId: string,
  locationId: string | null | undefined,
  ref: string,
) {
  const term = ref.trim();
  if (!term.length) return null;

  const baseQuery = () => {
    let q = supabase.from('customers').select('*').eq('organization_id', organizationId);
    if (locationId) q = q.eq('location_id', locationId);
    return q;
  };

  const tryOne = async (
    build: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>,
  ) => {
    const { data, error } = await build(baseQuery()).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Record<string, unknown> | null;
  };

  let row: Record<string, unknown> | null = null;

  if (UUID_RE.test(term)) {
    row = await tryOne((q) => q.eq('id', term));
  }
  if (!row) row = await tryOne((q) => q.ilike('custom_id', term));
  if (!row) row = await tryOne((q) => q.ilike('customer_id', term));
  if (!row) {
    const phoneDigits = term.replace(/\D/g, '');
    if (phoneDigits.length >= 4) {
      row = await tryOne((q) => q.ilike('phone', `%${phoneDigits}%`));
    }
  }
  if (!row) row = await tryOne((q) => q.ilike('name', `%${term}%`));

  if (!row) return null;

  return buildMemberLookupForCustomerId(supabase, organizationId, String(row.id), null);
}

export async function assignCard(
  supabase: SupabaseClient,
  organizationId: string,
  args: { uid: string; customerId: string; locationId?: string | null },
) {
  const normalized = normalizeNfcUid(args.uid);
  const now = new Date().toISOString();

  await supabase
    .from('membership_cards')
    .update({ status: 'retired', retired_at: now, updated_at: now })
    .eq('organization_id', organizationId)
    .eq('customer_id', args.customerId)
    .eq('status', 'assigned');

  const { data: card, error: cardErr } = await supabase
    .from('membership_cards')
    .upsert(
      {
        organization_id: organizationId,
        uid: normalized,
        location_id: args.locationId ?? null,
        status: 'assigned',
        customer_id: args.customerId,
        assigned_at: now,
        updated_at: now,
      },
      { onConflict: 'organization_id,uid' },
    )
    .select('*')
    .single();
  if (cardErr) throw new Error(cardErr.message);

  const { error: custErr } = await supabase
    .from('customers')
    .update({ active_card_id: card.id })
    .eq('id', args.customerId)
    .eq('organization_id', organizationId);
  if (custErr) throw new Error(custErr.message);

  return mapCard(card as Record<string, unknown>);
}

export async function assignTier(
  supabase: SupabaseClient,
  organizationId: string,
  args: {
    customerId: string;
    tierId: string;
    membershipStartDate?: string | null;
    membershipExpiryDate?: string | null;
    membershipDuration?: string | null;
    membershipHoursLeft?: number | null;
  },
) {
  const { error } = await supabase
    .from('customers')
    .update({
      membership_tier_id: args.tierId,
      membership_start_date: args.membershipStartDate ?? new Date().toISOString(),
      membership_expiry_date: args.membershipExpiryDate ?? null,
      membership_duration: args.membershipDuration ?? null,
      membership_hours_left: args.membershipHoursLeft ?? null,
    })
    .eq('id', args.customerId)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

export async function rechargeCard(
  supabase: SupabaseClient,
  organizationId: string,
  args: {
    customerId: string;
    creditAmount: number;
    createdBy?: string | null;
    note?: string;
    referenceType?: string;
    referenceId?: string;
  },
) {
  const { data: customer, error: fetchErr } = await supabase
    .from('customers')
    .select('card_balance')
    .eq('id', args.customerId)
    .eq('organization_id', organizationId)
    .single();
  if (fetchErr || !customer) throw new Error(fetchErr?.message || 'Customer not found');

  const balanceAfter = Number(customer.card_balance ?? 0) + args.creditAmount;

  const { error: updErr } = await supabase
    .from('customers')
    .update({ card_balance: balanceAfter })
    .eq('id', args.customerId)
    .eq('organization_id', organizationId);
  if (updErr) throw new Error(updErr.message);

  const { error: ledErr } = await supabase.from('membership_ledger').insert({
    organization_id: organizationId,
    customer_id: args.customerId,
    type: 'recharge',
    amount: args.creditAmount,
    balance_after: balanceAfter,
    reference_type: args.referenceType ?? null,
    reference_id: args.referenceId ?? null,
    created_by: args.createdBy ?? null,
    note: args.note ?? null,
  });
  if (ledErr) throw new Error(ledErr.message);

  return { balanceAfter };
}

export async function redeemCardBalance(
  supabase: SupabaseClient,
  organizationId: string,
  args: {
    customerId: string;
    amount: number;
    createdBy?: string | null;
    referenceType?: string;
    referenceId?: string;
  },
) {
  const { data: customer, error: fetchErr } = await supabase
    .from('customers')
    .select('card_balance, membership_tier_id')
    .eq('id', args.customerId)
    .eq('organization_id', organizationId)
    .single();
  if (fetchErr || !customer) throw new Error(fetchErr?.message || 'Customer not found');
  if (!customer.membership_tier_id) throw new Error('Customer is not a member');

  const current = Number(customer.card_balance ?? 0);
  if (current < args.amount) throw new Error('Insufficient card balance');

  const balanceAfter = current - args.amount;

  const { error: updErr } = await supabase
    .from('customers')
    .update({ card_balance: balanceAfter })
    .eq('id', args.customerId)
    .eq('organization_id', organizationId);
  if (updErr) throw new Error(updErr.message);

  const { error: ledErr } = await supabase.from('membership_ledger').insert({
    organization_id: organizationId,
    customer_id: args.customerId,
    type: 'redemption',
    amount: -args.amount,
    balance_after: balanceAfter,
    reference_type: args.referenceType ?? 'bill',
    reference_id: args.referenceId ?? null,
    created_by: args.createdBy ?? null,
  });
  if (ledErr) throw new Error(ledErr.message);

  return { balanceAfter };
}

export async function replaceCard(
  supabase: SupabaseClient,
  organizationId: string,
  args: { oldCardId: string; newUid: string; customerId: string; locationId?: string | null },
) {
  const now = new Date().toISOString();
  await supabase
    .from('membership_cards')
    .update({ status: 'lost', retired_at: now, updated_at: now })
    .eq('id', args.oldCardId)
    .eq('organization_id', organizationId);

  return assignCard(supabase, organizationId, {
    uid: args.newUid,
    customerId: args.customerId,
    locationId: args.locationId,
  });
}

export async function addInventoryCard(
  supabase: SupabaseClient,
  organizationId: string,
  uid: string,
  locationId?: string | null,
  customerId?: string | null,
) {
  if (!customerId?.trim()) {
    throw new Error('A member (customerId) is required — cards cannot be created without a customer link.');
  }
  return assignCard(supabase, organizationId, {
    uid,
    customerId: customerId.trim(),
    locationId,
  });
}

export async function fetchMemberCouponByCode(
  supabase: SupabaseClient,
  organizationId: string,
  code: string,
) {
  const { data, error } = await supabase
    .from('membership_coupons')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('code', code.toUpperCase().trim())
    .eq('enabled', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapCoupon(data as Record<string, unknown>) : null;
}

export async function validateMemberForCoupon(
  supabase: SupabaseClient,
  organizationId: string,
  phone: string,
  coupon: MembershipCoupon,
) {
  const normalized = phone.replace(/\D/g, '');
  const { data: customer } = await supabase
    .from('customers')
    .select('id, membership_tier_id, membership_expiry_date')
    .eq('organization_id', organizationId)
    .or(`phone.eq.${phone},phone.ilike.%${normalized.slice(-10)}%`)
    .limit(1)
    .maybeSingle();

  if (!customer?.membership_tier_id) return { ok: false as const, error: 'Not an active member' };
  if (coupon.membershipTierId && coupon.membershipTierId !== customer.membership_tier_id) {
    return { ok: false as const, error: 'Coupon not valid for this membership tier' };
  }
  if (customer.membership_expiry_date) {
    const exp = new Date(customer.membership_expiry_date);
    if (exp <= new Date()) return { ok: false as const, error: 'Membership expired' };
  }
  return { ok: true as const, customerId: customer.id };
}
