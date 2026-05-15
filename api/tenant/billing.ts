/**
 * /api/tenant/billing — Node runtime (default on Vercel for this route).
 *
 * Contract (rebuilt May 2026):
 * - GET   — org + subscription snapshot + catalog + invoices + Razorpay key id
 *           (publishable; safe for Checkout.js); paymentInstrument is `{ kind:"none" }`
 *           here — use GET /api/tenant/billing-payment-instrument for card/UPI hint.
 * - POST  — { action: "subscribe" | "verify-payment" | "cancel" | "resume", … }
 *
 * Aligned with Razorpay **Create Subscription Link** (`POST /v1/subscriptions`)
 * https://razorpay.com/docs/api/payments/subscriptions/create-subscription-link/
 * plus subscriptions overview + Standard Checkout:
 * https://razorpay.com/docs/api/payments/subscriptions/
 * https://razorpay.com/docs/payments/subscriptions/
 *
 * Subscribe returns `checkout` ({ keyId, subscriptionId, optional customerId }) for
 * Checkout.js (`subscription_id`, optional `customer_id`, prefill) plus `short_url`
 * on the create response (hosted mandate).
 */

import { j } from "../../src/server/adminApiUtils.js";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext.js";
import { getRazorpayCredentials } from "../../src/server/lib/razorpay-credentials.js";
import {
  getRazorpayClient,
  mapRazorpaySubscriptionToRow,
  verifySubscriptionCheckoutSignature,
  type RazorpaySubscription,
} from "../../src/server/lib/razorpay-subscriptions.js";
import { resolveRequestedProvider } from "../../src/server/lib/payment-provider-facade.js";

export const config = { maxDuration: 60 };

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
  let creds: ReturnType<typeof getRazorpayCredentials>;
  try {
    creds = getRazorpayCredentials("default");
  } catch (e) {
    return j({ ok: false, error: e instanceof Error ? e.message : "Razorpay not configured" }, 503);
  }

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

  /**
   * Card/UPI hints are fetched lazily via GET /api/tenant/billing-payment-instrument so this
   * handler stays within the ~60s platform limit (Razorpay + cold start + DB previously hit 504s).
   */
  const paymentInstrument = { kind: "none" as const };

  let billingContactEmail: string | null = null;
  let billingPrefillName: string | null = null;
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("email, display_name, username")
    .eq("id", ctx.user.id)
    .maybeSingle();
  const em = adminRow?.email;
  if (typeof em === "string" && em.includes("@")) billingContactEmail = em.trim();
  const dn = adminRow?.display_name;
  const un = adminRow?.username;
  if (typeof dn === "string" && dn.trim()) billingPrefillName = dn.trim();
  else if (typeof un === "string" && un.trim()) billingPrefillName = un.trim();

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
      razorpay: {
        mode: creds.isLive ? "live" : "test",
        keyId: creds.keyId,
      },
      billingContactEmail,
      billingPrefillName,
      paymentInstrument,
    },
    200,
  );
}

async function postBilling(req: Request, ctx: OrgContext): Promise<Response> {
  let creds: ReturnType<typeof getRazorpayCredentials>;
  try {
    creds = getRazorpayCredentials("default");
  } catch (e) {
    return j({ ok: false, error: e instanceof Error ? e.message : "Razorpay not configured" }, 503);
  }

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
      return subscribeAction(ctx, body, creds);
    case "verify-payment":
      return verifyPaymentAction(ctx, body, creds);
    case "cancel":
      return cancelAction(ctx);
    case "resume":
      return resumeAction(ctx);
    default:
      return j({ ok: false, error: `Unknown action: ${action}` }, 400);
  }
}

