import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";

export const config = { runtime: "edge" };

function getSupabaseUrl() {
  const v = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  if (!v) throw new Error("Missing env: SUPABASE_URL / VITE_SUPABASE_URL");
  return v;
}

function getSupabaseServiceRoleKey() {
  const v = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!v) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return v;
}

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    // Slice 5 — resolve the caller's organization(s). Super admins still
    // bypass per-user location linking, BUT must be scoped to the orgs they
    // actually belong to; previously a super-admin of tenant X would see
    // tenant Y's branches, which broke multi-tenant isolation.
    const { data: memberships, error: memErr } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("admin_user_id", sessionUser.id);
    if (memErr) return j({ ok: false, error: memErr.message }, 500);
    const orgIds = [
      ...new Set(
        (memberships || []).map((r) => r.organization_id).filter(Boolean) as string[],
      ),
    ];

    // Legacy fallback: a super admin without any org membership row is the
    // Cuephoria bootstrap account — resolve to the internal org so the live
    // operation keeps working. Never used to widen visibility beyond a single
    // org, only to repair a missing membership for the internal account.
    if (!orgIds.length && sessionUser.isSuperAdmin) {
      const { data: cue } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", "cuephoria")
        .maybeSingle();
      if (cue?.id) orgIds.push(cue.id);
    }

    if (!orgIds.length) {
      return j({ ok: true, locations: [] }, 200);
    }

    if (sessionUser.isSuperAdmin) {
      const { data: allLocs, error: allLocErr } = await supabase
        .from("locations")
        .select("id, name, slug, short_code, sort_order, is_active")
        .in("organization_id", orgIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (allLocErr) return j({ ok: false, error: allLocErr.message }, 500);
      return j({ ok: true, locations: allLocs || [] }, 200);
    }

    const { data: links, error: linkErr } = await supabase
      .from("admin_user_locations")
      .select("location_id")
      .eq("admin_user_id", sessionUser.id);

    if (linkErr) return j({ ok: false, error: linkErr.message }, 500);

    const ids = [...new Set((links || []).map((r) => r.location_id).filter(Boolean))] as string[];
    if (!ids.length) {
      return j({ ok: true, locations: [] }, 200);
    }

    // Still restrict to the caller's org(s) — even if admin_user_locations
    // somehow contains a stale cross-org link, we never leak it.
    const { data: locs, error: locErr } = await supabase
      .from("locations")
      .select("id, name, slug, short_code, sort_order, is_active")
      .in("id", ids)
      .in("organization_id", orgIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (locErr) return j({ ok: false, error: locErr.message }, 500);

    return j({ ok: true, locations: locs || [] }, 200);
  } catch (err: unknown) {
    console.error("locations API error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
