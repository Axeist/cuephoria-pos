import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { appBaseUrl, sendEmail } from "../../email";
import { issueEmailToken } from "../../emailTokens";
import { hashPassword } from "../../passwordUtils";
import { resolveOrgContext } from "../../orgContext";
import {
  createStaffProfileForLoginUser,
  regenerateStaffPortalPin,
  syncStaffProfileFromAdminUser,
} from "../../staffProfileSync";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";

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

/** Must match login.ts: identifiers with `@` authenticate against admin_users.email (lowercase). */
const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeAdminEmail(explicit: unknown, username: string): string | null {
  const raw = typeof explicit === "string" ? explicit.trim() : "";
  const candidates = raw ? raw : username.trim();
  if (!candidates || !candidates.includes("@")) return null;
  const lower = candidates.toLowerCase();
  return SIMPLE_EMAIL.test(lower) ? lower : null;
}

const VERIFY_TTL_MINUTES = 60 * 24;

/** Sends the same verification link as /api/admin/send-verification (new staff must verify before Google sign-in). */
async function sendAdminVerificationEmail(opts: {
  adminUserId: string;
  email: string;
  displayName: string;
  organizationId: string | null;
  req: Request;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  let supabase: SupabaseClient;
  try {
    supabase = supabaseServiceClient("cuetronix-admin-staff-verify-email");
  } catch (e) {
    const msg = e instanceof SupabaseConfigError ? e.message : String(e);
    console.error("[admin/users] sendAdminVerificationEmail: no Supabase client:", msg);
    return { ok: false, error: msg };
  }
  try {
    const token = await issueEmailToken({
      supabase,
      adminUserId: opts.adminUserId,
      email: opts.email,
      purpose: "verify_email",
      ttlMinutes: VERIFY_TTL_MINUTES,
      requestedIp: opts.req.headers.get("x-forwarded-for") || null,
      requestedUa: opts.req.headers.get("user-agent") || null,
    });
    const base = appBaseUrl();
    const verifyUrl = `${base}/account/verify-email?token=${encodeURIComponent(token.token)}`;
    const sent = await sendEmail({
      kind: "verify_email",
      to: opts.email,
      vars: {
        appBaseUrl: base,
        displayName: opts.displayName,
        verifyUrl,
        expiresInMinutes: VERIFY_TTL_MINUTES,
      },
      organizationId: opts.organizationId,
      adminUserId: opts.adminUserId,
      supabase,
    });
    if (!sent.ok) {
      const errMsg =
        sent.error ||
        (sent.skipped
          ? "Resend is not configured (set RESEND_API_KEY and RESEND_FROM on the server)."
          : "Could not send verification email.");
      if (sent.skipped) {
        console.warn("[admin/users] verification email skipped:", opts.email, errMsg);
      } else {
        console.warn("[admin/users] verification email failed:", opts.email, errMsg);
      }
      return { ok: false, skipped: !!sent.skipped, error: errMsg };
    }
    console.info("[admin/users] verification email sent to", opts.email);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/users] sendAdminVerificationEmail error:", opts.email, msg);
    return { ok: false, error: msg };
  }
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
      const ctx = await resolveOrgContext(req);
      if ("code" in ctx) {
        return j(
          {
            ok: false,
            error:
              ctx.code === "no_org"
                ? "Your session has no workspace — open the correct venue first, then manage users."
                : ctx.message || "Could not resolve workspace.",
          },
          ctx.status,
        );
      }

      const { data: memberRows, error: memberErr } = await supabase
        .from("org_memberships")
        .select("admin_user_id")
        .eq("organization_id", ctx.organizationId);

      if (memberErr) return j({ ok: false, error: memberErr.message }, 500);

      const allowedIds = (memberRows ?? []).map((r) => r.admin_user_id).filter(Boolean);
      if (allowedIds.length === 0) {
        const { data: allLocsEmpty } = await supabase
          .from("locations")
          .select("id, name, slug, short_code")
          .eq("organization_id", ctx.organizationId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        return j({ ok: true, users: [], allLocations: allLocsEmpty ?? [] }, 200);
      }

      let usersQuery = await supabase
        .from("admin_users")
        .select("id, username, email, email_verified_at, display_name, designation, is_admin, is_super_admin, is_platform_backdoor")
        .in("id", allowedIds)
        .eq("is_platform_backdoor", false)
        .order("is_admin", { ascending: false })
        .order("username", { ascending: true });

      if (usersQuery.error?.message?.includes("is_platform_backdoor")) {
        usersQuery = await supabase
          .from("admin_users")
          .select("id, username, email, email_verified_at, display_name, designation, is_admin, is_super_admin")
          .in("id", allowedIds)
          .order("is_admin", { ascending: false })
          .order("username", { ascending: true });
      }

      const { data: users, error: usersErr } = usersQuery;
      if (usersErr) return j({ ok: false, error: usersErr.message }, 500);

      const userIds = (users ?? []).map((u) => u.id);

      const staffPinByAdminId: Record<
        string,
        { portalPin: string | null; staffProfileUserId: string | null }
      > = {};
      if (userIds.length > 0) {
        const { data: staffRows, error: staffErr } = await supabase
          .from("staff_profiles")
          .select("admin_user_id, portal_pin, user_id")
          .in("admin_user_id", userIds);
        if (!staffErr) {
          for (const row of staffRows ?? []) {
            if (row.admin_user_id) {
              staffPinByAdminId[row.admin_user_id] = {
                portalPin: row.portal_pin ?? null,
                staffProfileUserId: row.user_id ?? null,
              };
            }
          }
        }
      }

      // Fetch location assignments for workspace members in one query
      const { data: links } = await supabase
        .from("admin_user_locations")
        .select("admin_user_id, location_id")
        .in("admin_user_id", userIds);

      // Branches for this workspace only (login still requires org_memberships)
      const { data: allLocs } = await supabase
        .from("locations")
        .select("id, name, slug, short_code")
        .eq("organization_id", ctx.organizationId)
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

      const result = (users ?? []).map((u) => {
        const staffLink = staffPinByAdminId[u.id];
        return {
          id: u.id,
          username: u.username,
          email: u.email ?? null,
          emailVerifiedAt: u.email_verified_at ?? null,
          displayName: u.display_name ?? null,
          designation: u.designation ?? null,
          isAdmin: u.is_admin,
          isSuperAdmin: u.is_super_admin,
          locations: userLocations[u.id] ?? [],
          portalPin: !u.is_admin && !u.is_super_admin ? staffLink?.portalPin ?? null : null,
          staffProfileUserId: staffLink?.staffProfileUserId ?? null,
        };
      });

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

      const emailNorm = normalizeAdminEmail(body?.email, username);
      if (!emailNorm) {
        return j(
          {
            ok: false,
            error:
              "A valid email is required for every account (use an email address as username or add an email field). Used for login and password recovery.",
          },
          400,
        );
      }

      const { data: existingUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existingUser?.id) return j({ ok: false, error: "Username already exists" }, 409);

      const { data: existingEmail } = await supabase.from("admin_users").select("id").eq("email", emailNorm).maybeSingle();

      if (existingEmail?.id) return j({ ok: false, error: "An account with this email already exists" }, 409);

      const staffDisplayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
      const staffDesignation = typeof body?.designation === "string" ? body.designation.trim() : "";

      const passwordHash = await hashPassword(password);

      const { data: newUser, error: insertErr } = await supabase
        .from("admin_users")
        .insert({
          username,
          email: emailNorm,
          display_name: staffDisplayName || null,
          designation: staffDesignation || null,
          password: null,
          password_hash: passwordHash,
          password_updated_at: new Date().toISOString(),
          is_admin: isAdmin,
          is_super_admin: isSuperAdmin,
          // Staff must click the verification link before Google sign-in matches this row.
          email_verified_at: null,
        })
        .select("id")
        .single();

      if (insertErr || !newUser) return j({ ok: false, error: insertErr?.message ?? "Insert failed" }, 500);

      const ctx = await resolveOrgContext(req);
      if ("code" in ctx) {
        await supabase.from("admin_users").delete().eq("id", newUser.id);
        return j(
          {
            ok: false,
            error:
              ctx.code === "no_org"
                ? "Your session has no workspace — open the correct venue first, then add users."
                : ctx.message || "Could not resolve workspace for this user.",
          },
          ctx.status,
        );
      }
      if (ctx.isSuspended) {
        await supabase.from("admin_users").delete().eq("id", newUser.id);
        return j(
          {
            ok: false,
            error: "Workspace suspended. Cannot add new users until access is restored.",
            code: "suspended",
          },
          403,
        );
      }

      const orgRole: "admin" | "staff" = isAdmin || isSuperAdmin ? "admin" : "staff";
      const { error: memInsertErr } = await supabase.from("org_memberships").insert({
        organization_id: ctx.organizationId,
        admin_user_id: newUser.id,
        role: orgRole,
      });
      if (memInsertErr) {
        await supabase.from("admin_users").delete().eq("id", newUser.id);
        return j({ ok: false, error: memInsertErr.message }, 500);
      }

      // Assign locations (only branches in this workspace)
      const locs = isSuperAdmin
        ? await (async () => {
            const { data } = await supabase
              .from("locations")
              .select("id")
              .eq("organization_id", ctx.organizationId)
              .eq("is_active", true);
            return (data ?? []).map((l) => l.id);
          })()
        : locationIds;

      if (!isSuperAdmin && locs.length) {
        const { data: inOrg } = await supabase
          .from("locations")
          .select("id")
          .eq("organization_id", ctx.organizationId)
          .in("id", locs);
        const allowed = new Set((inOrg ?? []).map((l) => l.id));
        if (locs.some((lid) => !allowed.has(lid))) {
          await supabase.from("admin_users").delete().eq("id", newUser.id);
          return j(
            { ok: false, error: "One or more selected branches are not in this workspace." },
            400,
          );
        }
      }

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

      let portalPin: string | null = null;
      let staffProfileUserId: string | null = null;

      if (!isAdmin && !isSuperAdmin && locs.length > 0) {
        const profileResult = await createStaffProfileForLoginUser(supabase, {
          adminUserId: newUser.id,
          email: emailNorm,
          loginUsername: username,
          displayName: staffDisplayName || username,
          designation: staffDesignation || "Staff",
          locationId: locs[0],
        });
        if ("error" in profileResult) {
          console.warn("[admin/users] staff profile create failed:", profileResult.error);
        } else {
          portalPin = profileResult.portalPin;
          staffProfileUserId = profileResult.profile.user_id;
        }
      }

      const mailResult = await sendAdminVerificationEmail({
        adminUserId: newUser.id,
        email: emailNorm,
        displayName: staffDisplayName || username,
        organizationId: ctx.organizationId,
        req,
      });

      return j(
        {
          ok: true,
          verificationEmailSent: mailResult.ok,
          verificationEmailSkipped: !!mailResult.skipped,
          verificationEmailError: mailResult.error ?? null,
          portalPin,
          staffProfileUserId,
        },
        200,
      );
    }

    // ─── PATCH (update) ──────────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));

      /** Regenerate staff portal PIN (owners/admins only; staff accounts). */
      if (body.regeneratePortalPin === true) {
        const targetId = String(body.id || "").trim();
        if (!targetId) return j({ ok: false, error: "Missing id." }, 400);

        const { data: target, error: tErr } = await supabase
          .from("admin_users")
          .select("id, is_admin, is_super_admin")
          .eq("id", targetId)
          .maybeSingle();
        if (tErr) return j({ ok: false, error: tErr.message }, 500);
        if (!target) return j({ ok: false, error: "User not found." }, 404);
        if (target.is_admin || target.is_super_admin) {
          return j({ ok: false, error: "Portal PINs apply to staff accounts only." }, 400);
        }

        const pinResult = await regenerateStaffPortalPin(supabase, targetId);
        if ("error" in pinResult) return j({ ok: false, error: pinResult.error }, 400);
        return j({ ok: true, portalPin: pinResult.portalPin }, 200);
      }

      /** Owner/admin attests inbox without sending a link (same workspace only). */
      if (body.verifyEmailManually === true) {
        const targetId = String(body.id || "").trim();
        if (!targetId) return j({ ok: false, error: "Missing id." }, 400);

        const { data: target, error: tErr } = await supabase
          .from("admin_users")
          .select("id, email, email_verified_at, is_super_admin")
          .eq("id", targetId)
          .maybeSingle();
        if (tErr) return j({ ok: false, error: tErr.message }, 500);
        if (!target) return j({ ok: false, error: "User not found." }, 404);
        if (!target.email) return j({ ok: false, error: "This user has no email on file." }, 400);
        if (target.email_verified_at) {
          return j({ ok: true, alreadyVerified: true, emailVerifiedAt: target.email_verified_at }, 200);
        }

        if (target.is_super_admin && !sessionUser.isSuperAdmin) {
          return j({ ok: false, error: "Only a super-admin can verify this account." }, 403);
        }

        const { data: actorOrgs, error: actorOrgErr } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("admin_user_id", sessionUser.id);
        if (actorOrgErr) return j({ ok: false, error: actorOrgErr.message }, 500);

        const { data: targetOrgs, error: targetOrgErr } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("admin_user_id", targetId);
        if (targetOrgErr) return j({ ok: false, error: targetOrgErr.message }, 500);

        const actorSet = new Set((actorOrgs ?? []).map((r: { organization_id: string }) => r.organization_id));
        const sharedOrgId = (targetOrgs ?? []).find((r: { organization_id: string }) =>
          actorSet.has(r.organization_id),
        )?.organization_id;
        if (!sharedOrgId && !sessionUser.isSuperAdmin) {
          return j(
            { ok: false, error: "You can only verify users who belong to a workspace you share." },
            403,
          );
        }

        const verifiedAt = new Date().toISOString();
        const { error: updErr } = await supabase
          .from("admin_users")
          .update({ email_verified_at: verifiedAt })
          .eq("id", targetId);
        if (updErr) return j({ ok: false, error: updErr.message }, 500);

        const { error: auditErr } = await supabase.from("audit_log").insert({
            actor_type: "admin_user",
            actor_id: sessionUser.id,
            actor_label: sessionUser.username,
            organization_id: sharedOrgId ?? (actorOrgs ?? [])[0]?.organization_id ?? null,
            action: "admin_user.email_manually_verified",
            target_type: "admin_user",
            target_id: targetId,
            meta: { targetEmail: String(target.email).trim().toLowerCase() },
          });
        if (auditErr) console.warn("audit_log email_manually_verified:", auditErr.message);

        return j({ ok: true, emailVerifiedAt: verifiedAt }, 200);
      }

      /** Re-issue verify_email token + Resend message (e.g. after DB migration or deliverability issues). */
      if (body.resendVerificationEmail === true) {
        const targetId = String(body.id || "").trim();
        if (!targetId) return j({ ok: false, error: "Missing id." }, 400);

        const { data: target, error: tErr } = await supabase
          .from("admin_users")
          .select("id, email, email_verified_at, is_super_admin, username, display_name")
          .eq("id", targetId)
          .maybeSingle();
        if (tErr) return j({ ok: false, error: tErr.message }, 500);
        if (!target) return j({ ok: false, error: "User not found." }, 404);
        if (!target.email) return j({ ok: false, error: "This user has no email on file." }, 400);
        if (target.email_verified_at) {
          return j({ ok: true, alreadyVerified: true }, 200);
        }

        if (target.is_super_admin && !sessionUser.isSuperAdmin) {
          return j({ ok: false, error: "Only a super-admin can resend verification for this account." }, 403);
        }

        const { data: actorOrgs, error: actorOrgErr } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("admin_user_id", sessionUser.id);
        if (actorOrgErr) return j({ ok: false, error: actorOrgErr.message }, 500);

        const { data: targetOrgs, error: targetOrgErr } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("admin_user_id", targetId);
        if (targetOrgErr) return j({ ok: false, error: targetOrgErr.message }, 500);

        const actorSet = new Set((actorOrgs ?? []).map((r: { organization_id: string }) => r.organization_id));
        const sharedOrgId = (targetOrgs ?? []).find((r: { organization_id: string }) =>
          actorSet.has(r.organization_id),
        )?.organization_id;
        if (!sharedOrgId && !sessionUser.isSuperAdmin) {
          return j(
            { ok: false, error: "You can only resend verification for users in a workspace you share." },
            403,
          );
        }

        const organizationId = sharedOrgId ?? (targetOrgs ?? [])[0]?.organization_id ?? null;
        const emailNorm = String(target.email).trim().toLowerCase();
        const displayName =
          (target.display_name as string | null) || (target.username as string) || emailNorm;

        const mailResult = await sendAdminVerificationEmail({
          adminUserId: targetId,
          email: emailNorm,
          displayName,
          organizationId,
          req,
        });

        return j(
          {
            ok: true,
            verificationEmailSent: mailResult.ok,
            verificationEmailSkipped: !!mailResult.skipped,
            verificationEmailError: mailResult.error ?? null,
          },
          200,
        );
      }

      const id = String(body?.id || "");
      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      const { data: patchTarget } = await supabase
        .from("admin_users")
        .select("is_platform_backdoor")
        .eq("id", id)
        .maybeSingle();
      if (patchTarget?.is_platform_backdoor) {
        return j({ ok: false, error: "This account cannot be edited from the workspace." }, 403);
      }

      const update: Record<string, any> = {};
      let emailChangedForVerification: string | null = null;

      if (typeof body?.username === "string" && body.username.trim()) {
        update.username = body.username.trim();
      }
      if (typeof body?.email === "string" && body.email.trim()) {
        const emailNorm = normalizeAdminEmail(body.email, "");
        if (!emailNorm) return j({ ok: false, error: "Invalid email format." }, 400);
        const { data: selfBefore } = await supabase.from("admin_users").select("email").eq("id", id).maybeSingle();
        const prevEmail = String(selfBefore?.email || "").trim().toLowerCase();
        if (prevEmail !== emailNorm) {
          const { data: other } = await supabase.from("admin_users").select("id").eq("email", emailNorm).neq("id", id).maybeSingle();
          if (other?.id) return j({ ok: false, error: "Another account already uses this email." }, 409);
          update.email = emailNorm;
          update.email_verified_at = null;
          update.google_sub = null;
          emailChangedForVerification = emailNorm;
        }
      } else if (typeof update.username === "string" && update.username.trim()) {
        const sync = normalizeAdminEmail(undefined, update.username);
        if (sync) {
          const { data: other } = await supabase.from("admin_users").select("id").eq("email", sync).neq("id", id).maybeSingle();
          if (other?.id) return j({ ok: false, error: "Another account already uses this email." }, 409);
          const { data: selfRow } = await supabase
            .from("admin_users")
            .select("email")
            .eq("id", id)
            .maybeSingle();
          const prevEmail = String(selfRow?.email || "").trim().toLowerCase();
          update.email = sync;
          update.email_verified_at = null;
          if (prevEmail !== sync) {
            update.google_sub = null;
            emailChangedForVerification = sync;
          }
        }
      }
      if ("displayName" in body && typeof body.displayName === "string") {
        const v = body.displayName.trim();
        update.display_name = v.length ? v.slice(0, 120) : null;
      }
      if ("designation" in body && typeof body.designation === "string") {
        const v = body.designation.trim();
        update.designation = v.length ? v.slice(0, 120) : null;
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

        await syncStaffProfileFromAdminUser(supabase, id, {
          displayName: typeof body?.displayName === "string" ? body.displayName : undefined,
          designation: typeof body?.designation === "string" ? body.designation : undefined,
          email: emailChangedForVerification ?? (typeof update.email === "string" ? update.email : undefined),
        });
      }

      // Update location assignments if provided
      if (Array.isArray(body?.locationIds)) {
        const locationIds: string[] = body.locationIds;

        const ctx = await resolveOrgContext(req);
        if ("code" in ctx) {
          return j(
            {
              ok: false,
              error:
                ctx.code === "no_org"
                  ? "Your session has no workspace — open the correct venue first, then update branch access."
                  : ctx.message || "Could not resolve workspace.",
            },
            ctx.status,
          );
        }

        const { data: patchTarget, error: patchTargetErr } = await supabase
          .from("admin_users")
          .select("id, is_admin, is_super_admin")
          .eq("id", id)
          .maybeSingle();
        if (patchTargetErr) return j({ ok: false, error: patchTargetErr.message }, 500);
        if (!patchTarget) return j({ ok: false, error: "User not found." }, 404);

        const { data: targetMemberships, error: tmErr } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("admin_user_id", id);
        if (tmErr) return j({ ok: false, error: tmErr.message }, 500);

        const targetOrgIds = new Set((targetMemberships ?? []).map((r) => r.organization_id));
        const isOrphan = targetOrgIds.size === 0;
        const inCurrentWorkspace = targetOrgIds.has(ctx.organizationId);
        if (!isOrphan && !inCurrentWorkspace) {
          return j(
            {
              ok: false,
              error:
                "This account belongs to another workspace. Remove them there or contact support — branch access alone does not grant sign-in.",
            },
            403,
          );
        }

        const orgRole: "admin" | "staff" =
          patchTarget.is_super_admin || patchTarget.is_admin ? "admin" : "staff";
        const { error: memUpsertErr } = await supabase.from("org_memberships").upsert(
          {
            organization_id: ctx.organizationId,
            admin_user_id: id,
            role: orgRole,
          },
          { onConflict: "organization_id,admin_user_id" },
        );
        if (memUpsertErr) return j({ ok: false, error: memUpsertErr.message }, 500);

        // Delete existing assignments for this user
        await supabase.from("admin_user_locations").delete().eq("admin_user_id", id);

        // If super-admin, assign all locations in this workspace; otherwise use provided list
        const isSuperAdminNow = !!patchTarget.is_super_admin;
        const locs = isSuperAdminNow
          ? await (async () => {
              const { data } = await supabase
                .from("locations")
                .select("id")
                .eq("organization_id", ctx.organizationId)
                .eq("is_active", true);
              return (data ?? []).map((l) => l.id);
            })()
          : locationIds;

        if (!isSuperAdminNow && locs.length) {
          const { data: inOrg } = await supabase
            .from("locations")
            .select("id")
            .eq("organization_id", ctx.organizationId)
            .in("id", locs);
          const allowed = new Set((inOrg ?? []).map((l) => l.id));
          if (locs.some((lid) => !allowed.has(lid))) {
            return j(
              { ok: false, error: "One or more selected branches are not in this workspace." },
              400,
            );
          }
        }

        if (locs.length) {
          const { error: insLocErr } = await supabase.from("admin_user_locations").insert(
            locs.map((lid) => ({ admin_user_id: id, location_id: lid }))
          );
          if (insLocErr) return j({ ok: false, error: insLocErr.message }, 500);
        }
      }

      let verificationEmailSent = false;
      let verificationEmailSkipped = false;
      let verificationEmailError: string | null = null;
      if (emailChangedForVerification) {
        const { data: who } = await supabase
          .from("admin_users")
          .select("username, display_name")
          .eq("id", id)
          .maybeSingle();
        let organizationId: string | null = null;
        const { data: mem } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("admin_user_id", id)
          .limit(1)
          .maybeSingle();
        organizationId = mem?.organization_id ?? null;
        const mailResult = await sendAdminVerificationEmail({
          adminUserId: id,
          email: emailChangedForVerification,
          displayName: (who?.display_name as string | null) || (who?.username as string) || emailChangedForVerification,
          organizationId,
          req,
        });
        verificationEmailSent = mailResult.ok;
        verificationEmailSkipped = !!mailResult.skipped;
        verificationEmailError = mailResult.error ?? null;
      }

      return j(
        {
          ok: true,
          ...(emailChangedForVerification
            ? {
                verificationEmailSent,
                verificationEmailSkipped,
                verificationEmailError,
              }
            : {}),
        },
        200,
      );
    }

    // ─── DELETE ──────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return j({ ok: false, error: "Missing id" }, 400);

      const { data: target } = await supabase
        .from("admin_users")
        .select("is_platform_backdoor")
        .eq("id", id)
        .maybeSingle();
      if (target?.is_platform_backdoor) {
        return j({ ok: false, error: "This account cannot be removed from the workspace." }, 403);
      }

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
