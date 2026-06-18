/**
 * Platform-wide settings editable from /platform (Overview).
 *
 * GET  /api/platform/settings
 * PATCH /api/platform/settings  { billingAccessGraceMinutes: number }
 */

import { j } from "../../adminApiUtils";
import { requirePlatformSession } from "../../platformApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import {
  normalizeBillingGraceMinutes,
} from "../../lib/platformBillingGrace";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-settings");

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("billing_access_grace_minutes")
        .eq("id", 1)
        .maybeSingle();
      if (error) return j({ ok: false, error: error.message }, 500);
      const billingAccessGraceMinutes = normalizeBillingGraceMinutes(
        data?.billing_access_grace_minutes ?? null,
      );
      return j({ ok: true, billingAccessGraceMinutes }, 200);
    }

    if (req.method === "PATCH") {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return j({ ok: false, error: "Invalid JSON body." }, 400);
      }
      const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      const m = raw.billingAccessGraceMinutes;
      if (typeof m !== "number" || !Number.isFinite(m)) {
        return j({ ok: false, error: "billingAccessGraceMinutes must be a number." }, 400);
      }
      const bounded = normalizeBillingGraceMinutes(m);
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("platform_settings")
        .update({ billing_access_grace_minutes: bounded, updated_at: now })
        .eq("id", 1);
      if (error) return j({ ok: false, error: error.message }, 500);
      console.info(
        `platform settings updated billingAccessGraceMinutes=${bounded} actor=${session.email}`,
      );
      return j({ ok: true, billingAccessGraceMinutes: bounded }, 200);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: unknown) {
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
}
