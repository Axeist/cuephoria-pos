/**
 * POST /api/tenant/membership-coupon-validate — public member coupon + phone check.
 */

import { createClient } from '@supabase/supabase-js';
import { getEnv, j } from '../../adminApiUtils';
import { resolveEntitlementsForLocation, featureEnabled } from '../../lib/entitlements.js';
import { resolveMembershipFlags } from '../../lib/membershipFeatures.js';
import * as ops from '../../lib/membershipOps.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return j({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const locationId = String(body.location_id || body.locationId || '');
    const phone = String(body.phone || '');
    const code = String(body.code || '');

    if (!locationId || !phone || !code) {
      return j({ ok: false, error: 'Missing location_id, phone, or code' }, 400);
    }

    const supabase = createClient(
      getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '',
      getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || '',
      { auth: { persistSession: false } },
    );

    const { entitlements, organizationId } = await resolveEntitlementsForLocation(supabase, locationId);
    if (!organizationId || !featureEnabled(entitlements, 'memberships_enabled')) {
      return j({ ok: false, error: 'Memberships not available' }, 403);
    }

    const flags = await resolveMembershipFlags(supabase, organizationId, locationId);
    if (!flags.module_enabled || !flags.member_coupons_enabled || !flags.public_member_venue_booking_enabled) {
      return j({ ok: false, error: 'Member venue booking not enabled' }, 403);
    }

    const coupon = await ops.fetchMemberCouponByCode(supabase, organizationId, code);
    if (!coupon || !coupon.allowsVenuePayment) {
      return j({ ok: false, error: 'Invalid member coupon' }, 400);
    }

    const validation = await ops.validateMemberForCoupon(supabase, organizationId, phone, coupon);
    if (!validation.ok) {
      return j({ ok: false, error: validation.error }, 400);
    }

    return j({
      ok: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        allowsVenuePayment: coupon.allowsVenuePayment,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
