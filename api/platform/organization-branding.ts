/**
 * /api/platform/organization-branding?id=<uuid>
 *
 *   GET   → current branding for any org. Platform admin only.
 *   PATCH → upsert branding fields. Platform admin only. Body accepts the
 *           same shape as the tenant endpoint, plus a `reset: true` flag
 *           that clears the entire object back to `{}`.
 *
 * Audit
 *   Every write inserts an `organization.branding.updated` audit row tagged
 *   `source: "platform"` so you can tell operator edits from tenant ones.
 *
 * Guardrail
 *   Internal orgs (Cuephoria) refuse a wholesale `reset` unless the caller
 *   passes `confirmInternalReset: true`. Prevents accidental wipe.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { requirePlatformSession } from "../../src/server/platformApiUtils";
import {
  extractClearFields,
  mergeBranding,
  type TenantBranding,
  validateBrandingPatch,
} from "../../src/server/brandingUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!UUID_RE.test(id)) return j({ ok: false, error: "Invalid organization id." }, 400);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-branding");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, slug, name, is_internal, branding")
      .eq("id", id)
      .maybeSingle();
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
    if (!org) return j({ ok: false, error: "Organization not found." }, 404);

    if (req.method === "GET") {
      return j(
        {
          ok: true,
          organization: { id: org.id, slug: org.slug, name: org.name, is_internal: org.is_internal },
          branding: (org.branding as TenantBranding | null) ?? {},
        },
        200,
      );
    }

    if (req.method !== "PATCH") {
      return j({ ok: false, error: "Method not allowed" }, 405);
    }

    if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return j({ ok: false, error: "Expected JSON body." }, 415);
    }

    let body: {
      reset?: boolean;
      confirmInternalReset?: boolean;
      patch?: unknown;
    } & Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return j({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const current = (org.branding as TenantBranding | null) ?? {};

    let next: TenantBranding;
    let changedKeys: string[];
    let cleared: string[];

    if (body?.reset === true) {
      if (org.is_internal && body.confirmInternalReset !== true) {
        return j(
          {
            ok: false,
            error:
              "Refusing to reset branding for the internal organization without confirmInternalReset: true.",
          },
          409,
        );
      }
      next = {};
      changedKeys = Object.keys(current);
      cleared = Object.keys(current);
    } else {
      // Allow the caller to send a wrapped `patch` or flat fields.
      const rawPatch = body.patch !== undefined ? body.patch : body;
      const validation = validateBrandingPatch(rawPatch);
      if (!validation.ok) {
        return j({ ok: false, error: "Invalid branding.", fields: validation.errors }, 400);
      }
      const clearFields = extractClearFields(rawPatch);
      next = mergeBranding(current, validation.patch, clearFields);
      changedKeys = [
        ...Object.keys(validation.patch),
        ...clearFields,
      ].filter((k, i, arr) => arr.indexOf(k) === i);
      cleared = clearFields;
    }

    const { data: updated, error: updErr } = await supabase
      .from("organizations")
      .update({ branding: next })
      .eq("id", id)
      .select("branding")
      .single();
    if (updErr) return j({ ok: false, error: updErr.message }, 400);

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.username,
      organization_id: id,
      action: body?.reset === true ? "organization.branding.reset" : "organization.branding.updated",
      target_type: "organization",
      target_id: id,
      meta: {
        fields: changedKeys,
        cleared,
        source: "platform",
      },
    });

    return j(
      {
        ok: true,
        branding: (updated?.branding as TenantBranding) ?? {},
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/organization-branding error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
