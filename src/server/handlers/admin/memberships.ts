/**
 * POST /api/admin/memberships — membership platform proxy (service role + RBAC + plan gate).
 * GET  /api/admin/memberships?op=fetchSettings|lookupCard&uid=
 */

import { createClient } from '@supabase/supabase-js';
import { ADMIN_SESSION_COOKIE, getEnv, j, parseCookies, verifyAdminSession } from '../../adminApiUtils';
import { resolveOrgContext } from '../../orgContext';
import { assertEntitlement } from '../../lib/entitlements.js';
import { assertWorkspacePermission, resolveWorkspaceAccess } from '../../lib/workspacePermissions';
import { isDenied } from '../../lib/resultGuards';
import {
  assertMembershipFeature,
  resolveMembershipFlags,
} from '../../lib/membershipFeatures';
import type { MembershipFeatureFlagKey } from '../../../types/membership.types.js';
import * as ops from '../../lib/membershipOps';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '',
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const OP_PERMISSIONS: Record<string, string> = {
  fetchSettings: 'memberships.view',
  updateSettings: 'memberships.settings.edit',
  fetchTiers: 'memberships.view',
  upsertTier: 'memberships.tiers.edit',
  deleteTier: 'memberships.tiers.edit',
  fetchRechargeTiers: 'memberships.view',
  upsertRechargeTier: 'memberships.recharge.edit',
  deleteRechargeTier: 'memberships.recharge.edit',
  fetchCoupons: 'memberships.view',
  upsertCoupon: 'memberships.coupons.edit',
  deleteCoupon: 'memberships.coupons.edit',
  fetchCards: 'memberships.cards.manage',
  lookupCard: 'memberships.view',
  assignCard: 'memberships.cards.manage',
  replaceCard: 'memberships.cards.manage',
  addInventoryCard: 'memberships.cards.manage',
  assignTier: 'memberships.customers.edit',
  recharge: 'memberships.recharge.execute',
  redeem: 'memberships.recharge.execute',
  validateMemberCoupon: 'memberships.view',
};

