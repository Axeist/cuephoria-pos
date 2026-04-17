/**
 * POST /api/platform/bootstrap
 *
 * One-shot endpoint to seed the very first Cuetronix platform admin.
 * Returns 404 once any `platform_admins` row exists, and always requires a
 * pre-shared token via the `X-Bootstrap-Token` header.
 *
 * Flow:
 *   1. Operator sets `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` in env (Vercel).
 *   2. Curl this endpoint with the token + desired credentials.
 *   3. Delete (or rotate) the token env var after first admin exists.
 */

import { createClient } from "@supabase/supabase-js";
import { j, getEnv } from "../../adminApiUtils";
import { hashPassword } from "../../passwordUtils";
import { getBootstrapToken } from "../../platformApiUtils";

export const config = { runtime: "edge" };

function service() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Supabase service env vars missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-platform-bootstrap" } },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const bootstrapToken = getBootstrapToken();
  if (!bootstrapToken) {
    return j({ ok: false, error: "Bootstrap disabled on this deployment." }, 503);
  }

  const presented = req.headers.get("x-bootstrap-token");
  if (presented !== bootstrapToken) {
    return j({ ok: false, error: "Forbidden" }, 403);
  }

  let body: { email?: string; password?: string; displayName?: string } = {};
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const displayName = (body.displayName || "").trim() || null;

  if (!email.includes("@") || email.length > 320) {
    return j({ ok: false, error: "Valid email is required." }, 400);
  }
  if (password.length < 12) {
    return j({ ok: false, error: "Password must be at least 12 characters." }, 400);
  }

  try {
    const supabase = service();

    const { count, error: countErr } = await supabase
      .from("platform_admins")
      .select("*", { count: "exact", head: true });

    if (countErr) return j({ ok: false, error: countErr.message }, 500);
    if ((count ?? 0) > 0) {
      return j({ ok: false, error: "Platform admin already exists. Bootstrap closed." }, 404);
    }

    const passwordHash = await hashPassword(password);

    const { data: row, error: insErr } = await supabase
      .from("platform_admins")
      .insert({
        email,
        password_hash: passwordHash,
        display_name: displayName,
        is_active: true,
      })
      .select("id, email, display_name, created_at")
      .single();

    if (insErr) return j({ ok: false, error: insErr.message }, 500);

    await supabase.from("audit_log").insert({
      actor_type: "system",
      actor_label: "platform_bootstrap",
      action: "platform_admin.created",
      target_type: "platform_admin",
      target_id: row.id,
      meta: { email, via: "bootstrap" },
    });

    return j({ ok: true, admin: row }, 201);
  } catch (err: unknown) {
    console.error("platform/bootstrap error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
