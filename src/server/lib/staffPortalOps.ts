/**
 * Self-scoped staff portal operations (service role).
 * Every op is tied to the caller's staff_profiles row — never trust client staff IDs.
 */

import { format } from "date-fns";
import { supabaseServiceClient } from "../supabaseServer";
import { resolveStaffHourlyRate } from "../../utils/staffEarnings.js";

const supabase = supabaseServiceClient("cuetronix-staff-portal-ops");

export type PortalProfile = {
  user_id: string;
  username: string;
  full_name: string | null;
  designation: string | null;
  email: string | null;
  location_id: string;
  hourly_rate: number;
  monthly_salary: number;
  shift_start_time: string | null;
  shift_end_time: string | null;
  default_shift_hours: number | null;
  is_active: boolean;
};

export async function resolvePortalProfile(adminUserId: string): Promise<PortalProfile | null> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("admin_user_id", adminUserId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const monthlySalary = Number(data.monthly_salary ?? 0);
  const shiftStart = (data.shift_start_time as string | null) ?? null;
  const shiftEnd = (data.shift_end_time as string | null) ?? null;
  const defaultShiftHours =
    data.default_shift_hours != null ? Number(data.default_shift_hours) : null;

  return {
    user_id: String(data.user_id),
    username: String(data.username),
    full_name: (data.full_name as string | null) ?? null,
    designation: (data.designation as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    location_id: String(data.location_id),
    hourly_rate: resolveStaffHourlyRate({
      hourly_rate: data.hourly_rate as number | null,
      monthly_salary: monthlySalary,
      shift_start_time: shiftStart,
      shift_end_time: shiftEnd,
      default_shift_hours: defaultShiftHours,
    }),
    monthly_salary: monthlySalary,
    shift_start_time: shiftStart,
    shift_end_time: shiftEnd,
    default_shift_hours: defaultShiftHours,
    is_active: data.is_active !== false,
  };
}

export async function assertProfileInOrg(profile: PortalProfile, organizationId: string): Promise<void> {
  const { data: loc } = await supabase
    .from("locations")
    .select("organization_id")
    .eq("id", profile.location_id)
    .maybeSingle();
  if (loc?.organization_id && loc.organization_id !== organizationId) {
    throw new Error("Staff profile is not in this workspace.");
  }
}

async function backfillZeroEarnings(staffId: string, hourlyRate: number): Promise<void> {
  if (hourlyRate <= 0) return;
  const { data: zeroEarnings } = await supabase
    .from("staff_attendance")
    .select("id, clock_out")
    .eq("staff_id", staffId)
    .not("clock_out", "is", null)
    .or("daily_earnings.is.null,daily_earnings.eq.0")
    .limit(20);

  for (const row of zeroEarnings ?? []) {
    if (!row.clock_out) continue;
    await supabase.from("staff_attendance").update({ clock_out: row.clock_out }).eq("id", row.id);
  }
}

export async function fetchPortalDashboard(staffId: string, locationId: string) {
  await backfillZeroEarnings(staffId, 0);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const startOfMonth = format(new Date(currentYear, currentMonth - 1, 1), "yyyy-MM-dd");
  const endOfMonth = format(new Date(currentYear, currentMonth, 0), "yyyy-MM-dd");

  const [
    shiftRes,
    attendanceRes,
    regRes,
    otRes,
    dsRes,
    colleaguesRes,
    violationsRes,
    monthStatsRes,
    leavesRes,
    balanceRes,
    payslipsRes,
  ] = await Promise.all([
    supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .is("clock_out", null)
      .not("clock_in", "is", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false })
      .limit(100),
    supabase
      .from("staff_attendance_regularization")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_overtime_requests")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_double_shift_requests")
      .select("*")
      .eq("staff_id", staffId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("staff_profiles")
      .select("*")
      .eq("is_active", true)
      .eq("location_id", locationId),
    supabase
      .from("staff_break_violations")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .in("status", ["completed", "regularized", "present", "half_day", "half_day_lop"]),
    supabase
      .from("staff_leave_requests")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("staff_leave_balances")
      .select("leave_type, remaining")
      .eq("staff_id", staffId)
      .eq("year", currentYear),
    supabase
      .from("staff_payslip_view")
      .select("*")
      .eq("staff_id", staffId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(6),
  ]);

  const attendanceStats = monthStatsRes.data ?? [];
  const workingDays = attendanceStats.filter((a) => Number(a.total_working_hours) > 0).length;
  const totalHours = attendanceStats.reduce((sum, a) => sum + (Number(a.total_working_hours) || 0), 0);
  const totalEarnings = attendanceStats.reduce((sum, a) => sum + (Number(a.daily_earnings) || 0), 0);

  const leaves = leavesRes.data ?? [];
  let leaveBalance = { paid: 1, unpaid: 2 };
  const balanceRows = balanceRes.data ?? [];
  if (balanceRows.length > 0) {
    const paidRemaining = balanceRows
      .filter((b) => b.leave_type !== "unpaid_leave")
      .reduce((sum, b) => sum + (Number(b.remaining) || 0), 0);
    const unpaidRemaining = balanceRows
      .filter((b) => b.leave_type === "unpaid_leave")
      .reduce((sum, b) => sum + (Number(b.remaining) || 0), 0);
    leaveBalance = { paid: paidRemaining, unpaid: unpaidRemaining };
  } else {
    const approvedPaidLeaves = leaves
      .filter(
        (l) =>
          l.status === "approved" &&
          l.leave_type !== "unpaid_leave" &&
          new Date(String(l.start_date)).getFullYear() === currentYear,
      )
      .reduce((sum, l) => sum + (Number(l.total_days) || 0), 0);
    const approvedUnpaidLeaves = leaves
      .filter(
        (l) =>
          l.status === "approved" &&
          l.leave_type === "unpaid_leave" &&
          new Date(String(l.start_date)).getFullYear() === currentYear,
      )
      .reduce((sum, l) => sum + (Number(l.total_days) || 0), 0);
    leaveBalance = {
      paid: Math.max(0, 12 - approvedPaidLeaves),
      unpaid: Math.max(0, 6 - approvedUnpaidLeaves),
    };
  }

  return {
    currentShift: shiftRes.data ?? null,
    allAttendance: attendanceRes.data ?? [],
    regularizationRequests: regRes.data ?? [],
    otRequests: otRes.data ?? [],
    doubleShiftRequests: dsRes.data ?? [],
    allStaffProfiles: colleaguesRes.data ?? [],
    breakViolations: violationsRes.data ?? [],
    monthlyStats: { days_worked: workingDays, total_hours: totalHours, total_earnings: totalEarnings },
    leaveRequests: leaves,
    leaveBalance,
    payslips: payslipsRes.data ?? [],
  };
}

export async function clockIn(profile: PortalProfile) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: openShift } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("staff_id", profile.user_id)
    .is("clock_out", null)
    .not("clock_in", "is", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openShift) {
    return {
      ok: false as const,
      error:
        openShift.date === today
          ? "You are already on an active shift."
          : `You have an open shift from ${format(new Date(String(openShift.date)), "MMM dd")}. Clock out first.`,
      currentShift: openShift,
    };
  }

  const { data: todayRecord } = await supabase
    .from("staff_attendance")
    .select("id, clock_out")
    .eq("staff_id", profile.user_id)
    .eq("date", today)
    .maybeSingle();

  if (todayRecord?.clock_out) {
    return { ok: false as const, error: "You have already clocked out for today." };
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from("staff_attendance")
    .insert({
      staff_id: profile.user_id,
      date: today,
      clock_in: now,
      status: "active",
      location_id: profile.location_id,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "You already have an attendance record for today." };
    }
    throw error;
  }

  return { ok: true as const, currentShift: inserted };
}

