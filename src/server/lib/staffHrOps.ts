import {
  DEFAULT_SHIFT_END,
  DEFAULT_SHIFT_START,
  isLegacyPlaceholderSchedule,
  mapStoredScheduleRow,
  normalizeShiftTime,
} from "../../utils/staffRoster";
import type {
  ActiveShift,
  LeaveBalance,
  PendingLeave,
  StaffAttendance,
  StaffAuditEntry,
  StaffHoliday,
  StaffLeavePolicy,
  StaffProfile,
  StaffScope,
  StaffStats,
} from "../../types/staff.types";
import { staffProfileId, staffProfileIds } from "../../services/staff/staffMappers";
import { supabaseServiceClient } from "../supabaseServer";

const supabase = supabaseServiceClient("cuetronix-staff-hr");

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

export async function fetchLeavePolicies(scope: StaffScope): Promise<StaffLeavePolicy[]> {
  assertScope(scope);
  const { data, error } = await supabase
    .from('staff_leave_policies')
    .select('*')
    .eq('organization_id', scope.organizationId)
    .order('leave_type');
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  const rows = (data ?? []) as StaffLeavePolicy[];
  if (scope.scope === 'location' && scope.locationId) {
    return rows.filter((p) => !p.location_id || p.location_id === scope.locationId);
  }
  return rows;
}

export async function upsertLeavePolicy(
  scope: StaffScope,
  policy: Omit<StaffLeavePolicy, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): Promise<StaffLeavePolicy> {
  assertScope(scope);
  const payload = {
    ...policy,
    organization_id: scope.organizationId,
    location_id: policy.location_id ?? scope.locationId,
    updated_at: new Date().toISOString(),
  };
  if (policy.id) {
    const { data, error } = await supabase
      .from('staff_leave_policies')
      .update(payload)
      .eq('id', policy.id)
      .select()
      .single();
    if (error) throw error;
    return data as StaffLeavePolicy;
  }
  const { data, error } = await supabase
    .from('staff_leave_policies')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as StaffLeavePolicy;
}

export async function deleteLeavePolicy(id: string, scope: StaffScope): Promise<void> {
  assertScope(scope);
  const { error } = await supabase
    .from('staff_leave_policies')
    .delete()
    .eq('id', id)
    .eq('organization_id', scope.organizationId);
  if (error) throw error;
}

export async function seedLeaveBalancesForStaff(
  staffId: string,
  organizationId: string,
  year: number,
  policies: StaffLeavePolicy[],
): Promise<void> {
  for (const policy of policies) {
    const { error } = await supabase.from('staff_leave_balances').upsert(
      {
        staff_id: staffId,
        organization_id: organizationId,
        year,
        leave_type: policy.leave_type,
        allocated: policy.annual_quota,
        used: 0,
        remaining: policy.annual_quota,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'staff_id,year,leave_type' },
    );
    if (error && error.code !== '42P01') throw error;
  }
}

export async function upsertHoliday(
  scope: StaffScope,
  holiday: Omit<StaffHoliday, 'id'> & { id?: string },
): Promise<StaffHoliday> {
  assertScope(scope);
  const payload = {
    organization_id: scope.organizationId,
    location_id: holiday.location_id ?? scope.locationId,
    date: holiday.date,
    name: holiday.name,
    is_paid: holiday.is_paid,
  };
  if (holiday.id) {
    const { data, error } = await supabase
      .from('staff_holidays')
      .update(payload)
      .eq('id', holiday.id)
      .select()
      .single();
    if (error) throw error;
    return data as StaffHoliday;
  }
  const { data, error } = await supabase.from('staff_holidays').insert(payload).select().single();
  if (error) throw error;
  return data as StaffHoliday;
}

export async function deleteHoliday(id: string, scope: StaffScope): Promise<void> {
  assertScope(scope);
  const { error } = await supabase
    .from('staff_holidays')
    .delete()
    .eq('id', id)
    .eq('organization_id', scope.organizationId);
  if (error) throw error;
}

export async function seedHolidaysIfMissing(
  scope: StaffScope,
  entries: Array<{ date: string; name: string; is_paid: boolean }>,
  existingDates: Set<string>,
): Promise<{ added: number; skipped: number }> {
  assertScope(scope);
  let added = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (existingDates.has(entry.date)) {
      skipped++;
      continue;
    }
    await upsertHoliday(scope, {
      organization_id: scope.organizationId,
      location_id: scope.locationId,
      date: entry.date,
      name: entry.name,
      is_paid: entry.is_paid,
    });
    added++;
  }
  return { added, skipped };
}

