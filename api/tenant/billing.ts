/**
 * Node runtime override for /api/tenant/billing.
 *
 * Why this exists:
 * - The edge REST path has intermittently returned 406 for Razorpay subscription
 *   endpoints (/customers, /subscriptions) in production environments.
 * - Public booking already succeeds via Razorpay SDK on Node runtime.
 *
 * This route keeps the same request/response contract as the edge tenant billing
 * handler, but uses Razorpay SDK for customer/subscription lifecycle calls.
 */

import { j } from "../../src/server/adminApiUtils";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext";
import {
  getRazorpayClient,
  mapRazorpaySubscriptionToRow,
  type RazorpaySubscription,
} from "../../src/server/lib/razorpay-subscriptions";
import { resolveRequestedProvider } from "../../src/server/lib/payment-provider-facade";

const EDITOR_ROLES = new Set(["owner", "admin"]);
const INVOICE_PAGE_SIZE = 24;
const DEFAULT_TOTAL_COUNT_MONTHLY = 12 * 10;
const DEFAULT_TOTAL_COUNT_YEARLY = 10;

type Interval = "month" | "year";

function mapSdkSubToRow(sub: RazorpaySubscription): {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  razorpay_subscription_id: string;
  razorpay_customer_id: string | null;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string | null;
} {
  const base = mapRazorpaySubscriptionToRow(sub);
  return {
    ...base,
    provider: "razorpay",
    provider_subscription_id: sub.id,
    provider_customer_id: sub.customer_id ?? null,
  };
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
    return j({ ok: false, error: `Provider ${provider} is not enabled yet for tenant billing.` }, 501);
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

  const razorpayPlanId =
    interval === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
  if (!razorpayPlanId) {
    return j(
      {
        ok: false,
        error: `Missing Razorpay ${interval}ly plan mapping for "${plan.code}". Add plan_XXXX in /platform/plans before subscribing.`,
      },
      400,
    );
  }

  const { data: currentSub, error: subErr } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, interval, razorpay_subscription_id, razorpay_customer_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subErr) return j({ ok: false, error: subErr.message }, 500);

  const client = await getRazorpayClient();

  if (
    currentSub?.razorpay_subscription_id &&
    currentSub.plan_id === plan.id &&
    currentSub.interval === interval &&
    (currentSub.status === "active" || currentSub.status === "trialing")
  ) {
    try {
      const fresh = await client.subscriptions.fetch(currentSub.razorpay_subscription_id);
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

  let customerId = currentSub?.razorpay_customer_id ?? null;
  if (!customerId) {
    const contactHint = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const nameHint =
      typeof body.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim()
        : ctx.organizationSlug;

    try {
      const customer = await client.customers.create({
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

  let sub: RazorpaySubscription;
  try {
    sub = await client.subscriptions.create({
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

  const mapped = mapSdkSubToRow(sub);
  const updatePayload = {
    plan_id: plan.id,
    interval,
    cancel_at_period_end: false,
    cancel_requested_at: null,
    ...mapped,
  };

  if (currentSub?.id) {
    const { error } = await supabase.from("subscriptions").update(updatePayload).eq("id", currentSub.id);
    if (error) console.error("subscriptions update failed after Razorpay create", error);
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
    const client = await getRazorpayClient();
    await client.subscriptions.cancel(sub.razorpay_subscription_id, { cancel_at_cycle_end: 1 });
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

function billingError(err: unknown): Response {
  const anyErr = err as {
    message?: string;
    status?: number;
    statusCode?: number;
    error?: unknown;
    description?: string;
  };
  const msg =
    anyErr?.description ||
    (anyErr?.error as { description?: string } | undefined)?.description ||
    anyErr?.message ||
    "Billing request failed.";
  const status = Number(anyErr?.statusCode ?? anyErr?.status ?? 0);
  return j(
    {
      ok: false,
      error: msg,
      provider: "razorpay",
      status: status || undefined,
      provider_body: anyErr?.error ?? null,
    },
    502,
  );
}

export default withOrgContext(handler);

