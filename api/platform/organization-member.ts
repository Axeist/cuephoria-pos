/**
 * /api/platform/organization-member
 *
 *   DELETE ?orgId=...&membershipId=...     → remove member from org
 *   PATCH  { orgId, membershipId, role }   → change their role
 *
 * The DB trigger `prevent_last_owner_removal` is the ultimate authority;
 * any attempt to strand an org without an owner fails with a 409.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { requirePlatformSession } from "../../src/server/platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(["owner", "admin", "manager", "staff", "read_only"]);

export default async function handler(req: Request) {
  if (req.method === "DELETE") return removeMember(req);
  if (req.method === "PATCH") return updateRole(req);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function removeMember(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  const url = new URL(req.url);
  const orgId = (url.searchParams.get("orgId") || "").trim();
  const membershipId = (url.searchParams.get("membershipId") || "").trim();

  if (!UUID_RE.test(orgId)) return j({ ok: false, error: "Invalid orgId." }, 400);
  if (!UUID_RE.test(membershipId)) return j({ ok: false, error: "Invalid membershipId." }, 400);

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-member-remove");

    const { data: mem, error: memErr } = await supabase
      .from("org_memberships")
      .select("id, organization_id, admin_user_id, role")
      .eq("id", membershipId)
      .maybeSingle();
    if (memErr) return j({ ok: false, error: memErr.message }, 500);
    if (!mem || mem.organization_id !== orgId) {
      return j({ ok: false, error: "Membership not found for that organization." }, 404);
    }

    const { error: delErr } = await supabase
      .from("org_memberships")
      .delete()
      .eq("id", membershipId);
    if (delErr) {
      const isLastOwner = /last owner/i.test(delErr.message);
      return j(
        { ok: false, error: isLastOwner ? "This is the last owner — promote someone else first." : delErr.message },
        isLastOwner ? 409 : 500,
      );
    }

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: orgId,
      action: "organization.member_removed",
      target_type: "admin_user",
      target_id: mem.admin_user_id,
      meta: { role: mem.role, membershipId },
    });

    return j({ ok: true }, 200);
  } catch (err: unknown) {
    console.error("platform/organization-member DELETE error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

async function updateRole(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: { orgId?: string; membershipId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const orgId = (body.orgId || "").trim();
  const membershipId = (body.membershipId || "").trim();
  const role = (body.role || "").trim();

  if (!UUID_RE.test(orgId)) return j({ ok: false, error: "Invalid orgId." }, 400);
  if (!UUID_RE.test(membershipId)) return j({ ok: false, error: "Invalid membershipId." }, 400);
  if (!ALLOWED_ROLES.has(role)) {
    return j({ ok: false, error: `Role must be one of: ${Array.from(ALLOWED_ROLES).join(", ")}.` }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-member-role");

    const { data: mem, error: memErr } = await supabase
      .from("org_memberships")
      .select("id, organization_id, admin_user_id, role")
      .eq("id", membershipId)
      .maybeSingle();
    if (memErr) return j({ ok: false, error: memErr.message }, 500);
    if (!mem || mem.organization_id !== orgId) {
      return j({ ok: false, error: "Membership not found for that organization." }, 404);
    }
    if (mem.role === role) {
      return j({ ok: true, noop: true, membership: mem }, 200);
    }

    const { data: updated, error: updErr } = await supabase
      .from("org_memberships")
      .update({ role })
      .eq("id", membershipId)
      .select("id, organization_id, admin_user_id, role")
      .single();
    if (updErr) {
      const isLastOwner = /last owner/i.test(updErr.message);
      return j(
        { ok: false, error: isLastOwner ? "Can't demote the last owner — promote someone else first." : updErr.message },
        isLastOwner ? 409 : 500,
      );
    }

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: orgId,
      action: "organization.member_role_changed",
      target_type: "admin_user",
      target_id: mem.admin_user_id,
      meta: { fromRole: mem.role, toRole: role },
    });

    return j({ ok: true, membership: updated }, 200);
  } catch (err: unknown) {
    console.error("platform/organization-member PATCH error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