/** Sync all 7 days of staff_work_schedules from profile shift times. */
export async function syncRosterFromProfile(
  staffId: string,
  locationId: string,
  shiftStart: string,
  shiftEnd: string,
  options?: { onlyIfMissing?: boolean },
): Promise<number> {
  const start = shiftStart.length === 5 ? `${shiftStart}:00` : shiftStart;
  const end = shiftEnd.length === 5 ? `${shiftEnd}:00` : shiftEnd;

  if (options?.onlyIfMissing) {
    const { count } = await supabase
      .from('staff_work_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staffId);
    if ((count ?? 0) > 0) return 0;
  }

  let written = 0;
  for (let day = 0; day < 7; day++) {
    const payload = {
      staff_id: staffId,
      day_of_week: day,
      shift_start: start,
      shift_end: end,
      is_active: true,
      location_id: locationId,
    };
    const { data: existing } = await supabase
      .from('staff_work_schedules')
      .select('id')
      .eq('staff_id', staffId)
      .eq('day_of_week', day)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('staff_work_schedules').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('staff_work_schedules').insert(payload);
      if (error) throw error;
    }
    written++;
  }
  return written;
}

export async function syncMissingRostersFromProfiles(
  profiles: StaffProfile[],
  locationId: string | null,
): Promise<number> {
  if (!locationId) return 0;
  let total = 0;
  for (const p of profiles.filter((s) => s.is_active && s.shift_start_time && s.shift_end_time)) {
    total += await syncRosterFromProfile(
      p.user_id,
      locationId,
      p.shift_start_time!.substring(0, 5),
      p.shift_end_time!.substring(0, 5),
      { onlyIfMissing: true },
    );
  }
  return total;
}

/** Overwrite all weekly schedule rows from each staff profile shift times. */
export async function forceSyncRostersFromProfiles(
  profiles: StaffProfile[],
  locationId: string | null,
): Promise<number> {
  if (!locationId) return 0;
  let total = 0;
  for (const p of profiles.filter((s) => s.is_active && s.shift_start_time && s.shift_end_time)) {
    total += await syncRosterFromProfile(
      p.user_id,
      locationId,
      p.shift_start_time!.substring(0, 5),
      p.shift_end_time!.substring(0, 5),
    );
  }
  return total;
}

/** Fix rows still on the 11:00–23:00 placeholder when the profile has real shift times. */
export async function syncStalePlaceholderRosters(
  profiles: StaffProfile[],
  locationId: string | null,
): Promise<number> {
  if (!locationId) return 0;
  let total = 0;

  for (const p of profiles.filter((s) => s.is_active && s.shift_start_time && s.shift_end_time)) {
    const profileStart = normalizeShiftTime(p.shift_start_time);
    const profileEnd = normalizeShiftTime(p.shift_end_time, DEFAULT_SHIFT_END);
    if (profileStart === DEFAULT_SHIFT_START && profileEnd === DEFAULT_SHIFT_END) continue;

    const { data } = await supabase
      .from('staff_work_schedules')
      .select('*')
      .eq('staff_id', p.user_id);

    if (!data?.length) continue;

    const rows = data.map((row) => mapStoredScheduleRow(row as Record<string, unknown>));
    if (!isLegacyPlaceholderSchedule(rows)) continue;

    total += await syncRosterFromProfile(
      p.user_id,
      locationId,
      profileStart,
      profileEnd,
    );
  }

  return total;
}

export async function generateMonthlyPayroll(
  staffId: string,
  month: number,
  year: number,
  adminUsername: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_monthly_payroll", {
    p_staff_id: staffId,
    p_month: month,
    p_year: year,
    p_admin_username: adminUsername,
  });
  if (error) throw error;
  return String(data);
}

export async function processLeaveApproval(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc("process_leave_approval", {
    p_leave_id: requestId,
    p_action: action,
  });
  if (error) throw error;
}

export async function processRegularization(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc("process_regularization", {
    p_regularization_id: requestId,
    p_action: action,
  });
  if (error) throw error;
}

