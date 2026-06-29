/**
 * GET/POST /api/admin/promo-coupons
 */

import { createClient } from '@supabase/supabase-js';
import { ADMIN_SESSION_COOKIE, getEnv, j, parseCookies, verifyAdminSession } from '../../adminApiUtils';
import { resolveOrgContext } from '../../orgContext';
import { assertWorkspacePermission, resolveWorkspaceAccess } from '../../lib/workspacePermissions';
import { isDenied } from '../../lib/resultGuards';
import * as ops from '../../lib/promoCouponOps';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '',
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default async function handler(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get('cookie'));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: 'Unauthorized' }, 401);

    const ctx = await resolveOrgContext(req);
    if ('code' in ctx) {
      return j({ ok: false, error: ctx.message || 'Could not resolve workspace.' }, ctx.status);
    }

    const supabase = getSupabase();
    const access = await resolveWorkspaceAccess(supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    const url = new URL(req.url);
    const locationId = url.searchParams.get('location_id');

    if (req.method === 'GET') {
      const permGate = assertWorkspacePermission(access, 'coupons.manage');
      if (isDenied(permGate)) {
        const fallback = assertWorkspacePermission(access, 'bookings.coupons_manage');
        if (isDenied(fallback)) return j({ ok: false, error: permGate.error }, 403);
      }
      const coupons = await ops.fetchPromoCoupons(supabase, ctx.organizationId, locationId);
      return j({ ok: true, coupons }, 200);
    }

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const op = String(body.op || 'upsert');
      const permGate = assertWorkspacePermission(access, 'coupons.manage');
      if (isDenied(permGate)) {
        const fallback = assertWorkspacePermission(access, 'bookings.coupons_manage');
        if (isDenied(fallback)) return j({ ok: false, error: permGate.error }, 403);
      }

      if (op === 'delete') {
        await ops.deletePromoCoupon(supabase, ctx.organizationId, String(body.id));
        return j({ ok: true }, 200);
      }

      const coupon = await ops.upsertPromoCoupon(
        supabase,
        ctx.organizationId,
        body.coupon as Parameters<typeof ops.upsertPromoCoupon>[2],
      );
      return j({ ok: true, coupon }, 200);
    }

    return j({ ok: false, error: 'Method not allowed' }, 405);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
