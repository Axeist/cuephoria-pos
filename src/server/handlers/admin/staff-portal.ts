import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { portalPinsMatch } from "../../staffPortalPin";
import { supabaseServiceClient } from "../../supabaseServer";
import { resolveOrgContext } from "../../orgContext";
import { assertEntitlement } from "../../lib/entitlements.js";

export const config = { runtime: "edge" };

function profilePayload(row: Record<string, unknown>) {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name ?? row.username,
    designation: row.designation ?? null,
    email: row.email ?? null,
    locationId: row.location_id ?? null,
    hourlyRate: row.hourly_rate ?? 0,
    monthlySalary: row.monthly_salary ?? 0,
    shiftStartTime: row.shift_start_time ?? null,
    shiftEndTime: row.shift_end_time ?? null,
    isActive: row.is_active !== false,
  };
}

export default async function handler(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const supabase = supabaseServiceClient("cuephoria-staff-portal");

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Could not resolve workspace." }, ctx.status);
    }
    const staffGate = await assertEntitlement(ctx, "staff_hr_enabled");
    if (staffGate) return staffGate;

    if (req.method === "GET") {
      const { data: profile, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("admin_user_id", sessionUser.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return j({ ok: false, error: error.message }, 500);
      if (!profile) {
        return j(
          {
            ok: true,
            hasProfile: false,
            message: "No staff profile is linked to your login. Ask your manager to complete setup in Settings.",
          },
          200,
        );
      }

      return j({ ok: true, hasProfile: true, profile: profilePayload(profile) }, 200);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const pin = String(body?.pin ?? "").trim();
      if (!pin) return j({ ok: false, error: "Enter your portal PIN." }, 400);

      const { data: profile, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("admin_user_id", sessionUser.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return j({ ok: false, error: error.message }, 500);
      if (!profile) {
        return j({ ok: false, error: "No staff profile linked to your account." }, 404);
      }

      if (!portalPinsMatch(profile.portal_pin as string, pin)) {
        return j({ ok: false, error: "Incorrect PIN. Check with your manager if you forgot it." }, 403);
      }

      return j({ ok: true, profile: profilePayload(profile) }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("staff-portal API error:", msg);
    return j({ ok: false, error: msg }, 500);
  }
}
