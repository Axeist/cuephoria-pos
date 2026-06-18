import { staffHrCall } from "./staffHrTransport";

export async function generateMonthlyPayroll(
  staffId: string,
  month: number,
  year: number,
  adminUsername: string,
): Promise<string> {
  return staffHrCall("generateMonthlyPayroll", { staffId, month, year, adminUsername });
}

export async function processLeaveApproval(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  await staffHrCall("processLeaveApproval", { requestId, action, remarks });
}

export async function processRegularization(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  await staffHrCall("processRegularization", { requestId, action, remarks });
}

export async function processOtRequest(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string | null,
): Promise<void> {
  await staffHrCall("processOtRequest", { requestId, action, remarks });
}

export async function processDoubleShiftRequest(
  requestId: string,
  action: "approve" | "reject",
  remarks?: string,
): Promise<void> {
  await staffHrCall("processDoubleShiftRequest", { requestId, action, remarks });
}

export async function finalizeLeaveApproval(
  requestId: string,
  reviewedBy: string,
  remarks?: string | null,
): Promise<void> {
  await staffHrCall("finalizeLeaveApproval", { requestId, reviewedBy, remarks });
}

export async function rejectLeave(
  requestId: string,
  reviewedBy: string,
  remarks?: string | null,
): Promise<void> {
  await staffHrCall("rejectLeave", { requestId, reviewedBy, remarks });
}

export async function rejectRegularization(
  requestId: string,
  reviewedBy: string,
  remarks?: string | null,
): Promise<void> {
  await staffHrCall("rejectRegularization", { requestId, reviewedBy, remarks });
}

export async function deleteStaffRequest(table: string, id: string): Promise<void> {
  await staffHrCall("deleteStaffRequest", { table, id });
}

export async function revertPayroll(payrollId: string): Promise<void> {
  await staffHrCall("revertPayroll", { payrollId });
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
  await staffHrCall("addDeduction", { ...input });
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
  await staffHrCall("addAllowance", { ...input });
}

export async function approveAllPayroll(
  profileIds: string[],
  month: number,
  year: number,
): Promise<void> {
  await staffHrCall("approveAllPayroll", { profileIds, month, year });
}

export async function unlockPayroll(
  staffId: string,
  month: number,
  year: number,
  unlockedBy: string,
): Promise<void> {
  await staffHrCall("unlockPayroll", { staffId, month, year, unlockedBy });
}

export async function lockPayroll(
  staffId: string,
  month: number,
  year: number,
  lockedBy: string,
): Promise<void> {
  await staffHrCall("lockPayroll", { staffId, month, year, lockedBy });
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
  await staffHrCall("logHrAudit", { entry });
}
