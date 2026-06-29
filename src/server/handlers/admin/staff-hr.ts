/**
 * POST /api/admin/staff-hr — server proxy for HR admin operations (service role + RBAC).
 */

import { ADMIN_SESSION_COOKIE, j, parseCookies, verifyAdminSession } from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { assertEntitlement } from "../../lib/entitlements.js";
import { assertWorkspacePermission, resolveWorkspaceAccess } from "../../lib/workspacePermissions";
import { isDenied } from "../../lib/resultGuards";
import * as ops from "../../lib/staffHrOps";
import * as pinOps from "../../lib/employeePinOps.js";
import type {
  StaffHoliday,
  StaffLeavePolicy,
  StaffProfile,
  StaffScope,
} from "../../../types/staff.types.js";

export const config = { runtime: "edge" };

type OpArgs = Record<string, unknown>;

const OP_PERMISSIONS: Record<string, string> = {
  fetchAllRequests: "hr.requests.view",
  finalizeLeaveApproval: "hr.requests.approve",
  rejectLeave: "hr.requests.approve",
  rejectRegularization: "hr.requests.approve",
  deleteStaffRequest: "hr.requests.approve",
  fetchPayrollForMonth: "hr.payroll.view",
  revertPayroll: "hr.payroll.generate",
  addDeduction: "hr.payroll.generate",
  addAllowance: "hr.payroll.generate",
  approveAllPayroll: "hr.payroll.generate",
};

const PIN_GATE_OPS = new Set(["fetchEmployeePinProtection", "logStaffActivity"]);

function permForOp(op: string): string {
  if (op === "fetchEmployeePinProtection" || op === "logStaffActivity") return "pos.view";
  if (OP_PERMISSIONS[op]) return OP_PERMISSIONS[op];
  if (op.startsWith("fetch") || op === "assertStaffInScope" || op === "checkActiveShift" || op === "logHrAudit") {
    if (op.includes("Audit")) return "hr.audit.view";
    if (op === "fetchHrSettings") return "hr.policies.view";
    if (op === "updateHrSettings") return "hr.policies.edit";
    if (op === "logStaffActivity") return "pos.view";
    if (op.includes("Holiday")) return "hr.holidays.view";
    if (op.includes("Leave") && op.includes("Policy")) return "hr.policies.view";
    if (op.includes("Leave")) return "hr.requests.view";
    return "hr.view";
  }
  if (op.includes("Holiday")) return "hr.holidays.edit";
  if (op.includes("Leave") || op.includes("Policy")) return "hr.policies.edit";
  if (op.startsWith("process")) return "hr.requests.approve";
  if (op.startsWith("generate") || op.startsWith("lock") || op.startsWith("unlock")) return "hr.payroll.generate";
  if (op.includes("Roster") || op.includes("sync")) return "hr.shifts.edit";
  if (op === "deleteStaffProfile" || op === "deactivateStaff" || op === "activateStaff") return "hr.directory.edit";
  return "hr.directory.edit";
}

