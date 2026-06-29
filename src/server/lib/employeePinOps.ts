import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyPortalPin } from './pinHash.js';
import {
  buildActivitySummary,
  categoryForAction,
  type StaffActivityCategory,
  type StaffActivityContext,
} from '../constants/staffActivityLabels.js';
import { supabaseServiceClient } from '../supabaseServer.js';

export type StaffHrSettings = {
  organizationId: string;
  payrollPayoutThreshold: number;
  breakMaxMinutes: number;
  employeePinProtectionEnabled: boolean;
  updatedAt?: string;
};

export async function fetchHrSettings(organizationId: string): Promise<StaffHrSettings> {
  const supabase = supabaseServiceClient('staff-hr-settings');
  const { data, error } = await supabase
    .from('staff_hr_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error && error.code !== '42P01') throw new Error(error.message);

  if (!data) {
    return {
      organizationId,
      payrollPayoutThreshold: 15000,
      breakMaxMinutes: 60,
      employeePinProtectionEnabled: false,
    };
  }

  return {
    organizationId,
    payrollPayoutThreshold: Number(data.payroll_payout_threshold ?? 15000),
    breakMaxMinutes: Number(data.break_max_minutes ?? 60),
    employeePinProtectionEnabled: Boolean(data.employee_pin_protection_enabled),
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function updateHrSettings(
  organizationId: string,
  patch: Partial<Pick<StaffHrSettings, 'employeePinProtectionEnabled' | 'payrollPayoutThreshold' | 'breakMaxMinutes'>>,
): Promise<StaffHrSettings> {
  const supabase = supabaseServiceClient('staff-hr-settings');
  const row: Record<string, unknown> = {
    organization_id: organizationId,
    updated_at: new Date().toISOString(),
  };
  if (patch.employeePinProtectionEnabled !== undefined) {
    row.employee_pin_protection_enabled = patch.employeePinProtectionEnabled;
  }
  if (patch.payrollPayoutThreshold !== undefined) {
    row.payroll_payout_threshold = patch.payrollPayoutThreshold;
  }
  if (patch.breakMaxMinutes !== undefined) {
    row.break_max_minutes = patch.breakMaxMinutes;
  }

  const { data, error } = await supabase
    .from('staff_hr_settings')
    .upsert(row, { onConflict: 'organization_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  return {
    organizationId,
    payrollPayoutThreshold: Number(data.payroll_payout_threshold ?? 15000),
    breakMaxMinutes: Number(data.break_max_minutes ?? 60),
    employeePinProtectionEnabled: Boolean(data.employee_pin_protection_enabled),
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function isPinProtectionEnabled(organizationId: string): Promise<boolean> {
  const settings = await fetchHrSettings(organizationId);
  return settings.employeePinProtectionEnabled;
}

export async function resolveStaffByAdminUserId(
  supabase: SupabaseClient,
  adminUserId: string,
) {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('user_id, full_name, username, portal_pin, organization_id, location_id, is_active')
    .eq('admin_user_id', adminUserId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function assertStaffClockedIn(
  supabase: SupabaseClient,
  staffId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('staff_attendance')
    .select('id, clock_in, clock_out')
    .eq('staff_id', staffId)
    .is('clock_out', null)
    .not('clock_in', 'is', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { ok: false, error: 'You must clock in on My Portal before this action.' };
  }
  return { ok: true };
}

function staffDisplayName(row: { full_name?: string | null; username?: string | null }): string {
  const full = String(row.full_name ?? '').trim();
  if (full) return full;
  return String(row.username ?? 'Staff member');
}

export async function logStaffActivity(entry: {
  organizationId: string;
  locationId?: string | null;
  actorStaffId?: string | null;
  actorAdminUserId?: string | null;
  actionKey: string;
  context?: StaffActivityContext;
  outcome?: 'success' | 'failed' | 'bypass';
  entityType?: string;
  entityId?: string | null;
}): Promise<void> {
  const supabase = supabaseServiceClient('staff-activity-log');
  const protectionOn = await isPinProtectionEnabled(entry.organizationId);
  const category = categoryForAction(entry.actionKey) as StaffActivityCategory;
  if (!protectionOn && category !== 'hr') return;

  let staffName = entry.context?.staffName as string | undefined;
  if (!staffName && entry.actorStaffId) {
    const { data } = await supabase
      .from('staff_profiles')
      .select('full_name, username')
      .eq('user_id', entry.actorStaffId)
      .maybeSingle();
    if (data) staffName = staffDisplayName(data);
  }

  const context = { ...entry.context, staffName };
  const summary = buildActivitySummary(entry.actionKey, context, entry.outcome);

  const { error } = await supabase.from('staff_hr_audit_log').insert({
    organization_id: entry.organizationId,
    location_id: entry.locationId ?? null,
    actor_admin_user_id: entry.actorAdminUserId ?? null,
    actor_staff_id: entry.actorStaffId ?? null,
    action: entry.actionKey,
    entity_type: entry.entityType ?? category,
    entity_id: entry.entityId ?? null,
    category,
    summary,
    payload: {
      outcome: entry.outcome ?? 'success',
      context: entry.context ?? {},
    },
  });
  if (error && error.code !== '42P01') {
    console.warn('staff activity log insert failed:', error.message);
  }
}

export async function verifyEmployeePortalPin(
  supabase: SupabaseClient,
  args: {
    organizationId: string;
    locationId?: string | null;
    adminUserId: string;
    pin: string;
    actionKey: string;
    isOwnerBypass: boolean;
  },
): Promise<
  | { ok: true; bypass: true }
  | { ok: true; bypass: false; staffId: string; staffName: string; assertionToken: string }
  | { ok: false; error: string; code?: string }
> {
  const protectionOn = await isPinProtectionEnabled(args.organizationId);
  if (!protectionOn || args.isOwnerBypass) {
    if (protectionOn && args.isOwnerBypass) {
      await logStaffActivity({
        organizationId: args.organizationId,
        locationId: args.locationId,
        actorAdminUserId: args.adminUserId,
        actionKey: 'owner.bypass',
        context: { attemptAction: args.actionKey },
        outcome: 'bypass',
      });
    }
    return { ok: true, bypass: true };
  }

  const profile = await resolveStaffByAdminUserId(supabase, args.adminUserId);
  if (!profile?.portal_pin) {
    return {
      ok: false,
      error: 'No staff profile is linked to your login. Ask your manager to complete setup.',
      code: 'no_profile',
    };
  }

  const staffName = staffDisplayName(profile);
  const attemptLabel = args.actionKey;

  const clocked = await assertStaffClockedIn(supabase, String(profile.user_id));
  if (clocked.ok === false) {
    await logStaffActivity({
      organizationId: args.organizationId,
      locationId: args.locationId,
      actorStaffId: String(profile.user_id),
      actorAdminUserId: args.adminUserId,
      actionKey: 'pin.not_clocked_in',
      context: { staffName, attemptAction: attemptLabel },
      outcome: 'failed',
    });
    return { ok: false, error: clocked.error, code: 'not_clocked_in' };
  }

  const pinOk = await verifyPortalPin(String(profile.portal_pin), args.pin);
  if (!pinOk) {
    await logStaffActivity({
      organizationId: args.organizationId,
      locationId: args.locationId,
      actorStaffId: String(profile.user_id),
      actorAdminUserId: args.adminUserId,
      actionKey: 'pin.failed',
      context: { staffName, attemptAction: attemptLabel },
      outcome: 'failed',
    });
    return { ok: false, error: 'Incorrect employee PIN.', code: 'bad_pin' };
  }

  await logStaffActivity({
    organizationId: args.organizationId,
    locationId: args.locationId,
    actorStaffId: String(profile.user_id),
    actorAdminUserId: args.adminUserId,
    actionKey: 'pin.verified',
    context: { staffName, attemptAction: attemptLabel },
    outcome: 'success',
  });

  const assertionToken = createAssertionToken({
    staffId: String(profile.user_id),
    actionKey: args.actionKey,
    adminUserId: args.adminUserId,
    organizationId: args.organizationId,
  });

  return {
    ok: true,
    bypass: false,
    staffId: String(profile.user_id),
    staffName,
    assertionToken,
  };
}

function getAssertionSecret(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'dev-pin-assertion';
  return key;
}

function createAssertionToken(payload: {
  staffId: string;
  actionKey: string;
  adminUserId: string;
  organizationId: string;
}): string {
  const exp = Date.now() + 60_000;
  const body = JSON.stringify({ ...payload, exp });
  const encoded = btoa(body);
  const sig = simpleHmac(encoded, getAssertionSecret());
  return `${encoded}.${sig}`;
}

function simpleHmac(data: string, secret: string): string {
  let hash = 0;
  const combined = `${secret}:${data}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function verifyAssertionToken(
  token: string,
  actionKey: string,
  adminUserId: string,
): { staffId: string } | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  if (simpleHmac(encoded, getAssertionSecret()) !== sig) return null;
  try {
    const parsed = JSON.parse(atob(encoded)) as {
      staffId: string;
      actionKey: string;
      adminUserId: string;
      exp: number;
    };
    if (parsed.exp < Date.now()) return null;
    if (parsed.actionKey !== actionKey) return null;
    if (parsed.adminUserId !== adminUserId) return null;
    return { staffId: parsed.staffId };
  } catch {
    return null;
  }
}
