/**
 * POST /api/admin/change-password
 *
 * Body: { currentPassword: string, newPassword: string }
 *
 * Behaviour:
 *   1. Requires a valid admin session cookie.
 *   2. Verifies `currentPassword` using the same dual-read logic as login
 *      (password_hash preferred, plaintext fallback). A mismatch returns 401.
 *   3. Rejects new passwords that are < 8 chars, > 128 chars, or identical
 *      to the current password.
 *   4. Writes the new PBKDF2 hash, clears legacy plaintext, sets
 *      `must_change_password = false`, and bumps `password_updated_at`.
 *   5. Issues a fresh session cookie so the existing cookie remains valid
 *      but the server clock is reset.
 *
 * Security notes:
 *   - We intentionally do not differentiate between "user not found" and
 *     "current password wrong" — both return a generic 401.
 *   - We never reveal whether the old password was stored as plaintext or
 *     as a hash; the successful write always normalises the row.
 */

import {
  ADMIN_SESSION_COOKIE,
  cookieSerialize,
  j,
  parseCookies,
  signAdminSession,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import {
  constantTimeStringEquals,
  hashPassword,
  verifyPassword,
} from "../../src/server/passwordUtils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const session = token ? await verifyAdminSession(token) : null;
    if (!session) return j({ ok: false, error: "Unauthorized" }, 401);

    let body: { currentPassword?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return j({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return j({ ok: false, error: "Both current and new passwords are required." }, 400);
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return j({ ok: false, error: "New password must be 8–128 characters." }, 400);
    }
    if (constantTimeStringEquals(currentPassword, newPassword)) {
      return j({ ok: false, error: "New password must be different from the current one." }, 400);
    }

    const supabase = supabaseServiceClient("cuephoria-change-password");

    const { data: row, error: rowErr } = await supabase
      .from("admin_users")
      .select(
        "id, username, is_admin, is_super_admin, password, password_hash, must_change_password, password_version",
      )
      .eq("id", session.id)
      .maybeSingle();
    if (rowErr) return j({ ok: false, error: rowErr.message }, 500);
    if (!row) return j({ ok: false, error: "Unauthorized" }, 401);

    let currentOk = false;
    if (row.password_hash) {
      currentOk = await verifyPassword(currentPassword, row.password_hash).catch(() => false);
    } else if (row.password) {
      currentOk = constantTimeStringEquals(currentPassword, row.password);
    }
    if (!currentOk) {
      return j({ ok: false, error: "Current password is incorrect." }, 401);
    }

    const newHash = await hashPassword(newPassword);
    // Slice 5: bump password_version so every other session this user has
    // open on other devices is invalidated on its next server call.
    const currentVersion =
      typeof row.password_version === "number" ? row.password_version : 1;
    const nextVersion = currentVersion + 1;

    const { error: updErr } = await supabase
      .from("admin_users")
      .update({
        password: null,
        password_hash: newHash,
        password_updated_at: new Date().toISOString(),
        must_change_password: false,
        password_version: nextVersion,
      })
      .eq("id", row.id);
    if (updErr) return j({ ok: false, error: updErr.message }, 500);

    // Reissue the session cookie so the rotating device keeps working, now
    // pinned to the bumped password_version. Other devices die on next hit.
    const newToken = await signAdminSession(
      {
        id: row.id,
        username: row.username,
        isAdmin: !!row.is_admin,
        isSuperAdmin: !!row.is_super_admin,
        passwordVersion: nextVersion,
      },
      8 * 60 * 60,
    );
    const setCookie = cookieSerialize(ADMIN_SESSION_COOKIE, newToken, {
      maxAgeSeconds: 8 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
    });

    return j({ ok: true }, 200, { "set-cookie": setCookie });
  } catch (err: unknown) {
    console.error("change-password error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