const HANDLERS: Record<string, (args: OpArgs) => Promise<unknown>> = {
  fetchStaffProfiles: (a) => ops.fetchStaffProfiles(a.scope as StaffScope),
  fetchStaffStats: (a) => ops.fetchStaffStats(a.scope as StaffScope, a.profiles as StaffProfile[]),
  fetchActiveShifts: (a) => ops.fetchActiveShifts(a.profileIds as string[]),
  fetchPendingLeaves: (a) => ops.fetchPendingLeaves(a.profileIds as string[]),
  fetchAttendanceForMonth: (a) =>
    ops.fetchAttendanceForMonth(a.profileIds as string[], a.month as number, a.year as number),
  assertStaffInScope: (a) => ops.assertStaffInScope(a.staffId as string, a.scope as StaffScope),
  checkActiveShift: (a) => ops.checkActiveShift(a.staffId as string),
  deactivateStaff: (a) => ops.deactivateStaff(a.staffId as string, a.scope as StaffScope, a.force as boolean | undefined),
  activateStaff: (a) => ops.activateStaff(a.staffId as string, a.scope as StaffScope),
  deleteStaffProfile: (a) => ops.deleteStaffProfile(a.staffId as string, a.scope as StaffScope),
  fetchLeaveBalances: (a) => ops.fetchLeaveBalances(a.staffId as string, a.year as number),
  fetchHolidays: (a) => ops.fetchHolidays(a.scope as StaffScope, a.year as number),
  fetchAuditLog: (a) =>
    ops.fetchAuditLog(a.scope as StaffScope, {
      limit: a.limit as number | undefined,
      staffId: (a.staffId as string | null) ?? null,
      category: (a.category as string | null) ?? null,
      dateFrom: (a.dateFrom as string | null) ?? null,
      dateTo: (a.dateTo as string | null) ?? null,
    }),
  fetchHrSettings: (a) => pinOps.fetchHrSettings(a.organizationId as string),
  fetchEmployeePinProtection: (a) =>
    pinOps.fetchEmployeePinProtectionFlag(a.organizationId as string),
  updateHrSettings: (a) =>
    pinOps.updateHrSettings(a.organizationId as string, {
      employeePinProtectionEnabled: a.employeePinProtectionEnabled as boolean | undefined,
    }),
  logStaffActivity: (a) =>
    pinOps.logStaffActivity({
      organizationId: a.organizationId as string,
      locationId: (a.locationId as string | null) ?? null,
      actorStaffId: (a.actorStaffId as string | null) ?? null,
      actorAdminUserId: (a.actorAdminUserId as string | null) ?? null,
      actionKey: a.actionKey as string,
      context: (a.context as Record<string, unknown>) ?? {},
      outcome: a.outcome as 'success' | 'failed' | 'bypass' | undefined,
      entityType: a.entityType as string | undefined,
      entityId: (a.entityId as string | null) ?? null,
    }),
  fetchLeavePolicies: (a) => ops.fetchLeavePolicies(a.scope as StaffScope),
  upsertLeavePolicy: (a) =>
    ops.upsertLeavePolicy(a.scope as StaffScope, a.policy as Omit<StaffLeavePolicy, "id" | "created_at" | "updated_at"> & { id?: string }),
  deleteLeavePolicy: (a) => ops.deleteLeavePolicy(a.id as string, a.scope as StaffScope),
  seedLeaveBalancesForStaff: (a) =>
    ops.seedLeaveBalancesForStaff(
      a.staffId as string,
      a.organizationId as string,
      a.year as number,
      a.policies as StaffLeavePolicy[],
    ),
  upsertHoliday: (a) =>
    ops.upsertHoliday(a.scope as StaffScope, a.holiday as Omit<StaffHoliday, "id"> & { id?: string }),
  deleteHoliday: (a) => ops.deleteHoliday(a.id as string, a.scope as StaffScope),
  seedHolidaysIfMissing: (a) =>
    ops.seedHolidaysIfMissing(
      a.scope as StaffScope,
      a.entries as Array<{ date: string; name: string; is_paid: boolean }>,
      new Set((a.existingDates as string[]) ?? []),
    ),
  syncRosterFromProfile: (a) =>
    ops.syncRosterFromProfile(
      a.staffId as string,
      a.locationId as string,
      a.shiftStart as string,
      a.shiftEnd as string,
      a.options as { onlyIfMissing?: boolean } | undefined,
    ),
  syncMissingRostersFromProfiles: (a) =>
    ops.syncMissingRostersFromProfiles(a.profiles as StaffProfile[], a.locationId as string | null),
  forceSyncRostersFromProfiles: (a) =>
    ops.forceSyncRostersFromProfiles(a.profiles as StaffProfile[], a.locationId as string | null),
  syncStalePlaceholderRosters: (a) =>
    ops.syncStalePlaceholderRosters(a.profiles as StaffProfile[], a.locationId as string | null),
  generateMonthlyPayroll: (a) =>
    ops.generateMonthlyPayroll(a.staffId as string, a.month as number, a.year as number, a.adminUsername as string),
  processLeaveApproval: (a) =>
    ops.processLeaveApproval(a.requestId as string, a.action as "approve" | "reject", a.remarks as string | undefined),
  processRegularization: (a) =>
    ops.processRegularization(a.requestId as string, a.action as "approve" | "reject", a.remarks as string | undefined),
  processOtRequest: (a) =>
    ops.processOtRequest(a.requestId as string, a.action as "approve" | "reject", a.remarks as string | undefined),
  processDoubleShiftRequest: (a) =>
    ops.processDoubleShiftRequest(a.requestId as string, a.action as "approve" | "reject", a.remarks as string | undefined),
  fetchAllRequests: (a) => ops.fetchAllRequests(a.profileIds as string[]),
  finalizeLeaveApproval: (a) =>
    ops.finalizeLeaveApproval(a.requestId as string, a.reviewedBy as string, a.remarks as string | undefined),
  rejectLeave: (a) =>
    ops.rejectLeave(a.requestId as string, a.reviewedBy as string, a.remarks as string | undefined),
  rejectRegularization: (a) =>
    ops.rejectRegularization(a.requestId as string, a.reviewedBy as string, a.remarks as string | undefined),
  deleteStaffRequest: (a) => ops.deleteStaffRequest(a.table as string, a.id as string),
  fetchPayrollForMonth: (a) =>
    ops.fetchPayrollForMonth(a.profileIds as string[], a.month as number, a.year as number),
  revertPayroll: (a) => ops.revertPayroll(a.payrollId as string),
  addDeduction: (a) =>
    ops.addDeduction(
      a as unknown as {
        staffId: string;
        locationId: string;
        deductionType: string;
        amount: number;
        reason: string;
        markedBy: string;
        month: number;
        year: number;
        deductionDate: string;
      },
    ),
  addAllowance: (a) =>
    ops.addAllowance(
      a as unknown as {
        staffId: string;
        locationId: string;
        allowanceType: string;
        amount: number;
        reason: string;
        approvedBy: string;
        month: number;
        year: number;
      },
    ),
  approveAllPayroll: (a) =>
    ops.approveAllPayroll(a.profileIds as string[], a.month as number, a.year as number),
  unlockPayroll: (a) =>
    ops.unlockPayroll(a.staffId as string, a.month as number, a.year as number, a.unlockedBy as string),
  lockPayroll: (a) =>
    ops.lockPayroll(a.staffId as string, a.month as number, a.year as number, a.lockedBy as string),
  logHrAudit: (a) =>
    ops.logHrAudit(
      a.entry as {
        organizationId: string;
        locationId?: string | null;
        actorAdminUserId?: string | null;
        action: string;
        entityType: string;
        entityId?: string | null;
        payload?: Record<string, unknown>;
      },
    ),
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Could not resolve workspace." }, ctx.status);
    }

    if (!PIN_GATE_OPS.has(op)) {
      const staffGate = await assertEntitlement(ctx, "staff_hr_enabled");
      if (staffGate) return staffGate;
    }

    const body = (await req.json().catch(() => ({}))) as { op?: string; args?: OpArgs };
    const op = typeof body.op === "string" ? body.op.trim() : "";
    const args = body.args && typeof body.args === "object" ? body.args : {};
    const run = HANDLERS[op];
    if (!run) return j({ ok: false, error: `Unknown staff HR op: ${op}` }, 400);

    const access = await resolveWorkspaceAccess(ctx.supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });
    const gate = assertWorkspacePermission(access, permForOp(op));
    if (isDenied(gate)) return j({ ok: false, error: gate.error }, 403);

    const scope = args.scope as StaffScope | undefined;
    if (scope && typeof scope === "object" && scope.organizationId !== ctx.organizationId) {
      return j({ ok: false, error: "Workspace scope mismatch." }, 403);
    }

    if (
      op === "fetchHrSettings" ||
      op === "fetchEmployeePinProtection" ||
      op === "updateHrSettings" ||
      op === "logStaffActivity"
    ) {
      const orgArg = typeof args.organizationId === "string" ? args.organizationId : "";
      if (orgArg && orgArg !== ctx.organizationId) {
        return j({ ok: false, error: "Workspace scope mismatch." }, 403);
      }
      args.organizationId = ctx.organizationId;
    }

    const data = await run(args);
    return j({ ok: true, data }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/staff-hr]", message);
    return j({ ok: false, error: message }, 500);
  }
}
