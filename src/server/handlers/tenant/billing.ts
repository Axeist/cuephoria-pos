/**
 * /api/tenant/billing — tenant-facing Razorpay subscription lifecycle.
 *
 * GET
 *   Returns the active subscription + plan + invoices (last 24) for the
 *   caller's organization, plus the public plan catalog so the Billing UI
 *   can render upgrade/downgrade options without a second round trip.
 *
 * POST (action: "subscribe")
 *   Creates a Razorpay customer (if absent), creates a Razorpay subscription
 *   on the requested plan / interval, and stores the handshake on the local
 *   subscriptions row. Returns `{ subscription, shortUrl }` — the client
 *   redirects to `shortUrl` (Razorpay-hosted checkout).
 *
 * POST (action: "cancel" | "resume")
 *   Marks the local subscription for cancel-at-period-end or resumes it.
 *   Razorpay is informed too; webhook finalises state.
 *
 * Guardrails
 *   - Internal Cuephoria org cannot subscribe (is_internal = true guard).
 *     This keeps our existing Main/Lite/Cafe lounges billing-exempt even if
 *     someone mis-clicks the UI.
 *   - Role gate: only owner/admin can mutate billing.
 *   - Idempotent: if the org already has an active Razorpay subscription on
 *     the requested plan, we short-circuit and just return it.
 */

import { j } from "../../adminApiUtils";
import { withOrgContext, type OrgContext } from "../../orgContext";
import {
  createRzpCustomer,
  createRzpPlan,
  createRzpSubscription,
  cancelRzpSubscription,
  fetchRzpSubscription,
  mapRzpSubToRow,
  RazorpayRestError,
} from "../../razorpayRest";
import { resolveRequestedProvider } from "../../lib/payment-provider-facade";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);
const INVOICE_PAGE_SIZE = 24;
const DEFAULT_TOTAL_COUNT_MONTHLY = 12 * 10; // 10 years — we treat sub as evergreen until cancelled
const DEFAULT_TOTAL_COUNT_YEARLY = 10;

type Interval = "month" | "year";

async function ensureRazorpayPlanMapping(args: {
  supabase: OrgContext["supabase"];
  plan: {
    id: string;
    code: string;
    name: string;
    price_inr_month: number | null;
    price_inr_year: number | null;
    razorpay_plan_id_month: string | null;
    razorpay_plan_id_year: string | null;
  };
  interval: Interval;
}): Promise<string> {
  const { supabase, plan, interval } = args;
  const existing =
    interval === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
  if (existing) return existing;

  const price = interval === "year" ? plan.price_inr_year : plan.price_inr_month;
  if (!price || Number(price) <= 0) {
    throw new Error(
      `Plan "${plan.code}" is missing a valid ${interval}ly price, so Razorpay mapping cannot be auto-created.`,
    );
  }

  const createdPlan = await createRzpPlan({
    period: interval === "year" ? "yearly" : "monthly",
    interval: 1,
    item: {
      name: `${plan.name} (${interval === "year" ? "Yearly" : "Monthly"})`,
      description: `Auto-created from tenant billing for ${plan.code}`,
      amount: Math.round(Number(price) * 100), // INR paise
      currency: "INR",
    },
    notes: {
      plan_code: plan.code,
      interval,
      source: "tenant_billing_auto_map",
    },
  });

  const patch =
    interval === "year"
      ? { razorpay_plan_id_year: createdPlan.id }
      : { razorpay_plan_id_month: createdPlan.id };

  const { error } = await supabase.from("plans").update(patch).eq("id", plan.id);
  if (error) throw new Error(`Razorpay plan created (${createdPlan.id}) but local mapping update failed: ${error.message}`);
  return createdPlan.id;
}

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method === "GET") return getBilling(ctx);
  if (req.method === "POST") return postBilling(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function getBilling(ctx: OrgContext): Promise<Response> {
  const supabase = ctx.supabase;

  const [orgQ, subQ, plansQ, invQ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, slug, name, currency, country, status, is_internal, trial_ends_at")
      .eq("id", ctx.organizationId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select(
        "id, plan_id, provider, status, interval, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, cancel_requested_at, razorpay_subscription_id, razorpay_customer_id",
      )
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("plans")
      .select(
        "id, code, name, is_public, price_inr_month, price_inr_year, razorpay_plan_id_month, razorpay_plan_id_year, stripe_price_id_month, stripe_price_id_year, sort_order, is_active",
      )
      .eq("is_active", true)
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, status, amount_inr, currency, period_start, period_end, paid_at, short_url, provider_invoice_id, provider_payment_id, provider_subscription_id, created_at",
      )
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(INVOICE_PAGE_SIZE),
  ]);

  if (orgQ.error) return j({ ok: false, error: orgQ.error.message }, 500);
  if (!orgQ.data) return j({ ok: false, error: "Organization not found." }, 404);
  if (subQ.error) return j({ ok: false, error: subQ.error.message }, 500);
  if (plansQ.error) return j({ ok: false, error: plansQ.error.message }, 500);
  if (invQ.error) return j({ ok: false, error: invQ.error.message }, 500);

  let currentPlan: { id: string; code: string; name: string } | null = null;
  if (subQ.data?.plan_id) {
    const match = (plansQ.data ?? []).find((p) => p.id === subQ.data!.plan_id);
    if (match) currentPlan = { id: match.id, code: match.code, name: match.name };
    else {
      const { data: lookup } = await supabase
        .from("plans")
        .select("id, code, name")
        .eq("id", subQ.data.plan_id)
        .maybeSingle();
      if (lookup) currentPlan = lookup;
    }
  }

  return j(
    {
      ok: true,
      role: ctx.role,
      canEdit: EDITOR_ROLES.has(ctx.role),
      organization: orgQ.data,
      subscription: subQ.data,
      currentPlan,
      plans: plansQ.data ?? [],
      invoices: invQ.data ?? [],
    },
    200,
  );
}