const OP_FEATURES: Partial<Record<string, MembershipFeatureFlagKey>> = {
  lookupCard: 'nfc_cards_enabled',
  assignCard: 'nfc_cards_enabled',
  replaceCard: 'nfc_cards_enabled',
  addInventoryCard: 'physical_cards_inventory_enabled',
  fetchCards: 'physical_cards_inventory_enabled',
  fetchRechargeTiers: 'recharge_tiers_enabled',
  upsertRechargeTier: 'recharge_tiers_enabled',
  deleteRechargeTier: 'recharge_tiers_enabled',
  recharge: 'card_balance_enabled',
  redeem: 'card_balance_payments_enabled',
  fetchCoupons: 'member_coupons_enabled',
  upsertCoupon: 'member_coupons_enabled',
  deleteCoupon: 'member_coupons_enabled',
  upsertTier: 'tier_plans_enabled',
  deleteTier: 'tier_plans_enabled',
};

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

    const planGate = await assertEntitlement(ctx, 'memberships_enabled');
    if (planGate) return planGate;

    const supabase = getSupabase();
    const access = await resolveWorkspaceAccess(supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    const url = new URL(req.url);
    const locationId = url.searchParams.get('location_id');

    const flags = await resolveMembershipFlags(supabase, ctx.organizationId, locationId);

    if (req.method === 'GET') {
      const op = url.searchParams.get('op') || 'fetchSettings';
      const perm = OP_PERMISSIONS[op] ?? 'memberships.view';
      const permGate = assertWorkspacePermission(access, perm);
      if (isDenied(permGate)) return j({ ok: false, error: permGate.error }, 403);

      const featKey = OP_FEATURES[op];
      if (featKey) {
        const featGate = assertMembershipFeature(flags, featKey);
        if (isDenied(featGate)) return j({ ok: false, error: featGate.error }, 403);
      } else if (op !== 'fetchSettings') {
        const modGate = assertMembershipFeature(flags, 'module_enabled');
        if (isDenied(modGate)) return j({ ok: false, error: modGate.error }, 403);
      }

      if (op === 'fetchSettings') {
        const settings = await ops.fetchSettings(supabase, ctx.organizationId, locationId);
        return j({ ok: true, settings, flags }, 200);
      }
      if (op === 'lookupCard') {
        const uid = url.searchParams.get('uid');
        if (!uid) return j({ ok: false, error: 'Missing uid' }, 400);
        const result = await ops.lookupCardByUid(supabase, ctx.organizationId, uid);
        if (!result) return j({ ok: false, error: 'Card not found' }, 404);
        return j({ ok: true, result }, 200);
      }
      if (op === 'fetchTiers') {
        const tiers = await ops.fetchTiers(supabase, ctx.organizationId);
        return j({ ok: true, tiers }, 200);
      }
      if (op === 'fetchRechargeTiers') {
        const rechargeTiers = await ops.fetchRechargeTiers(supabase, ctx.organizationId);
        return j({ ok: true, rechargeTiers }, 200);
      }
      if (op === 'fetchCoupons') {
        const coupons = await ops.fetchCoupons(supabase, ctx.organizationId);
        return j({ ok: true, coupons }, 200);
      }
      if (op === 'fetchCards') {
        const cards = await ops.fetchCards(supabase, ctx.organizationId);
        return j({ ok: true, cards }, 200);
      }
      return j({ ok: false, error: 'Unknown op' }, 400);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const op = String(body.op || '');
      if (!op) return j({ ok: false, error: 'Missing op' }, 400);

      const perm = OP_PERMISSIONS[op] ?? 'memberships.view';
      const permGate = assertWorkspacePermission(access, perm);
      if (isDenied(permGate)) return j({ ok: false, error: permGate.error }, 403);

      const modGate = assertMembershipFeature(flags, 'module_enabled');
      if (isDenied(modGate)) return j({ ok: false, error: modGate.error }, 403);

      const featKey = OP_FEATURES[op];
      if (featKey) {
        const featGate = assertMembershipFeature(flags, featKey);
        if (isDenied(featGate)) return j({ ok: false, error: featGate.error }, 403);
      }

      const args = (body.args ?? {}) as Record<string, unknown>;
      const orgId = ctx.organizationId;
      const adminId = sessionUser.id;

      switch (op) {
        case 'updateSettings': {
          if (args.featureFlags && (args.featureFlags as Record<string, boolean>).module_enabled) {
            const planRecheck = await assertEntitlement(ctx, 'memberships_enabled');
            if (planRecheck) return planRecheck;
          }
          const settings = await ops.updateSettings(supabase, orgId, {
            locationId: args.locationId as string | null | undefined,
            registrationDepositAmount: args.registrationDepositAmount as number | undefined,
            replacementCardFee: args.replacementCardFee as number | undefined,
            depositProductId: args.depositProductId as string | null | undefined,
            replacementCardProductId: args.replacementCardProductId as string | null | undefined,
            featureFlags: args.featureFlags as Record<string, boolean> | undefined,
          });
          return j({ ok: true, settings }, 200);
        }
        case 'upsertTier':
          return j(
            {
              ok: true,
              tier: await ops.upsertTier(supabase, orgId, args as Parameters<typeof ops.upsertTier>[2]),
            },
            200,
          );
        case 'deleteTier':
          await ops.deleteTier(supabase, orgId, String(args.tierId));
          return j({ ok: true }, 200);
        case 'upsertRechargeTier':
          return j(
            {
              ok: true,
              rechargeTier: await ops.upsertRechargeTier(
                supabase,
                orgId,
                args as Parameters<typeof ops.upsertRechargeTier>[2],
              ),
            },
            200,
          );
        case 'deleteRechargeTier':
          await ops.deleteRechargeTier(supabase, orgId, String(args.id));
          return j({ ok: true }, 200);
        case 'upsertCoupon':
          return j(
            {
              ok: true,
              coupon: await ops.upsertCoupon(
                supabase,
                orgId,
                args as Parameters<typeof ops.upsertCoupon>[2],
              ),
            },
            200,
          );
        case 'deleteCoupon':
          await ops.deleteCoupon(supabase, orgId, String(args.id));
          return j({ ok: true }, 200);
        case 'assignCard':
          return j(
            {
              ok: true,
              card: await ops.assignCard(supabase, orgId, {
                uid: String(args.uid),
                customerId: String(args.customerId),
                locationId: args.locationId as string | null | undefined,
              }),
            },
            200,
          );
        case 'replaceCard':
          return j(
            {
              ok: true,
              card: await ops.replaceCard(supabase, orgId, {
                oldCardId: String(args.oldCardId),
                newUid: String(args.newUid),
                customerId: String(args.customerId),
                locationId: args.locationId as string | null | undefined,
              }),
            },
            200,
          );
        case 'addInventoryCard':
          return j(
            {
              ok: true,
              card: await ops.addInventoryCard(
                supabase,
                orgId,
                String(args.uid),
                args.locationId as string | null | undefined,
              ),
            },
            200,
          );
        case 'assignTier':
          await ops.assignTier(supabase, orgId, {
            customerId: String(args.customerId),
            tierId: String(args.tierId),
            membershipStartDate: args.membershipStartDate as string | null | undefined,
            membershipExpiryDate: args.membershipExpiryDate as string | null | undefined,
            membershipDuration: args.membershipDuration as string | null | undefined,
            membershipHoursLeft: args.membershipHoursLeft as number | null | undefined,
          });
          return j({ ok: true }, 200);
        case 'recharge':
          return j(
            {
              ok: true,
              ...(await ops.rechargeCard(supabase, orgId, {
                customerId: String(args.customerId),
                creditAmount: Number(args.creditAmount),
                createdBy: adminId,
                note: args.note as string | undefined,
                referenceType: args.referenceType as string | undefined,
                referenceId: args.referenceId as string | undefined,
              })),
            },
            200,
          );
        case 'redeem':
          return j(
            {
              ok: true,
              ...(await ops.redeemCardBalance(supabase, orgId, {
                customerId: String(args.customerId),
                amount: Number(args.amount),
                createdBy: adminId,
                referenceType: args.referenceType as string | undefined,
                referenceId: args.referenceId as string | undefined,
              })),
            },
            200,
          );
        case 'validateMemberCoupon': {
          const coupon = await ops.fetchMemberCouponByCode(supabase, orgId, String(args.code));
          if (!coupon) return j({ ok: false, error: 'Invalid coupon' }, 400);
          const validation = await ops.validateMemberForCoupon(
            supabase,
            orgId,
            String(args.phone),
            coupon,
          );
          if (!validation.ok) return j({ ok: false, error: validation.error }, 400);
          return j({ ok: true, coupon, customerId: validation.customerId }, 200);
        }
        default:
          return j({ ok: false, error: 'Unknown op' }, 400);
      }
    }

    return j({ ok: false, error: 'Method not allowed' }, 405);
  } catch (err: unknown) {
    console.error('Memberships API error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
