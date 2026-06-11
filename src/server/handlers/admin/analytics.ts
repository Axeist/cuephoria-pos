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

export const config = { runtime: "edge" };

const ALLOWED_RPCS = new Set([
  "get_business_summary_stats",
  "get_daily_revenue_series",
  "get_payment_breakdown_stats",
  "get_top_customers",
  "get_gaming_revenue_breakdown",
  "get_canteen_product_sales",
  "get_hourly_revenue_distribution",
  "get_product_performance",
  "get_bill_aggregate_metrics",
  "get_cafe_revenue_stats",
]);

function supabaseAdmin() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Missing Supabase server credentials");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-admin-analytics" } },
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
    const gate = assertWorkspacePermission(access, "dashboard.analytics.view");
    if (!gate.ok) return j({ ok: false, error: gate.error }, 403);

    const body = (await req.json().catch(() => ({}))) as {
      rpc?: string;
      params?: Record<string, unknown>;
    };
    const rpc = typeof body.rpc === "string" ? body.rpc.trim() : "";
    if (!rpc || !ALLOWED_RPCS.has(rpc)) return j({ ok: false, error: "RPC not allowed" }, 400);

    const params = body.params && typeof body.params === "object" ? body.params : {};
    const locationId = params.p_location_id ?? params.location_id;
    if (typeof locationId === "string" && locationId) {
      const supabase = supabaseAdmin();
      const owned = await assertLocationOwnedByOrg(supabase, locationId, ctx.organizationId);
      if (!owned.ok) return j({ ok: false, error: owned.message }, 404);
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.rpc(rpc, params as Record<string, unknown>);
    if (error) return j({ ok: false, error: error.message }, 500);
    return j({ ok: true, data }, 200);
  } catch (err: unknown) {
    console.error("[admin/analytics]", err);
    return j({ ok: false, error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
