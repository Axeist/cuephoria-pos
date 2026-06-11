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
import {
  coercePinProtectionEnabled,
  normalizeAdminPin,
} from "../../../utils/securitySettings";

export const config = { runtime: "edge" };

function supabaseAdmin() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Missing Supabase server credentials");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-admin-verify-pin" } },
  });
}

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
      pin?: string;
      locationId?: string;
    };
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
    if (!pin || !/^\d{4,8}$/.test(pin)) return j({ ok: false, error: "Invalid PIN" }, 400);
    if (!locationId) return j({ ok: false, error: "Missing locationId" }, 400);

    const supabase = supabaseAdmin();
    const owned = await assertLocationOwnedByOrg(supabase, locationId, ctx.organizationId);
    if (!owned.ok) return j({ ok: false, error: owned.message }, 404);

    const { data: rows, error } = await supabase
      .from("location_settings")
      .select("key, value")
      .eq("location_id", locationId);

    if (error) return j({ ok: false, error: error.message }, 500);

    const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
    const securityRaw = map.get("securitySettings");
    const security =
      securityRaw && typeof securityRaw === "object"
        ? (securityRaw as Record<string, unknown>)
        : defaultAppSettings.securitySettings;

    const enabled = coercePinProtectionEnabled(security.pinProtectionEnabled);
    if (!enabled) return j({ ok: true, skipped: true }, 200);

    const expected = normalizeAdminPin(security.adminPin);
    if (pin !== expected) return j({ ok: false, error: "Incorrect PIN" }, 403);

    return j({ ok: true }, 200);
  } catch (err: unknown) {
    console.error("[admin/verify-pin]", err);
    return j({ ok: false, error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