async function verifyPaymentAction(
  ctx: OrgContext,
  body: Record<string, unknown>,
  creds: ReturnType<typeof getRazorpayCredentials>,
): Promise<Response> {
  const paymentId = String(body.razorpay_payment_id ?? "").trim();
  const subscriptionId = String(body.razorpay_subscription_id ?? "").trim();
  const signature = String(body.razorpay_signature ?? "").trim();
  if (!paymentId || !subscriptionId || !signature) {
    return j(
      {
        ok: false,
        error: "Missing razorpay_payment_id, razorpay_subscription_id, or razorpay_signature.",
      },
      400,
    );
  }
  const { data: row } = await ctx.supabase
    .from("subscriptions")
    .select("razorpay_subscription_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row?.razorpay_subscription_id || row.razorpay_subscription_id !== subscriptionId) {
    return j({ ok: false, error: "Subscription does not belong to this workspace." }, 403);
  }
  const valid = verifySubscriptionCheckoutSignature(paymentId, subscriptionId, signature, creds.keySecret);
  if (!valid) return j({ ok: false, error: "Invalid Razorpay payment signature." }, 400);
  return j({ ok: true }, 200);
}

async function subscribeAction(
  ctx: OrgContext,
  body: Record<string, unknown>,
  creds: ReturnType<typeof getRazorpayCredentials>,
): Promise<Response> {
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

  const razorpayPlanId = interval === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
  if (!razorpayPlanId) {
    return j(
      {
        ok: false,
        error: `Missing Razorpay ${interval}ly plan mapping for "${plan.code}". Set plan_XXXX in Platform → Plans.`,
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

  const contactHint = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";

  const client = await getRazorpayClient();

  if (
    currentSub?.razorpay_subscription_id &&
    currentSub.plan_id === plan.id &&
    currentSub.interval === interval &&
    (currentSub.status === "active" || currentSub.status === "trialing")
  ) {
    try {
      const fresh = await client.subscriptions.fetch(currentSub.razorpay_subscription_id);
      const cust =
        typeof fresh.customer_id === "string" && fresh.customer_id
          ? fresh.customer_id
          : currentSub.razorpay_customer_id ?? null;
      return j(
        {
          ok: true,
          reused: true,
          subscription: fresh,
          shortUrl: fresh.short_url ?? null,
          checkout: {
            keyId: creds.keyId,
            subscriptionId: fresh.id,
            customerId: cust,
            shortUrl: fresh.short_url ?? null,
          },
          provider,
        },
        200,
      );
    } catch {
      // Fall through to create a fresh one.
    }
  }

  /**
   * Create Subscription Link — request body per Razorpay docs only includes
   * plan_id, total_count, quantity, start_at, expire_by, customer_notify, addons,
   * offer_id, notes, notify_info. **Do not** send `customer_id` on create; the
   * docs state it is populated after the customer completes authorisation.
   * @see https://razorpay.com/docs/api/payments/subscriptions/create-subscription-link/
   */
  let notifyEmail = "";
  if (contactHint.includes("@")) {
    notifyEmail = contactHint;
  } else {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("email")
      .eq("id", ctx.user.id)
      .maybeSingle();
    const em = adminRow?.email;
    if (typeof em === "string" && em.includes("@")) notifyEmail = em.trim();
  }

  let sub: RazorpaySubscription;
  const createReq: Record<string, unknown> = {
    plan_id: razorpayPlanId,
    total_count: interval === "year" ? DEFAULT_TOTAL_COUNT_YEARLY : DEFAULT_TOTAL_COUNT_MONTHLY,
    quantity: 1,
    customer_notify: true,
    /**
     * Omit `expire_by` — Razorpay defaults mandate-link validity (~30 years per docs).
     * Sending a custom `expire_by` triggered `BAD_REQUEST_ERROR`:
     * "Link expire by cannot be lesser than the current time." (clock / validation edge cases).
     * @see https://razorpay.com/docs/api/payments/subscriptions/create-subscription-link/
     */
    notes: {
      organization_id: String(ctx.organizationId),
      organization_slug: String(ctx.organizationSlug),
      plan_code: String(plan.code),
      interval: String(interval),
    },
  };
  if (notifyEmail) {
    createReq.notify_info = { notify_email: notifyEmail };
  }

  try {
    sub = await client.subscriptions.create(createReq);
  } catch (err) {
    return billingError(err);
  }

  const checkoutCustomerId = sub.customer_id ?? null;

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
      checkout: {
        keyId: creds.keyId,
        subscriptionId: sub.id,
        customerId: checkoutCustomerId,
        shortUrl: sub.short_url ?? null,
      },
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
    await client.subscriptions.cancel(sub.razorpay_subscription_id, { cancel_at_cycle_end: true });
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
