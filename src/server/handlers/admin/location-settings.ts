import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { assertLocationOwnedByOrg } from "../../lib/payment-checkout-guards.js";
import { defaultAppSettings } from "../../../hooks/useAppSettings.types";

export const config = { runtime: "edge" };

function getSupabaseUrl() {
  const v = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  if (!v) throw new Error("Missing env: SUPABASE_URL / VITE_SUPABASE_URL");
  return v;
}

function getSupabaseServiceRoleKey() {
  const v = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!v) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return v;
}

const VALID_KEYS = new Set(Object.keys(defaultAppSettings));

export default async function handler(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-api" } },
    });

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Could not resolve workspace." }, ctx.status);
    }

    const url = new URL(req.url);

    if (req.method === "GET") {
      const locationId = url.searchParams.get("location_id");
      if (!locationId) {
        return j({ ok: false, error: "Missing location_id" }, 400);
      }

      const owned = await assertLocationOwnedByOrg(supabase, locationId, ctx.organizationId);
      if (owned.ok === false) return j({ ok: false, error: owned.message }, 404);

      const { data, error } = await supabase
        .from("location_settings")
        .select("key, value")
        .eq("location_id", locationId);

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true, settings: data ?? [] }, 200);
    }

    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const locationId = body.location_id as string | undefined;
      const updates = body.updates as Record<string, unknown> | undefined;

      if (!locationId) {
        return j({ ok: false, error: "Missing location_id" }, 400);
      }

      const owned = await assertLocationOwnedByOrg(supabase, locationId, ctx.organizationId);
      if (owned.ok === false) return j({ ok: false, error: owned.message }, 404);

      if (!updates || typeof updates !== "object") {
        return j({ ok: false, error: "Missing updates object" }, 400);
      }

      const entries = Object.entries(updates).filter(([key]) => VALID_KEYS.has(key));
      if (entries.length === 0) {
        return j({ ok: false, error: "No valid settings keys in updates" }, 400);
      }

      for (const [key, value] of entries) {
        const { error } = await supabase.from("location_settings").upsert(
          {
            location_id: locationId,
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "location_id,key" },
        );
        if (error) return j({ ok: false, error: error.message }, 500);
      }

      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: unknown) {
    console.error("Location settings API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return j({ ok: false, error: message }, 500);
  }
}
