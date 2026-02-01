import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";

export const config = { runtime: "edge" };

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getSupabaseUrl() {
  return getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || need("VITE_SUPABASE_URL");
}

function getSupabaseServiceRoleKey() {
  return getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
}

export default async function handler(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser?.isAdmin) {
      return j({ ok: false, error: "Unauthorized" }, 401);
    }

    const serviceKey = getSupabaseServiceRoleKey();
    if (!serviceKey) {
      return j(
        {
          ok: false,
          error:
            "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY (required for admin logs).",
        },
        500
      );
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("login_logs")
        .select("*")
        .order("login_time", { ascending: false })
        .limit(100);

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true, logs: data ?? [] }, 200);
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      const { error } = await supabase.from("login_logs").delete().eq("id", id);
      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: any) {
    console.error("Login logs API error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