export async function clockOut(profile: PortalProfile, attendanceId: string) {
  const { data: currentShift, error: fetchErr } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("id", attendanceId)
    .eq("staff_id", profile.user_id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!currentShift) throw new Error("Active shift not found.");

  const now = new Date().toISOString();
  let breakDuration = Number(currentShift.break_duration_minutes) || 0;

  if (currentShift.break_start_time && !currentShift.break_end_time) {
    const breakStart = new Date(String(currentShift.break_start_time));
    breakDuration += Math.floor((Date.now() - breakStart.getTime()) / 60000);
  }

  const { error } = await supabase
    .from("staff_attendance")
    .update({
      clock_out: now,
      break_duration_minutes: breakDuration,
      break_end_time:
        currentShift.break_start_time && !currentShift.break_end_time
          ? now
          : currentShift.break_end_time,
    })
    .eq("id", attendanceId);

  if (error) throw error;

  await supabase
    .from("active_breaks")
    .update({ is_active: false, break_end: now })
    .eq("attendance_id", attendanceId)
    .eq("is_active", true);

  return { ok: true };
}

export async function startBreak(profile: PortalProfile, attendanceId: string) {
  const { data: row } = await supabase
    .from("staff_attendance")
    .select("id")
    .eq("id", attendanceId)
    .eq("staff_id", profile.user_id)
    .maybeSingle();
  if (!row) throw new Error("Active shift not found.");

  const now = new Date().toISOString();
  const { data: conflicts } = await supabase.rpc("check_break_conflict", {
    staff_uuid: profile.user_id,
    break_start_time: now,
  });

  if (conflicts) {
    return { ok: false as const, error: "Another staff member is currently on break" };
  }

  await supabase.from("staff_attendance").update({ break_start_time: now }).eq("id", attendanceId);
  await supabase.from("active_breaks").insert({
    staff_id: profile.user_id,
    attendance_id: attendanceId,
    break_start: now,
    is_active: true,
  });

  return { ok: true as const };
}