async function postBilling(req: Request, ctx: OrgContext): Promise<Response> {
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j({ ok: false, error: "Only owners and admins can manage billing." }, 403);
  }

  const ct = req.headers.get("content-type")?.split(";")[0].trim();
  if (ct !== "application/json") return j({ ok: false, error: "Expected JSON body." }, 415);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const action = String(body.action ?? "").toLowerCase();
  switch (action) {
    case "subscribe":
      return subscribeAction(ctx, body);
    case "cancel":
      return cancelAction(ctx);
    case "resume":
      return resumeAction(ctx);
    default:
      return j({ ok: false, error: `Unknown action: ${action}` }, 400);
  }
}

// ---------------------------------------------------------------------------
// subscribe — create (or reuse) a Razorpay subscription on the target plan
// ---------------------------------------------------------------------------
async function subscribeAction(ctx: OrgContext, body: Record<string, unknown>): Promise<Response> {
  if (ctx.isInternal) {
    return j(
      {
        ok: false,
        error: "This organization is managed internally and cannot be subscribed via Razorpay.",
      },
      400,
    );
  }

  const planCode = String(body.planCode ?? "").trim().toLowerCase();
  const interval: Interval = body.interval === "year" ? "year" : "month";
  const provider = resolveRequestedProvider(body.provider);
  if (!planCode) return j({ ok: false, error: "planCode is required." }, 400);
  if (provider !== "razorpay") {
    return j(
      {
        ok: false,
        error: `Provider ${provider} is not enabled yet for tenant billing.`,
      },
      501,
    );
  }

  const supabase = ctx.supabase;

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select(
      "id, code, name, is_public, is_active, price_inr_month, price_inr_year, razorpay_plan_id_month, razorpay_plan_id_year, stripe_price_id_month, stripe_price_id_year",
    )
    .eq("code", planCode)
    .maybeSingle();

  if (planErr) return j({ ok: false, error: planErr.message }, 500);
  if (!plan || !plan.is_active || !plan.is_public) {
    return j({ ok: false, error: "Plan not available for subscription." }, 404);
  }

  let razorpayPlanId: string;
  try {
    razorpayPlanId = await ensureRazorpayPlanMapping({ supabase, plan, interval });
  } catch (err) {
    return j(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not prepare Razorpay plan mapping.",
      },
      400,
    );
  }

  // Fetch the current subscription row (we always keep one per org — see slice0 seed).
  const { data: currentSub, error: subErr } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, interval, razorpay_subscription_id, razorpay_customer_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subErr) return j({ ok: false, error: subErr.message }, 500);

  // Short-circuit: already on this plan/interval and actively running?
  if (
    currentSub?.razorpay_subscription_id &&
    currentSub.plan_id === plan.id &&
    currentSub.interval === interval &&
    (currentSub.status === "active" || currentSub.status === "trialing")
  ) {
    try {
      const fresh = await fetchRzpSubscription(currentSub.razorpay_subscription_id);
      return j(
        {
          ok: true,
          reused: true,
          subscription: fresh,
          shortUrl: fresh.short_url ?? null,
          provider,
        },
        200,
      );
    } catch {
      // Fall through to create a fresh one.
    }
  }

  // Resolve (or create) a Razorpay customer tagged with the organization.
  let customerId = currentSub?.razorpay_customer_id ?? null;
  if (!customerId) {
    const contactHint = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const nameHint =
      typeof body.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim()
        : ctx.organizationSlug;
    try {
      const customer = await createRzpCustomer({
        name: nameHint,
        email: contactHint || undefined,
        notes: {
          organization_id: ctx.organizationId,
          organization_slug: ctx.organizationSlug,
          created_by: ctx.user.username,
        },
      });
      customerId = customer.id;
    } catch (err) {
      return billingError(err);
    }
  }

  let sub;
  try {
    sub = await createRzpSubscription({
      plan_id: razorpayPlanId,
      customer_id: customerId ?? undefined,
      total_count: interval === "year" ? DEFAULT_TOTAL_COUNT_YEARLY : DEFAULT_TOTAL_COUNT_MONTHLY,
      quantity: 1,
      customer_notify: 1,
      notes: {
        organization_id: ctx.organizationId,
        organization_slug: ctx.organizationSlug,
        plan_code: plan.code,
        interval,
      },
    });
  } catch (err) {
    return billingError(err);
  }

  const mapped = mapRzpSubToRow(sub);
  const updatePayload = {
    plan_id: plan.id,
    interval,
    cancel_at_period_end: false,
    cancel_requested_at: null,
    ...mapped,
  };

  if (currentSub?.id) {
    const { error } = await supabase
      .from("subscriptions")
      .update(updatePayload)
      .eq("id", currentSub.id);
    if (error) {
      // Still return the Razorpay sub so the user can complete checkout;
      // webhook reconciliation will heal the DB.
      console.error("subscriptions update failed after Razorpay create", error);
    }
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      organization_id: ctx.organizationId,
      plan_id: plan.id,
      interval,
      ...mapped,
    });
    if (error) console.error("subscriptions insert failed after Razorpay create", error);
  }

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.created",
    target_type: "subscription",
    target_id: sub.id,
    meta: { plan_code: plan.code, interval, source: "tenant" },
  });

  return j(
    {
      ok: true,
      reused: false,
      subscription: sub,
      shortUrl: sub.short_url ?? null,
      provider,
    },
    200,
  );
}

