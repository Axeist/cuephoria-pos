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
    if (!sessionUser?.isAdmin) return j({ ok: false, error: "Unauthorized" }, 401);

    const serviceKey = getSupabaseServiceRoleKey();
    if (!serviceKey) {
      return j(
        {
          ok: false,
          error:
            "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY (required for admin user management).",
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
        .from("admin_users")
        .select("id, username, is_admin")
        .order("is_admin", { ascending: false })
        .order("username", { ascending: true });

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true, users: data ?? [] }, 200);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const isAdmin = !!body?.isAdmin;

      if (!username || !password) return j({ ok: false, error: "Missing username/password" }, 400);

      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing?.id) return j({ ok: false, error: "Username already exists" }, 409);

      const { error } = await supabase.from("admin_users").insert({
        username,
        password, // TODO: store hashed secret (pgcrypto) instead of plaintext
        is_admin: isAdmin,
      });

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = String(body?.id || "");
      const username = typeof body?.username === "string" ? body.username.trim() : undefined;

      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      const update: Record<string, any> = {};
      if (username) update.username = username;

      if (Object.keys(update).length === 0) return j({ ok: true }, 200);

      const { error } = await supabase.from("admin_users").update(update).eq("id", id);
      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      const { error } = await supabase.from("admin_users").delete().eq("id", id);
      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: any) {
    console.error("Admin users API error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

