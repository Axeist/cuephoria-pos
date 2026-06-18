/**
 * POST /api/admin/ops — Slice 11 operational table proxy (service role + RBAC).
 *
 * Body: { op: "query", args: CoreOpsPayload }
 */

import { ADMIN_SESSION_COOKIE, j, parseCookies, verifyAdminSession } from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { resolveWorkspaceAccess } from "../../lib/workspacePermissions";
import { executeCoreOp, type CoreOpsPayload } from "../../lib/coreOps";
import { isDenied } from "../../lib/resultGuards";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Could not resolve workspace." }, ctx.status);
    }

    const body = (await req.json().catch(() => ({}))) as {
      op?: string;
      args?: CoreOpsPayload;
    };
    const op = typeof body.op === "string" ? body.op.trim() : "";
    if (op !== "query") return j({ ok: false, error: `Unknown op: ${op || "(empty)"}` }, 400);

    const args = body.args;
    if (!args || typeof args !== "object" || !args.table || !args.action) {
      return j({ ok: false, error: "Invalid args" }, 400);
    }

    const access = await resolveWorkspaceAccess(ctx.supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    const result = await executeCoreOp(args, {
      organizationId: ctx.organizationId,
      access,
    });

    if (isDenied(result)) return j({ ok: false, error: result.error }, result.status);
    return j({ ok: true, data: result.data }, 200);
  } catch (err: unknown) {
    console.error("[admin/ops]", err);
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
