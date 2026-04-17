/**
 * POST /api/platform/organization-delete?id=<uuid>
 *
 * Hard-deletes a tenant and all of its operational data.
 *
 * Safety rails (in order of verification):
 *   1. Caller must hold a valid platform session (requirePlatformSession).
 *   2. URL `id` must be a well-formed UUID.
 *   3. Body must include `{ confirmSlug }` that matches the org's slug. This
 *      prevents a bookmark + stale tab from nuking the wrong tenant.
 *   4. Org must not be `is_internal` — the Cuephoria parent org is off-limits.
 *   5. Actual deletion is done inside the `platform_delete_organization`
 *      SQL function which re-checks slug + internal flag and performs every
 *      child DELETE in a single transaction.
 *
 * Returns: { ok: true, counts: { … } }
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!UUID_RE.test(id)) return j({ ok: false, error: "Invalid organization id." }, 400);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { confirmSlug?: string } = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const confirmSlug = (body.confirmSlug || "").trim();
  if (!confirmSlug) {
    return j({ ok: false, error: "confirmSlug is required — type the org slug to proceed." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-org-delete");

    const { data: org, error: lookupErr } = await supabase
      .from("organizations")
      .select("id, slug, name, is_internal")
      .eq("id", id)
      .maybeSingle();
    if (lookupErr) return j({ ok: false, error: lookupErr.message }, 500);
    if (!org) return j({ ok: false, error: "Organization not found." }, 404);

    if (org.is_internal) {
      return j({ ok: false, error: "Internal organizations cannot be deleted." }, 409);
    }
    if (org.slug !== confirmSlug) {
      return j(
        { ok: false, error: `confirmSlug "${confirmSlug}" does not match this org's slug "${org.slug}".` },
        409,
      );
    }

    // Snapshot identity for the audit row BEFORE we drop the org, because
    // organization_id goes to NULL via SET NULL once the parent is gone.
    const snapshot = { id: org.id, slug: org.slug, name: org.name };

    const { data, error: rpcErr } = await supabase.rpc("platform_delete_organization", {
      org_id: id,
      confirm_slug: confirmSlug,
    });
    if (rpcErr) {
      return j(
        { ok: false, error: rpcErr.message || "Delete failed.", code: rpcErr.code },
        500,
      );
    }

    // Audit: written AFTER the delete so the organization_id naturally lands
    // as NULL (the org no longer exists). We record the previous identity
    // inside `meta` so the trail stays readable.
    try {
      await supabase.from("audit_log").insert({
        actor_type: "platform_admin",
        actor_id: session.id,
        actor_label: session.email,
        action: "organization.deleted",
        target_type: "organization",
        target_id: snapshot.id,
        meta: {
          deleted_organization: snapshot,
          counts: (data as { counts?: unknown } | null)?.counts ?? null,
        },
      });
    } catch (err) {
      console.warn("audit write for organization.deleted failed:", err);
    }

    return j({ ok: true, deleted: snapshot, counts: (data as { counts?: unknown } | null)?.counts ?? null }, 200);
  } catch (err: unknown) {
    console.error("platform/organization-delete error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
