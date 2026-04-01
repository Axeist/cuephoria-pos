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
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    // GET: fetch booking settings for a branch (?location_id=uuid)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const locationId = url.searchParams.get("location_id");
      let q = supabase.from("booking_settings").select("setting_key, setting_value");
      if (locationId) {
        q = q.eq("location_id", locationId);
      }
      const { data, error } = await q;

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true, settings: data ?? [] }, 200);
    }

    // PUT: upsert a single booking setting
    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const { setting_key, setting_value, description, location_id } = body;

      if (!setting_key) return j({ ok: false, error: "Missing setting_key" }, 400);
      if (setting_value === undefined) return j({ ok: false, error: "Missing setting_value" }, 400);
      if (!location_id) return j({ ok: false, error: "Missing location_id" }, 400);

      const { error } = await supabase
        .from("booking_settings")
        .upsert(
          {
            setting_key,
            setting_value,
            location_id,
            ...(description ? { description } : {}),
          },
          { onConflict: "location_id,setting_key" }
        );

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: any) {
    console.error("Booking settings API error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}
