/**
 * GET /api/public/location
 *
 *   ?location=<uuid>              — explicit branch
 *   ?branch=main|lite             — legacy Cuephoria public links (org=cuephoria)
 *   ?org=<slug>&branch=main|lite  — tenant-scoped branch
 */

import { j } from "../../src/server/adminApiUtils.js";
import {
  DEFAULT_PUBLIC_ORG_SLUG,
  resolvePublicLocation,
} from "../../src/server/lib/resolvePublicLocation.js";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer.js";

export const config = { runtime: "edge" };

const BRANCH_SLUGS = new Set(["main", "lite", "cafe"]);

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const locationId = (url.searchParams.get("location") || "").trim() || null;
    const branch = (url.searchParams.get("branch") || url.searchParams.get("branchSlug") || "main")
      .trim()
      .toLowerCase();
    const orgSlug = (url.searchParams.get("org") || url.searchParams.get("orgSlug") || DEFAULT_PUBLIC_ORG_SLUG)
      .trim()
      .toLowerCase();

    if (!locationId && !BRANCH_SLUGS.has(branch)) {
      return j({ ok: false, error: "Invalid branch slug" }, 400);
    }

    const supabase = supabaseServiceClient("cuetronix-public-location");
    const resolved = await resolvePublicLocation(supabase, {
      locationId,
      branchSlug: branch,
      orgSlug,
    });

    if (!resolved) {
      return j({ ok: true, location: null }, 200, { "cache-control": "public, max-age=60" });
    }

    return j(
      {
        ok: true,
        location: {
          id: resolved.id,
          name: resolved.name,
          slug: resolved.slug,
          organizationId: resolved.organizationId,
          organizationSlug: resolved.organizationSlug,
        },
      },
      200,
      { "cache-control": "public, max-age=60" },
    );
  } catch (err: unknown) {
    console.error("public/location error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
