import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, cookieSerialize, getEnv, j, signAdminSession } from "../../src/server/adminApiUtils";

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
  // Required: server-side privileged access for admin login/logs
  return getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const serviceKey = getSupabaseServiceRoleKey();
    if (!serviceKey) {
      return j(
        {
          ok: false,
          error:
            "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY (required for admin auth).",
        },
        500
      );
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    const payload = await req.json().catch(() => ({}));
    const username = String(payload?.username || "").trim();
    const password = String(payload?.password || "");
    const isAdminLogin = !!payload?.isAdminLogin;
    const metadata = payload?.metadata ?? {};

    if (!username || !password) {
      return j({ ok: false, error: "Missing username/password" }, 400);
    }

    const { data: userRow, error: userErr } = await supabase
      .from("admin_users")
      .select("id, username, is_admin, password")
      .eq("username", username)
      .eq("is_admin", isAdminLogin)
      .maybeSingle();

    const loginSuccess = !!(userRow && !userErr && userRow.password === password);

    // Best-effort logging; don't fail login on logging errors.
    try {
      await supabase.from("login_logs").insert({
        username,
        is_admin: isAdminLogin,
        login_success: loginSuccess,
        ip_address: metadata.ip || null,
        city: metadata.city || null,
        region: metadata.region || null,
        country: metadata.country || null,
        timezone: metadata.timezone || null,
        isp: metadata.isp || null,
        browser: metadata.browser || null,
        browser_version: metadata.browserVersion || null,
        os: metadata.os || null,
        os_version: metadata.osVersion || null,
        device_type: metadata.deviceType || null,
        device_model: metadata.deviceModel || null,
        device_vendor: metadata.deviceVendor || null,
        user_agent: metadata.userAgent || null,
        latitude: metadata.latitude || null,
        longitude: metadata.longitude || null,
        location_accuracy: metadata.locationAccuracy || null,
        selfie_url: metadata.selfieUrl || null,
        screen_resolution: metadata.screenResolution || null,
        color_depth: metadata.colorDepth || null,
        pixel_ratio: metadata.pixelRatio || null,
        cpu_cores: metadata.cpuCores || null,
        device_memory: metadata.deviceMemory || null,
        touch_support: metadata.touchSupport || null,
        connection_type: metadata.connectionType || null,
        battery_level: metadata.batteryLevel || null,
        canvas_fingerprint: metadata.canvasFingerprint || null,
        installed_fonts: metadata.installedFonts || null,
        login_time: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to write login log:", e);
    }

    if (!loginSuccess || !userRow) {
      return j({ ok: true, success: false }, 200);
    }

    const sessionToken = await signAdminSession(
      { id: userRow.id, username: userRow.username, isAdmin: !!userRow.is_admin },
      8 * 60 * 60
    );

    const setCookie = cookieSerialize(ADMIN_SESSION_COOKIE, sessionToken, {
      maxAgeSeconds: 8 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
    });

    return j(
      {
        ok: true,
        success: true,
        user: { id: userRow.id, username: userRow.username, isAdmin: !!userRow.is_admin },
      },
      200,
      { "set-cookie": setCookie }
    );
  } catch (err: any) {
    console.error("Admin login error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

