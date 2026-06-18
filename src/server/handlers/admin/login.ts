import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, cookieSerialize, getEnv, j, signAdminSession } from "../../adminApiUtils";
import { appBaseUrl, sendEmail } from "../../email";
import {
  constantTimeStringEquals,
  hashPassword,
  verifyPassword,
} from "../../passwordUtils";
import { issueEmailToken } from "../../emailTokens";
import { verifyTotpCode } from "../../totp";

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

/**
 * Admin login with transparent password-hash migration.
 *
 * A user row can be in one of three states:
 *   (a) hash-only  — `password_hash` is set; `password` is NULL.
 *   (b) legacy     — `password_hash` is NULL; `password` holds plaintext.
 *   (c) transitional — both populated (rare; tolerated during rollout).
 *
 * Verification order:
 *   1. If password_hash present, verify against it. On success, also clear
 *      any stale plaintext lingering on the row. Never consult legacy.
 *   2. Otherwise compare the submitted password to the legacy plaintext
 *      using a constant-time comparator. On success, hash + write back and
 *      NULL out the plaintext.
 *
 * Either path lands the user with a session cookie; they never know the
 * migration happened.
 */
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
        500,
      );
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    const payload = await req.json().catch(() => ({}));
    const rawIdentifier = String(payload?.email ?? payload?.username ?? "").trim();
    const password = String(payload?.password || "");
    const isAdminLogin = !!payload?.isAdminLogin;
    const metadata = payload?.metadata ?? {};
    const totpCode = typeof payload?.totpCode === "string" ? payload.totpCode.trim() : "";
    const backupCode = typeof payload?.backupCode === "string" ? payload.backupCode.trim() : "";

    if (!rawIdentifier || !password) {
      return j({ ok: false, error: "Missing email/password" }, 400);
    }

    const loginByEmail = rawIdentifier.includes("@");
    const emailNorm = loginByEmail ? rawIdentifier.toLowerCase() : "";

    let userRow: {
      id: string;
      username: string;
      is_admin: boolean | null;
      is_super_admin: boolean | null;
      email: string | null;
      display_name: string | null;
      email_verified_at: string | null;
      password: string | null;
      password_hash: string | null;
      must_change_password: boolean | null;
      password_version: number | null;
    } | null = null;
    let userErr: { message: string } | null = null;

    if (loginByEmail) {
      const r = await supabase
        .from("admin_users")
        .select(
          "id, username, is_admin, is_super_admin, email, display_name, email_verified_at, password, password_hash, must_change_password, password_version",
        )
        .eq("email", emailNorm)
        .eq("is_admin", isAdminLogin)
        .maybeSingle();
      userRow = r.data;
      userErr = r.error;
    } else {
      const r = await supabase
        .from("admin_users")
        .select(
          "id, username, is_admin, is_super_admin, email, display_name, email_verified_at, password, password_hash, must_change_password, password_version",
        )
        .eq("username", rawIdentifier)
        .eq("is_admin", isAdminLogin)
        .maybeSingle();
      userRow = r.data;
      userErr = r.error;
    }

    let loginSuccess = false;
    let usedLegacy = false;

    if (userRow && !userErr) {
      if (userRow.password_hash) {
        // Canonical path.
        loginSuccess = await verifyPassword(password, userRow.password_hash).catch(() => false);
      } else if (userRow.password) {
        // Legacy plaintext fallback — constant-time compare, then lazy-migrate.
        loginSuccess = constantTimeStringEquals(password, userRow.password);
        usedLegacy = loginSuccess;
      } else {
        // Row has no credential at all — cannot authenticate.
        loginSuccess = false;
      }
    }

    // Best-effort logging; don't fail login on logging errors.
    try {
      await supabase.from("login_logs").insert({
        username: loginByEmail ? emailNorm : rawIdentifier,
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

    if (userRow.email && !userRow.email_verified_at) {
      let emailSent = false;
      let emailSkipped = false;
      let dispatchError: string | null = null;
      try {
        const token = await issueEmailToken({
          supabase,
          adminUserId: userRow.id,
          email: userRow.email,
          purpose: "verify_email",
          ttlMinutes: 60 * 24,
          requestedIp: metadata.ip || req.headers.get("x-forwarded-for") || null,
          requestedUa: metadata.userAgent || req.headers.get("user-agent") || null,
        });
        const base = appBaseUrl();
        const verifyUrl = `${base}/account/verify-email?token=${encodeURIComponent(token.token)}`;
        const sent = await sendEmail({
          kind: "verify_email",
          to: userRow.email,
          vars: {
            appBaseUrl: base,
            displayName: userRow.display_name || userRow.username,
            verifyUrl,
            expiresInMinutes: 60 * 24,
          },
          adminUserId: userRow.id,
          supabase,
        });
        emailSent = !!sent.ok;
        emailSkipped = !!sent.skipped;
        if (!sent.ok && !sent.skipped) dispatchError = sent.error || "Could not send verification email.";
      } catch (err) {
        dispatchError = (err as Error)?.message || "Could not send verification email.";
      }

      return j(
        {
          ok: true,
          success: false,
          emailVerificationRequired: true,
          emailSent,
          emailSkipped,
          error: dispatchError
            ? `Email not verified and we couldn't send a new verification email: ${dispatchError}`
            : "Email not verified. We've sent a fresh verification link to your inbox.",
        },
        200,
      );
    }

    // Hard block tenant sign-in when the account has no active workspace
    // membership (e.g. user removed or org deleted).
    const { data: memberships, error: membershipsErr } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("admin_user_id", userRow.id)
      .limit(1);
    if (membershipsErr) {
      console.error("Failed to validate org membership during login:", membershipsErr);
      return j({ ok: false, error: "Could not validate workspace access." }, 500);
    }
    if (!memberships || memberships.length === 0) {
      return j(
        {
          ok: true,
          success: false,
          error: "No active workspace access. Contact your workspace owner.",
        },
        200,
      );
    }

    // ── Second factor check. If this user enrolled in TOTP, demand either
    //    a valid TOTP code or a single-use backup code before issuing the
    //    session cookie. A user who hasn't enrolled is unaffected.
    const { data: totpRow } = await supabase
      .from("admin_user_totp")
      .select("id, secret, last_counter, confirmed_at")
      .eq("admin_user_id", userRow.id)
      .maybeSingle();

    const totpEnabled = !!totpRow?.confirmed_at;
    if (totpEnabled) {
      if (!totpCode && !backupCode) {
        return j({ ok: true, success: false, requireTotp: true }, 200);
      }

      let totpOk = false;
      if (totpCode) {
        const counter = await verifyTotpCode(totpRow.secret, totpCode, {
          lastCounter: totpRow.last_counter,
        });
        if (counter !== null) {
          totpOk = true;
          await supabase
            .from("admin_user_totp")
            .update({ last_counter: counter, last_used_at: new Date().toISOString() })
            .eq("id", totpRow.id);
        }
      } else if (backupCode) {
        const { data: codes } = await supabase
          .from("admin_user_totp_backup_codes")
          .select("id, code_hash")
          .eq("admin_user_id", userRow.id)
          .is("consumed_at", null);
        for (const c of codes ?? []) {
          if (await verifyPassword(backupCode.replace(/\s+/g, "").toUpperCase(), c.code_hash).catch(() => false)) {
            totpOk = true;
            await supabase
              .from("admin_user_totp_backup_codes")
              .update({ consumed_at: new Date().toISOString() })
              .eq("id", c.id);
            break;
          }
        }
      }

      if (!totpOk) {
        return j(
          { ok: true, success: false, requireTotp: true, error: "Invalid 2FA code." },
          200,
        );
      }
    }

    // ── Lazy-migrate: hash + clear plaintext. Best-effort; login still
    //    succeeds even if the migration write fails (we log and carry on).
    if (usedLegacy) {
      try {
        const hash = await hashPassword(password);
        const { error: migErr } = await supabase
          .from("admin_users")
          .update({
            password_hash: hash,
            password: null,
            password_updated_at: new Date().toISOString(),
          })
          .eq("id", userRow.id);
        if (migErr) console.warn("password lazy-migration failed:", migErr.message);
      } catch (e) {
        console.warn("password lazy-migration threw:", e);
      }
    }
    // Opportunistically wipe any stale plaintext on rows that already have a hash.
    else if (userRow.password_hash && userRow.password) {
      supabase
        .from("admin_users")
        .update({ password: null })
        .eq("id", userRow.id)
        .then(({ error }) => {
          if (error) console.warn("stale plaintext cleanup failed:", error.message);
        });
    }

    const sessionToken = await signAdminSession(
      {
        id: userRow.id,
        username: userRow.username,
        isAdmin: !!userRow.is_admin,
        isSuperAdmin: !!userRow.is_super_admin,
        passwordVersion:
          typeof userRow.password_version === "number" ? userRow.password_version : 1,
      },
      8 * 60 * 60,
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
        user: {
          id: userRow.id,
          username: userRow.username,
          isAdmin: !!userRow.is_admin,
          isSuperAdmin: !!userRow.is_super_admin,
          mustChangePassword: !!userRow.must_change_password,
        },
      },
      200,
      { "set-cookie": setCookie },
    );
  } catch (err: unknown) {
    console.error("Admin login error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