// ---------------------------------------------------------------------------
// cancel / resume
// ---------------------------------------------------------------------------
async function cancelAction(ctx: OrgContext): Promise<Response> {
  if (ctx.isInternal) {
    return j({ ok: false, error: "Internal organizations have no billing to cancel." }, 400);
  }
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id, status")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub) return j({ ok: false, error: "No subscription to cancel." }, 404);
  if (!sub.razorpay_subscription_id) {
    return j({ ok: false, error: "This subscription has no Razorpay backing." }, 400);
  }

  try {
    await cancelRzpSubscription(sub.razorpay_subscription_id, { immediately: false });
  } catch (err) {
    return billingError(err);
  }

  await ctx.supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true, cancel_requested_at: new Date().toISOString() })
    .eq("id", sub.id);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.cancel_requested",
    target_type: "subscription",
    target_id: sub.razorpay_subscription_id,
    meta: { source: "tenant" },
  });

  return j({ ok: true, message: "Subscription will cancel at period end." }, 200);
}

async function resumeAction(ctx: OrgContext): Promise<Response> {
  // Razorpay subscription resume is handled via the same `subscribe` path
  // (i.e. creating a new subscription record). "Resume" here just clears the
  // pending cancel intent on our end — useful when a user clicks Cancel then
  // immediately reverses course before the period end.
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, cancel_at_period_end")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub) return j({ ok: false, error: "No subscription to resume." }, 404);
  if (!sub.cancel_at_period_end) {
    return j({ ok: true, message: "Subscription is already active.", alreadyActive: true }, 200);
  }

  await ctx.supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: false, cancel_requested_at: null })
    .eq("id", sub.id);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.cancel_reversed",
    target_type: "subscription",
    target_id: sub.id,
    meta: { source: "tenant" },
  });

  return j({ ok: true, message: "Cancel reversed. Billing continues." }, 200);
}

// ---------------------------------------------------------------------------
// Error shaping
// ---------------------------------------------------------------------------
function billingError(err: unknown): Response {
  if (err instanceof RazorpayRestError) {
    return j({ ok: false, error: err.message, provider: "razorpay", status: err.status }, 502);
  }
  console.error("billing action failed", err);
  return j(
    { ok: false, error: err instanceof Error ? err.message : "Billing request failed." },
    500,
  );
}

export default withOrgContext(handler);
