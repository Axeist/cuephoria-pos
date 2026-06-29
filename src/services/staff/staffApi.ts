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
} from "@/types/staff.types";
import { staffHrCall } from "./staffHrTransport";
export { StaffScopeError } from "./staffApi.types";
export { staffProfileId, staffProfileIds } from "./staffMappers";

export async function fetchStaffProfiles(scope: StaffScope): Promise<StaffProfile[]> {
  return staffHrCall("fetchStaffProfiles", { scope });
}

export async function fetchStaffStats(scope: StaffScope, profiles: StaffProfile[]): Promise<StaffStats> {
  return staffHrCall("fetchStaffStats", { scope, profiles });
}

export async function fetchActiveShifts(profileIds: string[]): Promise<ActiveShift[]> {
  return staffHrCall("fetchActiveShifts", { profileIds });
}

export async function fetchPendingLeaves(profileIds: string[]): Promise<PendingLeave[]> {
  return staffHrCall("fetchPendingLeaves", { profileIds });
}

export async function fetchAttendanceForMonth(
  profileIds: string[],
  month: number,
  year: number,
): Promise<StaffAttendance[]> {
  return staffHrCall("fetchAttendanceForMonth", { profileIds, month, year });
}

export async function assertStaffInScope(staffId: string, scope: StaffScope): Promise<StaffProfile> {
  return staffHrCall("assertStaffInScope", { staffId, scope });
}

export async function checkActiveShift(staffId: string): Promise<boolean> {
  return staffHrCall("checkActiveShift", { staffId });
}

export async function deactivateStaff(staffId: string, scope: StaffScope, force = false): Promise<void> {
  await staffHrCall("deactivateStaff", { staffId, scope, force });
}

export async function activateStaff(staffId: string, scope: StaffScope): Promise<void> {
  await staffHrCall("activateStaff", { staffId, scope });
}

export async function deleteStaffProfile(staffId: string, scope: StaffScope): Promise<void> {
  await staffHrCall("deleteStaffProfile", { staffId, scope });
}

export async function fetchLeaveBalances(staffId: string, year: number): Promise<LeaveBalance[]> {
  return staffHrCall("fetchLeaveBalances", { staffId, year });
}

export async function fetchHolidays(scope: StaffScope, year: number): Promise<StaffHoliday[]> {
  return staffHrCall("fetchHolidays", { scope, year });
}

export async function fetchAuditLog(
  scope: StaffScope,
  options: {
    limit?: number;
    staffId?: string | null;
    category?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  } = {},
): Promise<StaffAuditEntry[]> {
  return staffHrCall('fetchAuditLog', {
    scope,
    ...options,
    limit: options.limit ?? 100,
  });
}

export async function fetchLeavePolicies(scope: StaffScope): Promise<StaffLeavePolicy[]> {
  return staffHrCall("fetchLeavePolicies", { scope });
}

export async function upsertLeavePolicy(
  scope: StaffScope,
  policy: Omit<StaffLeavePolicy, "id" | "created_at" | "updated_at"> & { id?: string },
): Promise<StaffLeavePolicy> {
  return staffHrCall("upsertLeavePolicy", { scope, policy });
}

export async function deleteLeavePolicy(id: string, scope: StaffScope): Promise<void> {
  await staffHrCall("deleteLeavePolicy", { id, scope });
}

export async function seedLeaveBalancesForStaff(
  staffId: string,
  organizationId: string,
  year: number,
  policies: StaffLeavePolicy[],
): Promise<void> {
  await staffHrCall("seedLeaveBalancesForStaff", { staffId, organizationId, year, policies });
}

export async function upsertHoliday(
  scope: StaffScope,
  holiday: Omit<StaffHoliday, "id"> & { id?: string },
): Promise<StaffHoliday> {
  return staffHrCall("upsertHoliday", { scope, holiday });
}

export async function deleteHoliday(id: string, scope: StaffScope): Promise<void> {
  await staffHrCall("deleteHoliday", { id, scope });
}

export async function seedHolidaysIfMissing(
  scope: StaffScope,
  entries: Array<{ date: string; name: string; is_paid: boolean }>,
  existingDates: Set<string>,
): Promise<{ added: number; skipped: number }> {
  return staffHrCall("seedHolidaysIfMissing", {
    scope,
    entries,
    existingDates: [...existingDates],
  });
}

export async function syncRosterFromProfile(
  staffId: string,
  locationId: string,
  shiftStart: string,
  shiftEnd: string,
  options?: { onlyIfMissing?: boolean },
): Promise<number> {
  return staffHrCall("syncRosterFromProfile", { staffId, locationId, shiftStart, shiftEnd, options });
}

export async function syncMissingRostersFromProfiles(
  profiles: StaffProfile[],
  locationId: string | null,
): Promise<number> {
  return staffHrCall("syncMissingRostersFromProfiles", { profiles, locationId });
}

export async function forceSyncRostersFromProfiles(
  profiles: StaffProfile[],
  locationId: string | null,
): Promise<number> {
  return staffHrCall("forceSyncRostersFromProfiles", { profiles, locationId });
}

export async function syncStalePlaceholderRosters(
  profiles: StaffProfile[],
  locationId: string | null,
): Promise<number> {
  return staffHrCall("syncStalePlaceholderRosters", { profiles, locationId });
}

export interface AllStaffRequests {
  leaves: Record<string, unknown>[];
  regularizations: Record<string, unknown>[];
  overtime: Record<string, unknown>[];
  doubleShifts: Record<string, unknown>[];
}

export async function fetchAllRequests(profileIds: string[]): Promise<AllStaffRequests> {
  return staffHrCall("fetchAllRequests", { profileIds });
}

export async function fetchPayrollForMonth(
  profileIds: string[],
  month: number,
  year: number,
): Promise<Record<string, unknown>[]> {
  return staffHrCall("fetchPayrollForMonth", { profileIds, month, year });
}