export async function endBreak(profile: PortalProfile, attendanceId: string) {
  const { data: currentShift, error } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("id", attendanceId)
    .eq("staff_id", profile.user_id)
    .maybeSingle();
  if (error) throw error;
  if (!currentShift?.break_start_time) throw new Error("No active break.");

  const now = new Date().toISOString();
  const breakStart = new Date(String(currentShift.break_start_time));
  const breakMinutes = Math.floor((Date.now() - breakStart.getTime()) / 60000);
  const totalBreak = (Number(currentShift.break_duration_minutes) || 0) + breakMinutes;

  await supabase
    .from("staff_attendance")
    .update({ break_end_time: now, break_duration_minutes: totalBreak })
    .eq("id", attendanceId);

  await supabase
    .from("active_breaks")
    .update({ is_active: false, break_end: now })
    .eq("attendance_id", attendanceId)
    .eq("is_active", true);

  return { ok: true, breakMinutes, totalBreak, exceeded: totalBreak > 60 };
}

export async function deleteLeave(profile: PortalProfile, leaveId: string) {
  const { error } = await supabase
    .from("staff_leave_requests")
    .delete()
    .eq("id", leaveId)
    .eq("staff_id", profile.user_id);
  if (error) throw error;
  return { ok: true };
}

export async function submitLeave(
  profile: PortalProfile,
  payload: {
    startDate: string;
    endDate: string;
    leaveType: string;
    reason: string;
  },
) {
  const { error } = await supabase.from("staff_leave_requests").insert({
    staff_id: profile.user_id,
    start_date: payload.startDate,
    end_date: payload.endDate,
    leave_type: payload.leaveType,
    reason: payload.reason,
    status: "pending",
  });
  if (error) throw error;
  return { ok: true };
}

