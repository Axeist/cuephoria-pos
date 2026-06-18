/**
 * POST /api/platform/organization-member-migrate-email
 *
 * Platform operators: point a tenant member's login email at a Gmail address
 * for Google OAuth. Clears google_sub and email_verified_at so the user must
 * sign in with the new Google account on next login.
 *
 * Body: { orgId, membershipId, newEmail }
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Require consumer Gmail (Workspace / other domains use migrate elsewhere if needed). */
function isGmailAddress(email: string): boolean {
  return email.toLowerCase().endsWith("@gmail.com");
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { orgId?: string; membershipId?: string; newEmail?: string };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const orgId = (body.orgId || "").trim();
  const membershipId = (body.membershipId || "").trim();
  const newEmail = (body.newEmail || "").trim().toLowerCase();

  if (!UUID_RE.test(orgId)) return j({ ok: false, error: "Invalid orgId." }, 400);
  if (!UUID_RE.test(membershipId)) return j({ ok: false, error: "Invalid membershipId." }, 400);
  if (!newEmail || !isValidEmail(newEmail)) {
    return j({ ok: false, error: "Enter a valid email address.", field: "newEmail" }, 400);
  }
  if (!isGmailAddress(newEmail)) {
    return j(
      {
        ok: false,
        error: "Only @gmail.com addresses are allowed for this migration path.",
        field: "newEmail",
      },
      400,
    );
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-migrate-email");

    const { data: mem, error: memErr } = await supabase
      .from("org_memberships")
      .select("id, organization_id, admin_user_id, role")
      .eq("id", membershipId)
      .maybeSingle();
    if (memErr) return j({ ok: false, error: memErr.message }, 500);
    if (!mem || mem.organization_id !== orgId) {
      return j({ ok: false, error: "Membership not found for that organization." }, 404);
    }

    const { data: userRow, error: userErr } = await supabase
      .from("admin_users")
      .select("id, email, username, is_super_admin, google_sub")
      .eq("id", mem.admin_user_id)
      .maybeSingle();
    if (userErr) return j({ ok: false, error: userErr.message }, 500);
    if (!userRow) return j({ ok: false, error: "User not found." }, 404);

    if (userRow.is_super_admin) {
      return j({ ok: false, error: "Cannot migrate platform super-admin accounts from here." }, 409);
    }

    const prevEmail = String(userRow.email || "").trim().toLowerCase();
    if (prevEmail === newEmail) {
      return j({ ok: false, error: "That is already their login email." }, 400);
    }

    const { data: taken } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", newEmail)
      .neq("id", userRow.id)
      .maybeSingle();
    if (taken?.id) {
      return j(
        {
          ok: false,
          error: "Another account already uses this email.",
          field: "newEmail",
        },
        409,
      );
    }

    const { error: updErr } = await supabase
      .from("admin_users")
      .update({
        email: newEmail,
        google_sub: null,
        email_verified_at: null,
      })
      .eq("id", userRow.id);

    if (updErr) {
      if (/unique|duplicate/i.test(updErr.message)) {
        return j({ ok: false, error: "That email is already in use.", field: "newEmail" }, 409);
      }
      return j({ ok: false, error: updErr.message }, 500);
    }

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: orgId,
      action: "organization.member_login_email_migrated",
      target_type: "admin_user",
      target_id: userRow.id,
      meta: {
        membershipId,
        fromEmail: prevEmail || null,
        toEmail: newEmail,
        clearedGoogleSub: Boolean(userRow.google_sub),
      },
    });

    return j(
      {
        ok: true,
        adminUserId: userRow.id,
        username: userRow.username,
        previousEmail: prevEmail || null,
        email: newEmail,
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/organization-member-migrate-email error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
