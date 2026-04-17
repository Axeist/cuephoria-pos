/**
 * POST /api/platform/organization-invite-owner
 *
 * Creates the first owner of a tenant (or any additional owner-role user).
 * Required platform session.
 *
 * Body:
 *   {
 *     orgId: string (uuid),
 *     username: string,        // ends up as the login username
 *     displayName?: string,    // not persisted today; reserved for Slice 5
 *     tempPassword: string,    // >= 8 chars, displayed once to the operator
 *     role?: 'owner' | 'admin' // default 'owner'
 *   }
 *
 * Behaviour:
 *   1. Rejects invites into internal orgs (Cuephoria). Use the app directly.
 *   2. Enforces global admin_users.username uniqueness with a friendly 409.
 *   3. Creates admin_user + org_membership + admin_user_locations (all active
 *      branches) atomically; rolls back on any failure.
 *   4. Writes an audit log entry.
 *   5. Response includes the plaintext password — operator must copy it now;
 *      it is never stored beyond the admin_users row.
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";
import { hashPassword } from "../../passwordUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_RE = /^[a-zA-Z0-9._+@-]{3,64}$/;
const ALLOWED_ROLES = new Set(["owner", "admin"]);

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: {
    orgId?: string;
    username?: string;
    displayName?: string;
    tempPassword?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const orgId = (body.orgId || "").trim();
  const username = (body.username || "").trim();
  const tempPassword = body.tempPassword || "";
  const role = (body.role || "owner").trim();

  if (!UUID_RE.test(orgId)) return j({ ok: false, error: "Invalid orgId." }, 400);
  if (!USERNAME_RE.test(username)) {
    return j(
      { ok: false, error: "Username must be 3–64 chars: letters, digits, '.', '_', '+', '@', '-'." },
      400,
    );
  }
  if (typeof tempPassword !== "string" || tempPassword.length < 8 || tempPassword.length > 128) {
    return j({ ok: false, error: "Temporary password must be 8–128 characters." }, 400);
  }
  if (!ALLOWED_ROLES.has(role)) {
    return j({ ok: false, error: `Role must be one of: ${Array.from(ALLOWED_ROLES).join(", ")}.` }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-invite-owner");

    // -----------------------------------------------------------------------
    // 1) Validate target org.
    // -----------------------------------------------------------------------
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, slug, name, status, is_internal")
      .eq("id", orgId)
      .maybeSingle();
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
    if (!org) return j({ ok: false, error: "Organization not found." }, 404);
    if (org.is_internal) {
      return j(
        { ok: false, error: "Internal organizations can't be invited into from here. Manage memberships inside the app." },
        409,
      );
    }
    if (org.status === "suspended" || org.status === "canceled") {
      return j({ ok: false, error: `Cannot invite owners into a ${org.status} organization.` }, 409);
    }

    // -----------------------------------------------------------------------
    // 2) Validate username uniqueness up-front for a clean error.
    // -----------------------------------------------------------------------
    const { data: existingUser, error: existUserErr } = await supabase
      .from("admin_users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existUserErr) return j({ ok: false, error: existUserErr.message }, 500);
    if (existingUser) {
      return j(
        { ok: false, error: `Username "${username}" is already taken. Pick another.` },
        409,
      );
    }

    // -----------------------------------------------------------------------
    // 3) Create admin_user. Store only the PBKDF2 hash and force a rotation
    //    on first login so the temp password we just showed the operator
    //    stops working as soon as the invitee uses it.
    // -----------------------------------------------------------------------
    const passwordHash = await hashPassword(tempPassword);
    const { data: newUser, error: userErr } = await supabase
      .from("admin_users")
      .insert({
        username,
        password: null,
        password_hash: passwordHash,
        password_updated_at: new Date().toISOString(),
        must_change_password: true,
        is_admin: true,
        is_super_admin: false,
      })
      .select("id, username, is_admin, is_super_admin, created_at")
      .single();
    if (userErr || !newUser) {
      return j({ ok: false, error: userErr?.message || "Failed to create admin user." }, 500);
    }

    // -----------------------------------------------------------------------
    // 4) Attach to every active location of the org. Empty orgs get no rows
    //    (the user will still be able to log in; branch creation in Slice 4).
    // -----------------------------------------------------------------------
    const { data: locations, error: locErr } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_active", true);
    if (locErr) {
      await supabase.from("admin_users").delete().eq("id", newUser.id);
      return j({ ok: false, error: `Failed to look up branches: ${locErr.message}` }, 500);
    }
    if (locations && locations.length > 0) {
      const rows = locations.map((l) => ({ admin_user_id: newUser.id, location_id: l.id }));
      const { error: linkErr } = await supabase.from("admin_user_locations").insert(rows);
      if (linkErr) {
        await supabase.from("admin_users").delete().eq("id", newUser.id);
        return j({ ok: false, error: `Failed to link branches: ${linkErr.message}` }, 500);
      }
    }

    // -----------------------------------------------------------------------
    // 5) Membership.
    // -----------------------------------------------------------------------
    const { data: membership, error: memErr } = await supabase
      .from("org_memberships")
      .insert({
        organization_id: orgId,
        admin_user_id: newUser.id,
        role,
      })
      .select("id, role, created_at")
      .single();
    if (memErr || !membership) {
      await supabase.from("admin_user_locations").delete().eq("admin_user_id", newUser.id);
      await supabase.from("admin_users").delete().eq("id", newUser.id);
      return j({ ok: false, error: memErr?.message || "Failed to create membership." }, 500);
    }

    // -----------------------------------------------------------------------
    // 6) Audit.
    // -----------------------------------------------------------------------
    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: orgId,
      action: "organization.owner_invited",
      target_type: "admin_user",
      target_id: newUser.id,
      meta: { username, role, locationsLinked: locations?.length ?? 0 },
    });

    return j(
      {
        ok: true,
        owner: {
          adminUserId: newUser.id,
          username: newUser.username,
          tempPassword,
          role: membership.role,
          locationsLinked: locations?.length ?? 0,
        },
        organization: { id: org.id, slug: org.slug, name: org.name },
      },
      201,
    );
  } catch (err: unknown) {
    console.error("platform/organization-invite-owner error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
