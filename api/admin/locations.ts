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

    // Super admins bypass the per-user location table and see every active location.
    if (sessionUser.isSuperAdmin) {
      const { data: allLocs, error: allLocErr } = await supabase
        .from("locations")
        .select("id, name, slug, short_code, sort_order, is_active")
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

    const { data: locs, error: locErr } = await supabase
      .from("locations")
      .select("id, name, slug, short_code, sort_order, is_active")
      .in("id", ids)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (locErr) return j({ ok: false, error: locErr.message }, 500);

    return j({ ok: true, locations: locs || [] }, 200);
  } catch (err: unknown) {
    console.error("locations API error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
