import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { resolveWorkspaceAccess } from "../../lib/workspacePermissions";
import { PERMISSION_CATALOG } from "../../constants/permissionCatalog";

export const config = { runtime: "edge" };

/** Resolved permissions + role for the current session user. */
export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Workspace not resolved" }, ctx.status);
    }

    const access = await resolveWorkspaceAccess(ctx.supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    return j(
      {
        ok: true,
        permissions: access.permissions,
        bypass: access.bypass,
        role: access.role,
        hasStaffProfile: access.hasStaffProfile,
        catalog: PERMISSION_CATALOG,
      },
      200,
    );
  } catch (err: unknown) {
    console.error("permissions handler error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
