import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";
import { hashPassword } from "../../src/server/passwordUtils";

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
        { ok: false, error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY." },
        500
      );
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    // ─── GET ─────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const { data: users, error: usersErr } = await supabase
        .from("admin_users")
        .select("id, username, is_admin, is_super_admin")
        .order("is_admin", { ascending: false })
        .order("username", { ascending: true });

      if (usersErr) return j({ ok: false, error: usersErr.message }, 500);

      const userIds = (users ?? []).map((u) => u.id);

      // Fetch location assignments for all users in one query
      const { data: links } = await supabase
        .from("admin_user_locations")
        .select("admin_user_id, location_id")
        .in("admin_user_id", userIds);

      // Fetch all location names for display
      const { data: allLocs } = await supabase
        .from("locations")
        .select("id, name, slug, short_code")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const locMap = Object.fromEntries((allLocs ?? []).map((l) => [l.id, l]));

      // Build per-user location list
      const userLocations: Record<string, typeof allLocs> = {};
      for (const link of links ?? []) {
        if (!userLocations[link.admin_user_id]) userLocations[link.admin_user_id] = [];
        const loc = locMap[link.location_id];
        if (loc) userLocations[link.admin_user_id]!.push(loc);
      }

      const result = (users ?? []).map((u) => ({
        id: u.id,
        username: u.username,
        isAdmin: u.is_admin,
        isSuperAdmin: u.is_super_admin,
        locations: userLocations[u.id] ?? [],
      }));

      return j({ ok: true, users: result, allLocations: allLocs ?? [] }, 200);
    }

    // ─── POST (create) ───────────────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const isAdmin = !!body?.isAdmin;
      // Only a super-admin can create another super-admin
      const isSuperAdmin = sessionUser.isSuperAdmin ? !!body?.isSuperAdmin : false;
      const locationIds: string[] = Array.isArray(body?.locationIds) ? body.locationIds : [];

      if (!username || !password) return j({ ok: false, error: "Missing username/password" }, 400);
      if (password.length < 8) return j({ ok: false, error: "Password must be at least 8 characters." }, 400);
      if (!isSuperAdmin && locationIds.length === 0)
        return j({ ok: false, error: "Assign at least one branch to this user" }, 400);

      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing?.id) return j({ ok: false, error: "Username already exists" }, 409);

      const passwordHash = await hashPassword(password);

      const { data: newUser, error: insertErr } = await supabase
        .from("admin_users")
        .insert({
          username,
          password: null,
          password_hash: passwordHash,
          password_updated_at: new Date().toISOString(),
          is_admin: isAdmin,
          is_super_admin: isSuperAdmin,
        })
        .select("id")
        .single();

      if (insertErr || !newUser) return j({ ok: false, error: insertErr?.message ?? "Insert failed" }, 500);

      // Assign locations
      const locs = isSuperAdmin
        ? await (async () => {
            const { data } = await supabase.from("locations").select("id").eq("is_active", true);
            return (data ?? []).map((l) => l.id);
          })()
        : locationIds;

      if (locs.length) {
        const { error: linkErr } = await supabase.from("admin_user_locations").insert(
          locs.map((lid) => ({ admin_user_id: newUser.id, location_id: lid }))
        );
        if (linkErr) {
          // Roll back user creation if linking fails
          await supabase.from("admin_users").delete().eq("id", newUser.id);
          return j({ ok: false, error: linkErr.message }, 500);
        }
      }

      return j({ ok: true }, 200);
    }

    // ─── PATCH (update) ──────────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = String(body?.id || "");
      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      const update: Record<string, any> = {};
      if (typeof body?.username === "string" && body.username.trim()) {
        update.username = body.username.trim();
      }
      if (typeof body?.newPassword === "string" && body.newPassword.trim()) {
        const newPw = body.newPassword.trim();
        if (newPw.length < 8) {
          return j({ ok: false, error: "Password must be at least 8 characters." }, 400);
        }
        update.password = null;
        update.password_hash = await hashPassword(newPw);
        update.password_updated_at = new Date().toISOString();
      }
      // Only super-admins can change super-admin status
      if (sessionUser.isSuperAdmin && typeof body?.isSuperAdmin === "boolean") {
        update.is_super_admin = body.isSuperAdmin;
      }

      if (Object.keys(update).length > 0) {
        const { error: updateErr } = await supabase.from("admin_users").update(update).eq("id", id);
        if (updateErr) return j({ ok: false, error: updateErr.message }, 500);
      }

      // Update location assignments if provided
      if (Array.isArray(body?.locationIds)) {
        const locationIds: string[] = body.locationIds;

        // Delete existing assignments for this user
        await supabase.from("admin_user_locations").delete().eq("admin_user_id", id);

        // If super-admin, assign all locations; otherwise use provided list
        const isSuperAdminNow = update.is_super_admin ?? false;
        const locs = isSuperAdminNow
          ? await (async () => {
              const { data } = await supabase.from("locations").select("id").eq("is_active", true);
              return (data ?? []).map((l) => l.id);
            })()
          : locationIds;

        if (locs.length) {
          await supabase.from("admin_user_locations").insert(
            locs.map((lid) => ({ admin_user_id: id, location_id: lid }))
          );
        }
      }

      return j({ ok: true }, 200);
    }

    // ─── DELETE ──────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      // admin_user_locations rows are cascade-deleted by FK
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
