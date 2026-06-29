import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyPortalPin } from './pinHash.js';

export type StaffPinProfile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  portal_pin: string | null;
  location_id: string | null;
};

export async function fetchActiveStaffPinCandidates(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { locationId?: string | null; clockedInOnly?: boolean },
): Promise<StaffPinProfile[]> {
  let staffIds: string[] | null = null;
  let openRows: Array<{ staff_id: string; location_id: string | null }> = [];

  if (options?.clockedInOnly) {
    const { data: attendance, error: attErr } = await supabase
      .from('staff_attendance')
      .select('staff_id, location_id')
      .eq('organization_id', organizationId)
      .is('clock_out', null)
      .not('clock_in', 'is', null);
    if (attErr) throw new Error(attErr.message);

    openRows = attendance ?? [];
    if (openRows.length === 0) return [];

    staffIds = [...new Set(openRows.map((row) => String(row.staff_id)))];
  }

  let query = supabase
    .from('staff_profiles')
    .select('user_id, full_name, username, portal_pin, location_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .not('portal_pin', 'is', null);

  if (staffIds) {
    query = query.in('user_id', staffIds);
  }

  const { data: profiles, error: profErr } = await query;
  if (profErr) throw new Error(profErr.message);

  const rows = (profiles ?? []) as StaffPinProfile[];
  const locationId = options?.locationId;
  if (!locationId || rows.length === 0 || !options?.clockedInOnly) return rows;

  const clockedHere = new Set(
    openRows
      .filter((row) => String(row.location_id) === locationId)
      .map((row) => String(row.staff_id)),
  );

  const atBranch = rows.filter(
    (row) => clockedHere.has(String(row.user_id)) || String(row.location_id) === locationId,
  );
  return atBranch.length > 0 ? atBranch : rows;
}

export async function matchStaffByPortalPin(
  supabase: SupabaseClient,
  organizationId: string,
  pin: string,
  options?: { locationId?: string | null; clockedInOnly?: boolean },
): Promise<
  | { ok: true; profile: StaffPinProfile }
  | { ok: false; error: string; code: string }
> {
  const candidates = await fetchActiveStaffPinCandidates(supabase, organizationId, options);

  if (options?.clockedInOnly && candidates.length === 0) {
    return {
      ok: false,
      error: 'No staff are clocked in. Clock in on My Portal before this action.',
      code: 'not_clocked_in',
    };
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      error: 'No staff profiles with a portal PIN are set up yet.',
      code: 'no_profiles',
    };
  }

  const matches: StaffPinProfile[] = [];
  for (const profile of candidates) {
    if (await verifyPortalPin(String(profile.portal_pin), pin)) {
      matches.push(profile);
    }
  }

  if (matches.length === 0) {
    return { ok: false, error: 'Incorrect employee PIN.', code: 'bad_pin' };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      error: 'This PIN matches more than one staff member. Ask your manager to set unique PINs.',
      code: 'ambiguous_pin',
    };
  }

  return { ok: true, profile: matches[0] };
}
