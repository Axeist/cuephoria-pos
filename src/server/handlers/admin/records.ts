import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { assertWorkspacePermission, resolveWorkspaceAccess } from "../../lib/workspacePermissions";
import {
  deleteBillRecord,
  deleteBookingRecord,
  deleteProductRecord,
} from "../../lib/adminRecordDeletes";
import { isDenied } from "../../lib/resultGuards";

export const config = { runtime: "edge" };

function supabaseAdmin() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Missing Supabase server credentials");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-admin-records" } },
  });
}

type DeleteBody = {
  type?: "product" | "bill" | "booking";
  id?: string;
  locationId?: string;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "DELETE") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Could not resolve workspace." }, ctx.status);
    }

    const access = await resolveWorkspaceAccess(ctx.supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    const body = (await req.json().catch(() => ({}))) as DeleteBody;
    const type = body.type;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!type || !id) return j({ ok: false, error: "Missing type or id" }, 400);

    const supabase = supabaseAdmin();

    if (type === "product") {
      const perm = assertWorkspacePermission(access, "products.delete");
      if (isDenied(perm)) return j({ ok: false, error: perm.error }, 403);
      const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
      if (!locationId) return j({ ok: false, error: "Missing locationId" }, 400);
      const result = await deleteProductRecord(supabase, {
        organizationId: ctx.organizationId,
        productId: id,
        locationId,
      });
      if (isDenied(result)) return j({ ok: false, error: result.error }, result.status);
      return j({ ok: true }, 200);
    }

    if (type === "bill") {
      const deletePerm = assertWorkspacePermission(access, "reports.delete_record");
      const voidPerm = assertWorkspacePermission(access, "pos.void_bill");
      if (isDenied(deletePerm) && isDenied(voidPerm)) {
        return j({ ok: false, error: deletePerm.error }, 403);
      }
      const result = await deleteBillRecord(supabase, {
        organizationId: ctx.organizationId,
        billId: id,
      });
      if (isDenied(result)) return j({ ok: false, error: result.error }, result.status);
      return j({ ok: true }, 200);
    }

    if (type === "booking") {
      const perm = assertWorkspacePermission(access, "bookings.cancel");
      if (isDenied(perm)) return j({ ok: false, error: perm.error }, 403);
      const result = await deleteBookingRecord(supabase, {
        organizationId: ctx.organizationId,
        bookingId: id,
      });
      if (isDenied(result)) return j({ ok: false, error: result.error }, result.status);
      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: "Invalid type" }, 400);
  } catch (err: unknown) {
    console.error("[admin/records]", err);
    return j({ ok: false, error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
