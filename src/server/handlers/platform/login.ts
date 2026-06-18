/**
 * POST /api/platform/login
 *
 * Body: { email, password }
 * Sets the `cuetronix_platform_session` cookie on success.
 */

import { createClient } from "@supabase/supabase-js";
import { j, getEnv } from "../../adminApiUtils";
import { verifyPassword } from "../../passwordUtils";
import {
  platformCookieHeader,
  rateLimit,
  signPlatformSession,
  clientIpFromRequest,
  PLATFORM_SESSION_MAX_AGE,
} from "../../platformApiUtils";

export const config = { runtime: "edge" };

function service() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Supabase service env vars missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-platform-login" } },
  });
}

const GENERIC_ERROR = "Invalid email or password.";

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const ip = clientIpFromRequest(req);
  const rl = rateLimit(`plogin:${ip}`, { windowMs: 60_000, max: 6, blockMs: 10 * 60_000 });
  if (!rl.allowed) {
    return j(
      { ok: false, error: "Too many attempts. Try again later." },
      429,
      { "retry-after": String(rl.retryAfterSec) },
    );
  }

  let body: { email?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return j({ ok: false, error: GENERIC_ERROR }, 401);
  }

  try {
    const supabase = service();

    const { data: admin, error } = await supabase
      .from("platform_admins")
      .select("id, email, password_hash, display_name, is_active")
      .eq("email", email)
      .maybeSingle();

    if (error) return j({ ok: false, error: error.message }, 500);
    if (!admin || !admin.is_active) return j({ ok: false, error: GENERIC_ERROR }, 401);

    const ok = await verifyPassword(password, admin.password_hash);
    if (!ok) {
      await supabase.from("audit_log").insert({
        actor_type: "system",
        actor_label: "platform_login",
        action: "platform_admin.login_failed",
        target_type: "platform_admin",
        target_id: admin.id,
        meta: { email, reason: "bad_password" },
        ip_address: ip,
        user_agent: req.headers.get("user-agent"),
      });
      return j({ ok: false, error: GENERIC_ERROR }, 401);
    }

    const token = await signPlatformSession(
      { id: admin.id, email: admin.email, displayName: admin.display_name },
      PLATFORM_SESSION_MAX_AGE,
    );

    await supabase.from("platform_admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: admin.id,
      actor_label: admin.email,
      action: "platform_admin.login_succeeded",
      target_type: "platform_admin",
      target_id: admin.id,
      meta: {},
      ip_address: ip,
      user_agent: req.headers.get("user-agent"),
    });

    return j(
      {
        ok: true,
        admin: {
          id: admin.id,
          email: admin.email,
          displayName: admin.display_name,
        },
      },
      200,
      { "set-cookie": platformCookieHeader(token) },
    );
  } catch (err: unknown) {
    console.error("platform/login error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
