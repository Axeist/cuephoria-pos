/**
 * GET /api/platform/audit
 *
 * Filters (all optional):
 *   org=<uuid>           — only events tied to this organization
 *   actor=<type>         — e.g. platform_admin | admin_user | system
 *   action=<prefix>      — e.g. "organization." matches organization.created etc.
 *   q=<keyword>          — case-insensitive search in actor_label or action
 *   limit=<n>            — 1..100, default 50
 *   before=<iso>         — keyset pagination; returns entries strictly older
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const url = new URL(req.url);
    const org = (url.searchParams.get("org") || "").trim();
    const actor = (url.searchParams.get("actor") || "").trim();
    const actionPrefix = (url.searchParams.get("action") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();
    const before = (url.searchParams.get("before") || "").trim();
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 50));

    if (org && !UUID_RE.test(org)) {
      return j({ ok: false, error: "Invalid org id." }, 400);
    }

    const supabase = supabaseServiceClient("cuetronix-platform-audit");

    let query = supabase
      .from("audit_log")
      .select(
        "id, actor_type, actor_id, actor_label, organization_id, action, target_type, target_id, meta, ip_address, user_agent, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (org) query = query.eq("organization_id", org);
    if (actor) query = query.eq("actor_type", actor);
    if (actionPrefix) query = query.like("action", `${actionPrefix}%`);
    if (q) query = query.or(`actor_label.ilike.%${q}%,action.ilike.%${q}%`);
    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) return j({ ok: false, error: error.message }, 500);

    // Enrich with org slugs for display (avoid N+1 on client).
    const orgIds = Array.from(
      new Set((data ?? []).map((d) => d.organization_id).filter((id) => Boolean(id))),
    ) as string[];

    const orgMap = new Map<string, { slug: string; name: string }>();
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, slug, name")
        .in("id", orgIds);
      for (const o of orgs ?? []) orgMap.set(o.id, { slug: o.slug, name: o.name });
    }

    const entries = (data ?? []).map((d) => ({
      ...d,
      // Expose the DB column under the shorter `ip` key the frontend already uses.
      ip: (d as { ip_address?: string | null }).ip_address ?? null,
      organizationSlug: d.organization_id ? orgMap.get(d.organization_id)?.slug ?? null : null,
      organizationName: d.organization_id ? orgMap.get(d.organization_id)?.name ?? null : null,
    }));

    return j(
      {
        ok: true,
        entries,
        nextBefore:
          entries.length === limit ? entries[entries.length - 1].created_at : null,
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/audit error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
