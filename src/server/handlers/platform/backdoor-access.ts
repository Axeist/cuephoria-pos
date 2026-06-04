/**
 * GET /api/platform/backdoor-access
 *   ?provisionMissing=1  — create missing backdoor accounts for all workspaces, then list.
 *
 * Platform session required. Returns credentials for operator testing only.
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";
import { listWorkspaceBackdoorAccess } from "../../workspaceBackdoor";
import {
  BACKDOOR_MIGRATION_HINT,
  isBackdoorSchemaMissing,
} from "../../workspaceBackdoorSchema";

export const config = { runtime: "edge" };

function appBaseUrl(req: Request): string {
  const env = process.env.APP_BASE_URL || process.env.VITE_APP_URL || "";
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "";
}

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  const url = new URL(req.url);
  const provisionMissing =
    url.searchParams.get("provisionMissing") === "1" ||
    url.searchParams.get("provisionMissing") === "true";

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-backdoor-access");

    const { error: probeErr } = await supabase
      .from("workspace_backdoor_access")
      .select("organization_id")
      .limit(1);
    if (probeErr && isBackdoorSchemaMissing(probeErr)) {
      return j(
        {
          ok: false,
          migrationRequired: true,
          error: BACKDOOR_MIGRATION_HINT,
          workspaces: [],
          provisioned: 0,
        },
        503,
      );
    }

    const { rows, provisioned } = await listWorkspaceBackdoorAccess(supabase, {
      provisionMissing,
      appBaseUrl: appBaseUrl(req),
    });

    return j(
      {
        ok: true,
        provisioned,
        workspaces: rows.map((r) => ({
          organizationId: r.organizationId,
          orgSlug: r.orgSlug,
          orgName: r.orgName,
          username: r.username,
          password: r.password,
          loginUrl: r.loginUrl,
          createdAt: r.createdAt,
        })),
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/backdoor-access error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    const message = String((err as Error)?.message || err);
    if (isBackdoorSchemaMissing({ message })) {
      return j(
        {
          ok: false,
          migrationRequired: true,
          error: BACKDOOR_MIGRATION_HINT,
          workspaces: [],
          provisioned: 0,
        },
        503,
      );
    }
    return j({ ok: false, error: message }, 500);
  }
}
