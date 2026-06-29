/**
 * POST /api/tenant/promo-coupon-validate
 * GET  /api/tenant/promo-coupon-validate?location_id=&channel=public_booking
 */

import { createClient } from '@supabase/supabase-js';
import { getEnv, j } from '../../adminApiUtils';
import { resolveEntitlementsForLocation } from '../../lib/entitlements.js';
import * as ops from '../../lib/promoCouponOps';
import type { PromoCouponChannel, PromoCouponValidateContext } from '../../../types/promoCoupon.types.js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '',
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function resolveCustomer(
  supabase: ReturnType<typeof getSupabase>,
  organizationId: string,
  phone: string,
) {
  const normalized = phone.replace(/\D/g, '');
  const { data } = await supabase
    .from('customers')
    .select('id, membership_tier_id, active_card_id, card_balance')
    .eq('organization_id', organizationId)
    .or(`phone.eq.${phone},phone.ilike.%${normalized.slice(-10)}`)
    .limit(1)
    .maybeSingle();
  if (!data) {
    return { isNew: true as const };
  }
  return {
    id: String(data.id),
    membershipTierId: data.membership_tier_id ? String(data.membership_tier_id) : null,
    activeCardId: data.active_card_id ? String(data.active_card_id) : null,
    cardBalance: Number(data.card_balance ?? 0),
    isNew: false as const,
  };
}

export default async function handler(req: Request) {
  try {
    const supabase = getSupabase();
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const locationId = url.searchParams.get('location_id') || '';
      const channel = (url.searchParams.get('channel') || 'public_booking') as PromoCouponChannel;
      if (!locationId) return j({ ok: false, error: 'Missing location_id' }, 400);

      const { organizationId } = await resolveEntitlementsForLocation(supabase, locationId);
      if (!organizationId) return j({ ok: false, error: 'Invalid location' }, 400);

      const coupons = await ops.fetchPromoCoupons(supabase, organizationId, locationId);
      const publicCoupons = coupons.filter(
        (c) => c.enabled && c.channels.includes(channel),
      );
      return j({ ok: true, coupons: publicCoupons }, 200);
    }

    if (req.method !== 'POST') {
      return j({ ok: false, error: 'Method not allowed' }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const locationId = String(body.location_id || body.locationId || '');
    const code = String(body.code || '');
    const phone = String(body.phone || '');
    const channel = (body.channel || 'public_booking') as PromoCouponChannel;

    if (!locationId || !code) {
      return j({ ok: false, error: 'Missing location_id or code' }, 400);
    }

    const { organizationId } = await resolveEntitlementsForLocation(supabase, locationId);
    if (!organizationId) return j({ ok: false, error: 'Invalid location' }, 400);

    const customer = phone ? await resolveCustomer(supabase, organizationId, phone) : { isNew: true };

    const slotsRaw = Array.isArray(body.slots) ? body.slots : [];
    const slots = slotsRaw.map((s: { start: string; end?: string }) => ({
      start: new Date(s.start),
      end: s.end ? new Date(s.end) : undefined,
    }));

    const stationsRaw = Array.isArray(body.stations) ? body.stations : [];
    const stations = stationsRaw.map((s: { id: string; type: string; pricingMode?: string }) => ({
      id: String(s.id),
      type: String(s.type),
      pricingMode: s.pricingMode ?? null,
    }));

    const ctx: PromoCouponValidateContext = {
      channel,
      locationId,
      selectedDate: body.selectedDate ? new Date(String(body.selectedDate)) : new Date(),
      slots,
      stations,
      slotCount: Number(body.slotCount ?? slots.length) || 0,
      subtotal: body.subtotal != null ? Number(body.subtotal) : undefined,
      customer,
    };

    const result = await ops.validatePromoCoupon(supabase, organizationId, code, ctx);
    if (result.ok === false) {
      return j({ ok: false, error: result.error }, 400);
    }

    if (channel === 'venue_payment' || result.coupon.allowsVenuePayment) {
      if (!result.coupon.allowsVenuePayment && channel === 'venue_payment') {
        return j({ ok: false, error: 'This coupon cannot be used for pay-at-venue.' }, 400);
      }
    }

    return j({ ok: true, coupon: result.coupon }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
