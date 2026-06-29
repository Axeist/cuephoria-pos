import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { supabaseServiceClient } from "../../supabaseServer";
import { resolveOrgContext } from "../../orgContext";
import { assertEntitlement } from "../../lib/entitlements.js";
import { resolveStaffHourlyRate } from "../../../utils/staffEarnings.js";
import { matchStaffByPortalPin } from "../../lib/staffPinResolve.js";
import {
  createStaffPortalSessionToken,
  verifyAssertionToken,
  STAFF_PORTAL_SESSION_ACTION,
} from "../../lib/employeePinOps.js";
import * as ops from "../../lib/staffPortalOps";

export const config = { runtime: "edge" };

function profilePayload(row: Record<string, unknown>) {
  const monthlySalary = Number(row.monthly_salary ?? 0);
  const shiftStart = (row.shift_start_time as string | null) ?? null;
  const shiftEnd = (row.shift_end_time as string | null) ?? null;
  const defaultShiftHours =
    row.default_shift_hours != null ? Number(row.default_shift_hours) : null;

  const payFields = {
    hourly_rate: Number(row.hourly_rate ?? 0),
    monthly_salary: monthlySalary,
    shift_start_time: shiftStart,
    shift_end_time: shiftEnd,
    default_shift_hours: defaultShiftHours,
  };

  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name ?? row.username,
    designation: row.designation ?? null,
    email: row.email ?? null,
    locationId: row.location_id ?? null,
    hourlyRate: resolveStaffHourlyRate(payFields),
    monthlySalary,
    shiftStartTime: shiftStart,
    shiftEndTime: shiftEnd,
    defaultShiftHours,
    isActive: row.is_active !== false,
  };
}

type OpArgs = Record<string, unknown>;

const HANDLERS: Record<string, (profile: ops.PortalProfile, args: OpArgs) => Promise<unknown>> = {
  fetchDashboard: (p) => ops.fetchPortalDashboard(p.user_id, p.location_id),
  fetchFloorClockIns: (_p, a) =>
    ops.fetchFloorClockIns(String(a.organizationId ?? ""), (a.locationId as string | null) ?? null),
  clockIn: (p) => ops.clockIn(p),
  clockOut: (p, a) => ops.clockOut(p, String(a.attendanceId ?? "")),
  startBreak: (p, a) => ops.startBreak(p, String(a.attendanceId ?? "")),
  endBreak: (p, a) => ops.endBreak(p, String(a.attendanceId ?? "")),
  deleteLeave: (p, a) => ops.deleteLeave(p, String(a.leaveId ?? "")),
  submitLeave: (p, a) =>
    ops.submitLeave(p, {
      startDate: String(a.startDate ?? ""),
      endDate: String(a.endDate ?? ""),
      leaveType: String(a.leaveType ?? ""),
      reason: String(a.reason ?? ""),
    }),
  checkRegularizationLimit: (p, a) =>
    ops.checkRegularizationLimit(p, Number(a.month), Number(a.year)),
  submitRegularization: (p, a) =>
    ops.submitRegularization(p, {
      date: String(a.date ?? ""),
      regularizationType: String(a.regularizationType ?? ""),
      requestedClockIn: (a.requestedClockIn as string | null) ?? null,
      requestedClockOut: (a.requestedClockOut as string | null) ?? null,
      leaveType: (a.leaveType as string | null) ?? null,
      reason: String(a.reason ?? ""),
    }),
  fetchOvertimePickerData: (p, a) =>
    ops.fetchOvertimePickerData(p, Number(a.month), Number(a.year)),
  submitOvertime: (p, a) =>
    ops.submitOvertime(p, {
      date: String(a.date ?? ""),
      overtimeHours: Number(a.overtimeHours),
      reason: String(a.reason ?? ""),
      overtimeAmount: a.overtimeAmount != null ? Number(a.overtimeAmount) : undefined,
    }),
  calculateDoubleShiftAllowance: (p, a) =>
    ops.calculateDoubleShiftAllowance(
      p,
      String(a.coveredStaffId ?? ""),
      Number(a.coveredShiftHours),
      String(a.date ?? ""),
    ),
  submitDoubleShift: (p, a) =>
    ops.submitDoubleShift(p, {
      date: String(a.date ?? ""),
      coveredStaffId: String(a.coveredStaffId ?? ""),
      originalShiftStart: (a.originalShiftStart as string | null) ?? null,
      originalShiftEnd: (a.originalShiftEnd as string | null) ?? null,
      coveredShiftStart: (a.coveredShiftStart as string | null) ?? null,
      coveredShiftEnd: (a.coveredShiftEnd as string | null) ?? null,
      totalHours: Number(a.totalHours),
      reason: String(a.reason ?? ""),
    }),
};