export async function processOtRequest(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc("process_ot_request", {
    p_ot_request_id: requestId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw error;
}

export async function processDoubleShiftRequest(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc("process_double_shift_request", {
    p_request_id: requestId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw error;
}

// ----- Staff requests (admin console) -----

export interface AllStaffRequests {
  leaves: Record<string, unknown>[];
  regularizations: Record<string, unknown>[];
  overtime: Record<string, unknown>[];
  doubleShifts: Record<string, unknown>[];
}

export async function fetchAllRequests(profileIds: string[]): Promise<AllStaffRequests> {
  if (!profileIds.length) {
    return { leaves: [], regularizations: [], overtime: [], doubleShifts: [] };
  }
  const [leavesRes, regsRes, otRes, dsRes] = await Promise.all([
    supabase
      .from('staff_leave_requests')
      .select('*')
      .in('staff_id', profileIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_attendance_regularization')
      .select('*')
      .in('staff_id', profileIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_overtime_requests')
      .select('*')
      .in('staff_id', profileIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_double_shift_requests')
      .select('*')
      .in('staff_id', profileIds)
      .order('requested_at', { ascending: false }),
  ]);
  if (leavesRes.error) throw leavesRes.error;
  if (regsRes.error) throw regsRes.error;
  if (otRes.error) throw otRes.error;
  if (dsRes.error) throw dsRes.error;
  return {
    leaves: (leavesRes.data ?? []) as Record<string, unknown>[],
    regularizations: (regsRes.data ?? []) as Record<string, unknown>[],
    overtime: (otRes.data ?? []) as Record<string, unknown>[],
    doubleShifts: (dsRes.data ?? []) as Record<string, unknown>[],
  };
}

export async function finalizeLeaveApproval(
  requestId: string,
  reviewedBy: string,
  remarks?: string,
): Promise<void> {
  const { error } = await supabase
    .from('staff_leave_requests')
    .update({ reviewed_by: reviewedBy, remarks: remarks ?? null })
    .eq('id', requestId);
  if (error) throw error;
}

export async function rejectLeave(
  requestId: string,
  reviewedBy: string,
  remarks?: string,
): Promise<void> {
  const { error } = await supabase
    .from('staff_leave_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      remarks: remarks ?? null,
    })
    .eq('id', requestId);
  if (error) throw error;
}

export async function rejectRegularization(
  requestId: string,
  reviewedBy: string,
  remarks?: string,
): Promise<void> {
  const { error } = await supabase
    .from('staff_attendance_regularization')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      remarks: remarks ?? null,
    })
    .eq('id', requestId);
  if (error) throw error;
}

const DELETABLE_REQUEST_TABLES = new Set([
  'staff_leave_requests',
  'staff_attendance_regularization',
  'staff_overtime_requests',
  'staff_double_shift_requests',
]);

export async function deleteStaffRequest(table: string, id: string): Promise<void> {
  if (!DELETABLE_REQUEST_TABLES.has(table)) {
    throw new StaffScopeError(`Cannot delete from table: ${table}`);
  }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ----- Payroll (admin console) -----

export async function fetchPayrollForMonth(
  profileIds: string[],
  month: number,
  year: number,
): Promise<Record<string, unknown>[]> {
  if (!profileIds.length) return [];
  const { data, error } = await supabase
    .from('staff_payslip_view')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .in('staff_id', profileIds);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

export async function revertPayroll(payrollId: string): Promise<void> {
  const { error } = await supabase.from('staff_payroll').delete().eq('id', payrollId);
  if (error) throw error;
}

export async function addDeduction(input: {
  staffId: string;
  locationId: string;
  deductionType: string;
  amount: number;
  reason: string;
  markedBy: string;
  month: number;
  year: number;
  deductionDate: string;
}): Promise<void> {
  const { error } = await supabase.from('staff_deductions').insert({
    staff_id: input.staffId,
    location_id: input.locationId,
    deduction_type: input.deductionType,
    amount: input.amount,
    reason: input.reason,
    marked_by: input.markedBy,
    month: input.month,
    year: input.year,
    deduction_date: input.deductionDate,
  });
  if (error) throw error;
}

export async function addAllowance(input: {
  staffId: string;
  locationId: string;
  allowanceType: string;
  amount: number;
  reason: string;
  approvedBy: string;
  month: number;
  year: number;
}): Promise<void> {
  const { error } = await supabase.from('staff_allowances').insert({
    staff_id: input.staffId,
    location_id: input.locationId,
    allowance_type: input.allowanceType,
    amount: input.amount,
    reason: input.reason,
    approved_by: input.approvedBy,
    month: input.month,
    year: input.year,
  });
  if (error) throw error;
}

export async function approveAllPayroll(
  profileIds: string[],
  month: number,
  year: number,
): Promise<void> {
  if (!profileIds.length) return;
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('staff_payroll')
    .update({
      payment_status: 'paid',
      payment_date: today,
      payment_method: 'manual',
    })
    .eq('month', month)
    .eq('year', year)
    .in('staff_id', profileIds);
  if (error) throw error;
}

export async function unlockPayroll(
  staffId: string,
  month: number,
  year: number,
  unlockedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("staff_payroll")
    .update({
      is_locked: false,
      locked_at: null,
      locked_by: null,
      payment_status: "pending",
      notes: `Unlocked by ${unlockedBy}`,
    })
    .eq("staff_id", staffId)
    .eq("month", month)
    .eq("year", year);
  if (error) throw error;
}

export async function lockPayroll(
  staffId: string,
  month: number,
  year: number,
  lockedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("staff_payroll")
    .update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: lockedBy,
      payment_status: "approved",
    })
    .eq("staff_id", staffId)
    .eq("month", month)
    .eq("year", year);
  if (error) throw error;
}

export async function logHrAudit(entry: {
  organizationId: string;
  locationId?: string | null;
  actorAdminUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("staff_hr_audit_log").insert({
    organization_id: entry.organizationId,
    location_id: entry.locationId ?? null,
    actor_admin_user_id: entry.actorAdminUserId ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    payload: entry.payload ?? {},
  });
  if (error && error.code !== "42P01") {
    console.warn("staff_hr_audit_log insert failed:", error.message);
  }
}

export { staffProfileId, staffProfileIds };
