/**
 * GET /api/public/workspace?slug=<slug>
 *
 * Public resolver for a tenant slug. Returns a *very* narrow projection so
 * we never leak private attributes (plan, subscription, status, member count).
 *
 *   { ok: true, workspace: { slug, name, country } }  // exists, safe to render
 *   { ok: true, workspace: null }                     // not found
 *
 * Intended use: the `/app/t/:slug` landing splash and the login page's
 * "you're signing into <Workspace>" pre-state.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { toPublicBranding } from "../../src/server/brandingUtils";

export const config = { runtime: "edge" };

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim().toLowerCase();

    if (!slug || !SLUG_RE.test(slug)) {
      return j({ ok: true, workspace: null }, 200, {
        "cache-control": "public, max-age=60",
      });
    }

    const supabase = supabaseServiceClient("cuetronix-public-workspace");

    const { data: org, error } = await supabase
      .from("organizations")
      .select("slug, name, country, status, branding")
      .eq("slug", slug)
      .maybeSingle();

    if (error) return j({ ok: false, error: error.message }, 500);

    // Never surface suspended / canceled tenants publicly — fail as "not found".
    if (!org || org.status === "suspended" || org.status === "canceled") {
      return j({ ok: true, workspace: null }, 200, {
        "cache-control": "public, max-age=60",
      });
    }

    // Strict whitelist projection — never return raw `org.branding` to the
    // public surface. `toPublicBranding` will drop any future internal-only
    // keys someone adds to the trigger without updating this file.
    const branding = toPublicBranding(org.branding);

    return j(
      {
        ok: true,
        workspace: {
          slug: org.slug,
          name: org.name,
          country: org.country,
          branding,
        },
      },
      200,
      { "cache-control": "public, max-age=60" },
    );
  } catch (err: unknown) {
    console.error("public/workspace error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
