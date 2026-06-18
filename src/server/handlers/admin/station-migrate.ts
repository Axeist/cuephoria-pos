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
import { assertLocationOwnedByOrg } from "../../lib/payment-checkout-guards.js";
import { isDenied } from "../../lib/resultGuards";

export const config = { runtime: "edge" };

function supabaseAdmin() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Missing Supabase server credentials");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-admin-station-migrate" } },
  });
}

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

    const access = await resolveWorkspaceAccess(ctx.supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });
    const gate = assertWorkspacePermission(access, "stations.configure");
    if (isDenied(gate)) return j({ ok: false, error: gate.error }, 403);

    const body = (await req.json().catch(() => ({}))) as {
      oldStationIds?: string[];
      newStationId?: string;
      migratedBy?: string | null;
      locationId?: string;
    };
    const oldStationIds = Array.isArray(body.oldStationIds) ? body.oldStationIds : [];
    const newStationId = typeof body.newStationId === "string" ? body.newStationId.trim() : "";
    const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
    if (!newStationId || !locationId || oldStationIds.length === 0) {
      return j({ ok: false, error: "Missing migration parameters" }, 400);
    }

    const supabase = supabaseAdmin();
    const owned = await assertLocationOwnedByOrg(supabase, locationId, ctx.organizationId);
    if (isDenied(owned)) return j({ ok: false, error: owned.message }, 404);

    const { data, error } = await supabase.rpc("migrate_station_data", {
      p_old_ids: oldStationIds,
      p_new_station_id: newStationId,
      p_migrated_by: body.migratedBy ?? null,
    });

    if (error) return j({ ok: false, error: error.message }, 500);
    return j({ ok: true, data }, 200);
  } catch (err: unknown) {
    console.error("[admin/station-migrate]", err);
    return j({ ok: false, error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
