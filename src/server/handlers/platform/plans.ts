/**
 * GET /api/platform/plans
 *
 * Returns the full plan catalog (including inactive ones, flagged) and each
 * plan's feature matrix. Used by the platform admin UI to power pickers
 * and the plan matrix.
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-plans");

    const [{ data: plans, error: plansErr }, { data: feats, error: featsErr }] = await Promise.all([
      supabase
        .from("plans")
        .select(
          "id, code, name, description, is_active, is_public, price_inr_month, price_inr_year, price_usd_month, price_usd_year, razorpay_plan_id_month, razorpay_plan_id_year, stripe_price_id_month, stripe_price_id_year, sort_order",
        )
        .order("sort_order", { ascending: true }),
      supabase.from("plan_features").select("plan_id, key, value"),
    ]);

    if (plansErr) return j({ ok: false, error: plansErr.message }, 500);
    if (featsErr) return j({ ok: false, error: featsErr.message }, 500);

    const byPlan = new Map<string, Record<string, unknown>>();
    for (const f of feats ?? []) {
      if (!byPlan.has(f.plan_id)) byPlan.set(f.plan_id, {});
      (byPlan.get(f.plan_id) as Record<string, unknown>)[f.key] = f.value;
    }

    const enriched = (plans ?? []).map((p) => ({
      ...p,
      features: byPlan.get(p.id) ?? {},
    }));

    return j({ ok: true, plans: enriched }, 200);
  } catch (err: unknown) {
    console.error("platform/plans error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
