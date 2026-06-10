import { supabase } from '@/integrations/supabase/client';
import type {
  ActiveShift,
  LeaveBalance,
  PendingLeave,
  StaffAttendance,
  StaffAuditEntry,
  StaffHoliday,
  StaffProfile,
  StaffScope,
  StaffStats,
} from '@/types/staff.types';
import { staffProfileId, staffProfileIds } from './staffMappers';

export class StaffScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaffScopeError';
  }
}

function assertScope(scope: StaffScope): void {
  if (!scope.organizationId) {
    throw new StaffScopeError('Workspace not resolved.');
  }
}

export async function fetchStaffProfiles(scope: StaffScope): Promise<StaffProfile[]> {
  assertScope(scope);

  if (scope.scope === 'location' && !scope.locationId) return [];
  if (scope.scope === 'all' && scope.locationIds.length === 0) return [];

  let q = supabase
    .from('staff_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (scope.scope === 'location' && scope.locationId) {
    q = q.eq('location_id', scope.locationId);
  } else if (scope.locationIds.length > 0) {
    q = q.in('location_id', scope.locationIds);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as StaffProfile[];
}

export async function fetchStaffStats(
  scope: StaffScope,
  profiles: StaffProfile[],
): Promise<StaffStats> {
  assertScope(scope);
  const profileIds = staffProfileIds(profiles);
  const inactiveStaff = profiles.filter((p) => !p.is_active).length;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  let activeNow = 0;
  let pendingLeaves = 0;
  let monthlyPayroll = 0;

  if (profileIds.length > 0) {
    const [shiftsRes, leavesRes, payrollRes] = await Promise.all([
      supabase.from('today_active_shifts').select('*').in('staff_id', profileIds),
      supabase.from('pending_leaves_view').select('*').in('staff_id', profileIds),
      supabase
        .from('staff_payslip_view')
        .select('net_salary')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .in('staff_id', profileIds),
    ]);

    activeNow = shiftsRes.data?.length ?? 0;
    pendingLeaves = leavesRes.data?.length ?? 0;
    monthlyPayroll = (payrollRes.data ?? []).reduce(
      (sum, row) => sum + (Number(row.net_salary) || 0),
      0,
    );
  }

  return {
    totalStaff: profiles.length,
    activeStaff: profiles.length - inactiveStaff,
    inactiveStaff,
    activeNow,
    pendingLeaves,
    pendingRequests: pendingLeaves,
    monthlyPayroll,
  };
}

export async function fetchActiveShifts(profileIds: string[]): Promise<ActiveShift[]> {
  if (!profileIds.length) return [];
  const { data, error } = await supabase
    .from('today_active_shifts')
    .select('*')
    .in('staff_id', profileIds);
  if (error) throw error;
  return (data ?? []) as ActiveShift[];
}

export async function fetchPendingLeaves(profileIds: string[]): Promise<PendingLeave[]> {
  if (!profileIds.length) return [];
  const { data, error } = await supabase
    .from('pending_leaves_view')
    .select('*')
    .in('staff_id', profileIds);
  if (error) throw error;
  return (data ?? []) as PendingLeave[];
}

export async function fetchAttendanceForMonth(
  profileIds: string[],
  month: number,
  year: number,
): Promise<StaffAttendance[]> {
  if (!profileIds.length) return [];
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const { data, error } = await supabase
    .from('staff_attendance')
    .select('*')
    .in('staff_id', profileIds)
    .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('date', `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StaffAttendance[];
}

export async function assertStaffInScope(
  staffId: string,
  scope: StaffScope,
): Promise<StaffProfile> {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', staffId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new StaffScopeError('Staff member not found.');
  const profile = data as StaffProfile;
  if (profile.organization_id && profile.organization_id !== scope.organizationId) {
    throw new StaffScopeError('Staff member is not in this workspace.');
  }
  if (
    scope.scope === 'location' &&
    scope.locationId &&
    profile.location_id !== scope.locationId
  ) {
    throw new StaffScopeError('Staff member is not in this branch.');
  }
  return profile;
}

export async function checkActiveShift(staffId: string): Promise<boolean> {
  const { data } = await supabase
    .from('today_active_shifts')
    .select('id')
    .eq('staff_id', staffId)
    .maybeSingle();
  return Boolean(data);
}

export async function deactivateStaff(
  staffId: string,
  scope: StaffScope,
  force = false,
): Promise<void> {
  await assertStaffInScope(staffId, scope);
  if (!force) {
    const clockedIn = await checkActiveShift(staffId);
    if (clockedIn) {
      throw new StaffScopeError(
        'Staff member is currently clocked in. Clock them out or use force deactivate.',
      );
    }
  }
  const { error } = await supabase
    .from('staff_profiles')
    .update({ is_active: false })
    .eq('user_id', staffId);
  if (error) throw error;
}

export async function activateStaff(staffId: string, scope: StaffScope): Promise<void> {
  await assertStaffInScope(staffId, scope);
  const { error } = await supabase
    .from('staff_profiles')
    .update({ is_active: true })
    .eq('user_id', staffId);
  if (error) throw error;
}

export async function deleteStaffProfile(staffId: string, scope: StaffScope): Promise<void> {
  await assertStaffInScope(staffId, scope);
  const { count } = await supabase
    .from('staff_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', staffId);
  if ((count ?? 0) > 0) {
    throw new StaffScopeError(
      'Cannot delete staff with attendance history. Deactivate instead.',
    );
  }
  const { error } = await supabase.from('staff_profiles').delete().eq('user_id', staffId);
  if (error) throw error;
}

export async function fetchLeaveBalances(
  staffId: string,
  year: number,
): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from('staff_leave_balances')
    .select('leave_type, allocated, used, remaining')
    .eq('staff_id', staffId)
    .eq('year', year);
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data ?? []) as LeaveBalance[];
}

export async function fetchHolidays(scope: StaffScope, year: number): Promise<StaffHoliday[]> {
  assertScope(scope);
  let q = supabase
    .from('staff_holidays')
    .select('*')
    .eq('organization_id', scope.organizationId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date');
  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  const rows = (data ?? []) as StaffHoliday[];
  if (scope.scope === 'location' && scope.locationId) {
    return rows.filter((h) => !h.location_id || h.location_id === scope.locationId);
  }
  return rows;
}

export async function fetchAuditLog(
  scope: StaffScope,
  limit = 50,
): Promise<StaffAuditEntry[]> {
  assertScope(scope);
  let q = supabase
    .from('staff_hr_audit_log')
    .select('*')
    .eq('organization_id', scope.organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (scope.scope === 'location' && scope.locationId) {
    q = q.or(`location_id.is.null,location_id.eq.${scope.locationId}`);
  }
  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data ?? []) as StaffAuditEntry[];
}

export { staffProfileId, staffProfileIds };
