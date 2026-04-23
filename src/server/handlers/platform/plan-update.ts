/**
 * POST /api/platform/plan-update
 *
 * Edit a plan's pricing / metadata / Razorpay mapping in one call.
 *
 * Body:
 *   {
 *     planCode: string,                   // REQUIRED — identifies the row
 *     updates: {
 *       name?: string,                    // max 60 chars
 *       description?: string | null,      // max 300 chars, null clears
 *       price_inr_month?: number | null,  // in whole rupees (we cast to NUMERIC)
 *       price_inr_year?:  number | null,
 *       price_usd_month?: number | null,
 *       price_usd_year?:  number | null,
 *       razorpay_plan_id_month?: string | null,   // plan_XXXX or null
 *       razorpay_plan_id_year?:  string | null,
 *       stripe_price_id_month?: string | null,     // price_XXXX or null
 *       stripe_price_id_year?:  string | null,
 *       is_active?: boolean,
 *       is_public?: boolean,
 *       sort_order?: number               // integer
 *     }
 *   }
 *
 * Notes:
 *   - Prices are optional: `null` clears the column (useful for custom /
 *     enterprise-only plans where price is not publicly quoted).
 *   - Razorpay IDs go through the same plan_XXXX regex as `plan-razorpay-map`.
 *   - Every successful edit writes an `audit_log` row with actor + diff.
 *   - Internal plan (`code=internal`) cannot be marked inactive — it would
 *     orphan the Cuephoria parent subscription.
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

const PLAN_ID_RE = /^plan_[A-Za-z0-9]{4,32}$/;
const STRIPE_PRICE_ID_RE = /^price_[A-Za-z0-9]{4,64}$/;

type PlanUpdates = {
  name?: string;
  description?: string | null;
  price_inr_month?: number | null;
  price_inr_year?: number | null;
  price_usd_month?: number | null;
  price_usd_year?: number | null;
  razorpay_plan_id_month?: string | null;
  razorpay_plan_id_year?: string | null;
  stripe_price_id_month?: string | null;
  stripe_price_id_year?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
};

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { planCode?: string; updates?: PlanUpdates };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const planCode = String(body.planCode ?? "").trim().toLowerCase();
  if (!planCode) return j({ ok: false, error: "planCode is required." }, 400);

  const updates: PlanUpdates = body.updates ?? {};
  const clean: Record<string, unknown> = {};
  const errors: string[] = [];

  if ("name" in updates) {
    const v = String(updates.name ?? "").trim();
    if (v.length === 0) errors.push("name cannot be empty.");
    else if (v.length > 60) errors.push("name is too long (max 60).");
    else clean.name = v;
  }

  if ("description" in updates) {
    if (updates.description === null) {
      clean.description = null;
    } else {
      const v = String(updates.description ?? "").trim();
      if (v.length > 300) errors.push("description is too long (max 300).");
      clean.description = v.length === 0 ? null : v;
    }
  }

  const priceKey = (k: keyof PlanUpdates, label: string) => {
    if (!(k in updates)) return;
    const raw = updates[k];
    if (raw === null || raw === "") {
      clean[k as string] = null;
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      errors.push(`${label} must be a non-negative number or null.`);
      return;
    }
    if (n > 10_000_000) {
      errors.push(`${label} is unreasonably large (cap 10,000,000).`);
      return;
    }
    clean[k as string] = n;
  };

  priceKey("price_inr_month", "price_inr_month");
  priceKey("price_inr_year", "price_inr_year");
  priceKey("price_usd_month", "price_usd_month");
  priceKey("price_usd_year", "price_usd_year");

  const planIdKey = (k: keyof PlanUpdates, label: string) => {
    if (!(k in updates)) return;
    const raw = updates[k];
    if (raw === null || raw === "") {
      clean[k as string] = null;
      return;
    }
    const v = String(raw).trim();
    if (!PLAN_ID_RE.test(v)) {
      errors.push(`${label} must look like plan_XXXX (letters/digits, 4-32).`);
      return;
    }
    clean[k as string] = v;
  };

  planIdKey("razorpay_plan_id_month", "razorpay_plan_id_month");
  planIdKey("razorpay_plan_id_year", "razorpay_plan_id_year");

  const stripePriceKey = (k: keyof PlanUpdates, label: string) => {
    if (!(k in updates)) return;
    const raw = updates[k];
    if (raw === null || raw === "") {
      clean[k as string] = null;
      return;
    }
    const v = String(raw).trim();
    if (!STRIPE_PRICE_ID_RE.test(v)) {
      errors.push(`${label} must look like price_XXXX (letters/digits, 4-64).`);
      return;
    }
    clean[k as string] = v;
  };

  stripePriceKey("stripe_price_id_month", "stripe_price_id_month");
  stripePriceKey("stripe_price_id_year", "stripe_price_id_year");

  if ("is_active" in updates) clean.is_active = Boolean(updates.is_active);
  if ("is_public" in updates) clean.is_public = Boolean(updates.is_public);

  if ("sort_order" in updates) {
    const n = Number(updates.sort_order);
    if (!Number.isInteger(n) || n < 0 || n > 10_000) {
      errors.push("sort_order must be a non-negative integer <= 10000.");
    } else {
      clean.sort_order = n;
    }
  }

  if (errors.length > 0) {
    return j({ ok: false, error: "Validation failed.", details: errors }, 400);
  }
  if (Object.keys(clean).length === 0) {
    return j({ ok: false, error: "No fields to update." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-plan-update");

    const { data: before, error: lookupErr } = await supabase
      .from("plans")
      .select(
        "id, code, name, description, is_active, is_public, price_inr_month, price_inr_year, price_usd_month, price_usd_year, razorpay_plan_id_month, razorpay_plan_id_year, stripe_price_id_month, stripe_price_id_year, sort_order",
      )
      .eq("code", planCode)
      .maybeSingle();
    if (lookupErr) return j({ ok: false, error: lookupErr.message }, 500);
    if (!before) return j({ ok: false, error: `Plan "${planCode}" not found.` }, 404);

    if (before.code === "internal" && clean.is_active === false) {
      return j(
        { ok: false, error: "The internal plan cannot be deactivated — it anchors the Cuephoria subscription." },
        409,
      );
    }

    const { data: after, error: updErr } = await supabase
      .from("plans")
      .update(clean)
      .eq("id", before.id)
      .select(
        "id, code, name, description, is_active, is_public, price_inr_month, price_inr_year, price_usd_month, price_usd_year, razorpay_plan_id_month, razorpay_plan_id_year, stripe_price_id_month, stripe_price_id_year, sort_order",
      )
      .single();
    if (updErr) return j({ ok: false, error: updErr.message }, 500);

    // Build a minimal diff for the audit trail — only fields that actually
    // changed. Keeps the meta JSON readable in the audit log viewer.
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(clean)) {
      const fromVal = (before as Record<string, unknown>)[k];
      const toVal = (after as Record<string, unknown>)[k];
      if (fromVal !== toVal) diff[k] = { from: fromVal, to: toVal };
    }

    try {
      await supabase.from("audit_log").insert({
        actor_type: "platform_admin",
        actor_id: session.id,
        actor_label: session.email,
        action: "plan.updated",
        target_type: "plan",
        target_id: before.id,
        meta: { plan_code: before.code, diff },
      });
    } catch (err) {
      console.warn("audit write for plan.updated failed:", err);
    }

    return j({ ok: true, plan: after }, 200);
  } catch (err: unknown) {
    console.error("platform/plan-update error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
