/**
 * GET /api/public/workspace-by-location?location=<uuid>
 *
 * Resolves the tenant behind a branch location for public surfaces
 * (booking page branding). Service-role only — never expose raw branding JSON.
 */

import { j } from "../../src/server/adminApiUtils";
import { toPublicBranding } from "../../src/server/brandingUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const locationId = (url.searchParams.get("location") || "").trim();
    if (!locationId) {
      return j({ ok: false, error: "Missing location" }, 400);
    }

    const supabase = supabaseServiceClient("cuetronix-public-workspace-by-location");

    const { data: loc, error: locError } = await supabase
      .from("locations")
      .select("id, name, slug, organization_id")
      .eq("id", locationId)
      .eq("is_active", true)
      .maybeSingle();

    if (locError) return j({ ok: false, error: locError.message }, 500);
    if (!loc?.organization_id) {
      return j({ ok: true, workspace: null }, 200, { "cache-control": "public, max-age=60" });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("slug, name, country, status, branding")
      .eq("id", loc.organization_id)
      .maybeSingle();

    if (orgError) return j({ ok: false, error: orgError.message }, 500);

    if (!org || org.status === "suspended" || org.status === "canceled") {
      return j({ ok: true, workspace: null }, 200, { "cache-control": "public, max-age=60" });
    }

    const branding = toPublicBranding(org.branding);

    return j(
      {
        ok: true,
        workspace: {
          slug: org.slug,
          name: org.name,
          country: org.country,
          branding,
          location: {
            id: loc.id,
            name: loc.name,
            slug: loc.slug,
          },
        },
      },
      200,
      { "cache-control": "public, max-age=60" },
    );
  } catch (err: unknown) {
    console.error("public/workspace-by-location error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
