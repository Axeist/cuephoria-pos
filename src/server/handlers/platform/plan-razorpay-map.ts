/**
 * POST /api/platform/plan-razorpay-map
 *
 * Body: { planCode: string, monthlyPlanId?: string|null, yearlyPlanId?: string|null }
 *
 * Writes Razorpay plan_id values into the local `plans` catalog so tenants
 * can subscribe. The IDs must be pre-created in the Razorpay dashboard; we
 * never *create* Razorpay plans from here — that way the platform operator
 * keeps full control of pricing changes.
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

const PLAN_ID_RE = /^plan_[A-Za-z0-9]{4,32}$/;

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { planCode?: string; monthlyPlanId?: string | null; yearlyPlanId?: string | null };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const planCode = String(body.planCode ?? "").trim().toLowerCase();
  if (!planCode) return j({ ok: false, error: "planCode is required." }, 400);

  const normalise = (v: string | null | undefined): { ok: true; value: string | null } | { ok: false; error: string } => {
    if (v === null) return { ok: true, value: null };
    if (typeof v === "undefined") return { ok: true, value: null };
    const trimmed = String(v).trim();
    if (!trimmed) return { ok: true, value: null };
    if (!PLAN_ID_RE.test(trimmed)) {
      return { ok: false, error: `"${trimmed}" isn't a valid Razorpay plan id (expected plan_XXXX).` };
    }
    return { ok: true, value: trimmed };
  };

  const monthly = normalise(body.monthlyPlanId);
  if (monthly.ok !== true) {
    return j({ ok: false, error: (monthly as { ok: false; error: string }).error }, 400);
  }
  const yearly = normalise(body.yearlyPlanId);
  if (yearly.ok !== true) {
    return j({ ok: false, error: (yearly as { ok: false; error: string }).error }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-plan-map");
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("id, code")
      .eq("code", planCode)
      .maybeSingle();
    if (planErr) return j({ ok: false, error: planErr.message }, 500);
    if (!plan) return j({ ok: false, error: "Plan not found." }, 404);

    const update: Record<string, unknown> = {
      razorpay_plan_id_month: monthly.value,
      razorpay_plan_id_year: yearly.value,
    };

    const { error: updErr } = await supabase.from("plans").update(update).eq("id", plan.id);
    if (updErr) return j({ ok: false, error: updErr.message }, 500);

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      action: "plan.razorpay_id.updated",
      target_type: "plan",
      target_id: plan.id,
      meta: { plan_code: plan.code, monthly: monthly.value, yearly: yearly.value },
    });

    return j(
      {
        ok: true,
        plan: { id: plan.id, code: plan.code, razorpay_plan_id_month: monthly.value, razorpay_plan_id_year: yearly.value },
      },
      200,
    );
  } catch (err) {
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 500);
    console.error(err);
    return j({ ok: false, error: "Unexpected server error." }, 500);
  }
}