async function resolveLinkedProfileRow(adminUserId: string) {
  const supabase = supabaseServiceClient("cuephoria-staff-portal");
  const { data: profile, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("admin_user_id", adminUserId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return profile;
}

function verifyPortalSessionToken(
  token: string,
  adminUserId: string,
): { staffId: string } | null {
  return verifyAssertionToken(token, STAFF_PORTAL_SESSION_ACTION, adminUserId);
}

async function resolveActingPortalProfile(opts: {
  sessionUserId: string;
  organizationId: string;
  portalSessionToken?: string | null;
}): Promise<ops.PortalProfile> {
  if (opts.portalSessionToken) {
    const verified = verifyPortalSessionToken(opts.portalSessionToken, opts.sessionUserId);
    if (verified) {
      const profile = await ops.resolvePortalProfileByStaffId(verified.staffId);
      if (profile) {
        await ops.assertProfileInOrg(profile, opts.organizationId);
        return profile;
      }
    }
  }

  const linked = await ops.resolvePortalProfile(opts.sessionUserId);
  if (linked) {
    await ops.assertProfileInOrg(linked, opts.organizationId);
    return linked;
  }

  throw new Error("Enter your portal PIN to continue.");
}

export default async function handler(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Could not resolve workspace." }, ctx.status);
    }
    const staffGate = await assertEntitlement(ctx, "staff_hr_enabled");
    if (staffGate) return staffGate;

    const url = new URL(req.url);
    const locationId = url.searchParams.get("locationId");

    if (req.method === "GET") {
      const linked = await resolveLinkedProfileRow(sessionUser.id);
      const floorClockIns = await ops.fetchFloorClockIns(
        ctx.organizationId,
        locationId || null,
      );

      if (!linked) {
        return j(
          {
            ok: true,
            hasProfile: false,
            kioskMode: true,
            floorClockIns,
            message: "Enter any staff portal PIN to clock in — works on a shared floor login.",
          },
          200,
        );
      }

      const portalProfile = await ops.resolvePortalProfile(sessionUser.id);
      if (!portalProfile) {
        return j({ ok: true, hasProfile: false, kioskMode: true, floorClockIns }, 200);
      }
      await ops.assertProfileInOrg(portalProfile, ctx.organizationId);

      return j(
        {
          ok: true,
          hasProfile: true,
          kioskMode: true,
          floorClockIns,
          profile: profilePayload(linked),
        },
        200,
      );
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as {
        pin?: string;
        op?: string;
        args?: OpArgs;
        portalSessionToken?: string;
      };

      if (typeof body.pin === "string" && body.pin.trim() && !body.op) {
        const pin = body.pin.trim();
        const supabase = supabaseServiceClient("staff-portal-pin");
        const matched = await matchStaffByPortalPin(supabase, ctx.organizationId, pin, {
          locationId: locationId || null,
          clockedInOnly: false,
        });

        if (matched.ok === false) {
          return j({ ok: false, error: matched.error, code: matched.code }, 403);
        }

        const fullProfile = await ops.resolvePortalProfileByStaffId(String(matched.profile.user_id));
        if (!fullProfile) {
          return j({ ok: false, error: "Staff profile not found." }, 404);
        }
        await ops.assertProfileInOrg(fullProfile, ctx.organizationId);

        const { data: row } = await supabase
          .from("staff_profiles")
          .select("*")
          .eq("user_id", matched.profile.user_id)
          .maybeSingle();

        const portalSessionToken = createStaffPortalSessionToken({
          staffId: String(matched.profile.user_id),
          adminUserId: sessionUser.id,
          organizationId: ctx.organizationId,
        });

        return j(
          {
            ok: true,
            profile: profilePayload(row ?? {}),
            portalSessionToken,
          },
          200,
        );
      }

      const op = typeof body.op === "string" ? body.op.trim() : "";
      if (!op) return j({ ok: false, error: "Missing op or pin." }, 400);

      const portalProfile = await resolveActingPortalProfile({
        sessionUserId: sessionUser.id,
        organizationId: ctx.organizationId,
        portalSessionToken: body.portalSessionToken ?? null,
      });

      const run = HANDLERS[op];
      if (!run) return j({ ok: false, error: `Unknown staff portal op: ${op}` }, 400);

      const args = body.args && typeof body.args === "object" ? body.args : {};
      if (op === "fetchFloorClockIns") {
        args.organizationId = ctx.organizationId;
      }
      const data = await run(portalProfile, args);
      return j({ ok: true, data }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("staff-portal API error:", msg);
    return j({ ok: false, error: msg }, 500);
  }
}
