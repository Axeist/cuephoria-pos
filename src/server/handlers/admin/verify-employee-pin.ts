/**
 * POST /api/admin/verify-employee-pin
 */

import { createClient } from '@supabase/supabase-js';
import { ADMIN_SESSION_COOKIE, getEnv, j, parseCookies, verifyAdminSession } from '../../adminApiUtils';
import { resolveOrgContext } from '../../orgContext';
import { resolveWorkspaceAccess } from '../../lib/workspacePermissions';
import { isPinProtectionEnabled, verifyEmployeePortalPin } from '../../lib/employeePinOps.js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '',
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function requireSession(req: Request) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const token = cookies[ADMIN_SESSION_COOKIE];
  const sessionUser = token ? await verifyAdminSession(token) : null;
  if (!sessionUser) return { error: j({ ok: false, error: 'Unauthorized' }, 401) as Response };

  const ctx = await resolveOrgContext(req);
  if ('code' in ctx) {
    return {
      error: j(
        { ok: false, error: ctx.message || 'Could not resolve workspace.' },
        ctx.status,
      ) as Response,
    };
  }

  return { sessionUser, ctx };
}

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    try {
      const auth = await requireSession(req);
      if ('error' in auth) return auth.error;

      const enabled = await isPinProtectionEnabled(auth.ctx.organizationId);
      return j({ ok: true, employeePinProtectionEnabled: enabled }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return j({ ok: false, error: message }, 500);
    }
  }

  if (req.method !== 'POST') return j({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const auth = await requireSession(req);
    if ('error' in auth) return auth.error;
    const { sessionUser, ctx } = auth;

    const body = (await req.json().catch(() => ({}))) as {
      pin?: string;
      actionKey?: string;
      locationId?: string;
    };

    const actionKey = String(body.actionKey || '').trim();
    if (!actionKey) return j({ ok: false, error: 'Missing actionKey' }, 400);

    const supabase = getSupabase();
    const access = await resolveWorkspaceAccess(supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    const isOwnerBypass =
      sessionUser.isSuperAdmin || access.role?.slug === 'owner';

    const pin = String(body.pin || '').trim();
    if (!isOwnerBypass && !pin) {
      return j({ ok: false, error: 'PIN is required.' }, 400);
    }

    const result = await verifyEmployeePortalPin(supabase, {
      organizationId: ctx.organizationId,
      locationId: body.locationId ?? null,
      adminUserId: sessionUser.id,
      pin,
      actionKey,
      isOwnerBypass,
    });

    if (result.ok === false) {
      return j({ ok: false, error: result.error, code: result.code }, 400);
    }

    if (result.bypass) {
      return j({ ok: true, bypass: true }, 200);
    }

    return j(
      {
        ok: true,
        bypass: false,
        staffId: result.staffId,
        staffName: result.staffName,
        assertionToken: result.assertionToken,
      },
      200,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
