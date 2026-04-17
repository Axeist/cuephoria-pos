/**
 * POST /api/platform/logout — clears the platform session cookie.
 */

import { j } from "../../src/server/adminApiUtils";
import { clearPlatformCookieHeader, getPlatformSession } from "../../src/server/platformApiUtils";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../../src/server/adminApiUtils";

export const config = { runtime: "edge" };

function service() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-platform-logout" } },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const session = await getPlatformSession(req);

  try {
    const supabase = service();
    if (session && supabase) {
      await supabase.from("audit_log").insert({
        actor_type: "platform_admin",
        actor_id: session.id,
        actor_label: session.email,
        action: "platform_admin.logout",
        meta: {},
      });
    }
  } catch (err) {
    console.warn("platform/logout: audit log write failed (non-fatal)", err);
  }

  return j({ ok: true }, 200, { "set-cookie": clearPlatformCookieHeader() });
}