export async function checkRegularizationLimit(profile: PortalProfile, month: number, year: number) {
  const { data, error } = await supabase.rpc("check_regularization_limit", {
    p_staff_id: profile.user_id,
    p_month: month,
    p_year: year,
  });
  if (error) throw error;
  return data;
}

export async function submitRegularization(
  profile: PortalProfile,
  payload: {
    date: string;
    regularizationType: string;
    requestedClockIn: string | null;
    requestedClockOut: string | null;
    leaveType: string | null;
    reason: string;
  },
) {
  const { error } = await supabase.from("staff_attendance_regularization").insert({
    staff_id: profile.user_id,
    date: payload.date,
    regularization_type: payload.regularizationType,
    requested_clock_in: payload.requestedClockIn,
    requested_clock_out: payload.requestedClockOut,
    leave_type: payload.regularizationType === "apply_leave" ? payload.leaveType : null,
    reason: payload.reason,
  });
  if (error) throw error;
  return { ok: true };
}

export async function fetchOvertimePickerData(profile: PortalProfile, month: number, year: number) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const [otRecords, requestedDates] = await Promise.all([
    supabase
      .from("staff_overtime")
      .select("*")
      .eq("staff_id", profile.user_id)
      .eq("status", "pending")
      .gte("date", monthStart)
      .lt("date", monthEnd),
    supabase
      .from("staff_overtime_requests")
      .select("date")
      .eq("staff_id", profile.user_id)
      .in("status", ["pending", "approved"])
      .gte("date", monthStart)
      .lt("date", monthEnd),
  ]);

  if (otRecords.error) throw otRecords.error;
  if (requestedDates.error) throw requestedDates.error;

  const requestedDateSet = new Set((requestedDates.data ?? []).map((r) => r.date));
  const available = (otRecords.data ?? []).filter((ot) => !requestedDateSet.has(ot.date));

  return { availableOTDays: available };
}

export async function submitOvertime(
  profile: PortalProfile,
  payload: {
    date: string;
    overtimeHours: number;
    reason: string;
    overtimeAmount?: number;
  },
) {
  const { error } = await supabase.from("staff_overtime_requests").insert({
    staff_id: profile.user_id,
    date: payload.date,
    overtime_hours: payload.overtimeHours,
    reason: payload.reason,
    overtime_amount: payload.overtimeAmount ?? 100,
  });
  if (error) throw error;
  return { ok: true };
}

export async function calculateDoubleShiftAllowance(
  profile: PortalProfile,
  coveredStaffId: string,
  coveredShiftHours: number,
  date: string,
) {
  const { data, error } = await supabase.rpc("calculate_double_shift_allowance", {
    p_staff_id: profile.user_id,
    p_covered_staff_id: coveredStaffId,
    p_covered_shift_hours: coveredShiftHours,
    p_date: date,
  });
  if (error) throw error;
  return data;
}

export async function submitDoubleShift(
  profile: PortalProfile,
  payload: {
    date: string;
    coveredStaffId: string;
    originalShiftStart: string | null;
    originalShiftEnd: string | null;
    coveredShiftStart: string | null;
    coveredShiftEnd: string | null;
    totalHours: number;
    reason: string;
  },
) {
  const { data: existing } = await supabase
    .from("staff_double_shift_requests")
    .select("id")
    .eq("staff_id", profile.user_id)
    .eq("date", payload.date)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    throw new Error("You already have a pending double shift request for this date.");
  }

  const { error } = await supabase.from("staff_double_shift_requests").insert({
    staff_id: profile.user_id,
    covered_staff_id: payload.coveredStaffId,
    date: payload.date,
    original_shift_start: payload.originalShiftStart,
    original_shift_end: payload.originalShiftEnd,
    covered_shift_start: payload.coveredShiftStart,
    covered_shift_end: payload.coveredShiftEnd,
    total_hours: payload.totalHours,
    reason: payload.reason,
  });
  if (error) throw error;
  return { ok: true };
}
