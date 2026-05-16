/**
 * /api/tenant/billing — Node runtime (Vercel default).
 *
 * Full Razorpay subscriptions surface for the rewritten /settings/billing page.
 * Implements the spec end-to-end:
 *   https://razorpay.com/docs/api/payments/subscriptions/
 *   https://razorpay.com/docs/api/payments/subscriptions/create-subscription
 *   https://razorpay.com/docs/api/payments/subscriptions/update-subscription
 *   https://razorpay.com/docs/webhooks/subscriptions/
 *
 * Contract:
 *
 * GET  → snapshot { organization, subscription, currentPlan, plans, razorpay, billingContact }
 *        DB only — no Razorpay roundtrip.
 *
 * POST { action } where action is:
 *   - "create"                  { planTier, billingCycle }
 *                                Creates a Razorpay subscription, persists row,
 *                                returns { shortUrl, checkout: { keyId, subscriptionId } }.
 *                                Reuses existing reusable subscription if same
 *                                plan+cycle is already live (status in
 *                                created/authenticated/active).
 *   - "verify-payment"          { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 *                                HMAC verify against this org's subscription_id.
 *   - "upgrade"                 { planTier, billingCycle }
 *                                PATCH /v1/subscriptions/:id with
 *                                schedule_change_at=cycle_end. Stores scheduled_change.
 *   - "cancel-scheduled-change" Cancels a pending PATCH (POST .../cancel_scheduled_changes).
 *   - "cancel"                  POST /v1/subscriptions/:id/cancel with
 *                                cancel_at_cycle_end=1. Sets cancel_at_period_end + cancel_requested_at.
 *   - "pause"                   POST /v1/subscriptions/:id/pause { pause_at: "now" }.
 *   - "resume"                  POST /v1/subscriptions/:id/resume { resume_at: "now" }.
 *                                Clears local access_suspended.
 *   - "renew"                   Same payload+behaviour as "create"; explicit name
 *                                so the UI can show a Renew button for terminal subs
 *                                (cancelled / completed / expired).
 *   - "fetch-invoices"          GET /v1/invoices?subscription_id=:id; upserts local
 *                                public.invoices and returns the merged list.
 *
 * Notes payload is org-scoped (no outlet_id) by product decision so the
 * webhook can resolve the originating organization with a single lookup.
 */

import { j } from "../../src/server/adminApiUtils.js";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext.js";
import { getRazorpayCredentials } from "../../src/server/lib/razorpay-credentials.js";
import {
  buildSubscriptionNotes,
  getRazorpayClient,
  isReusableRazorpayStatus,
  isTerminalRazorpayStatus,
  mapRazorpaySubscriptionToRow,
  rzpFetch,
  unixToIso,
  verifySubscriptionCheckoutSignature,
  type RazorpayApiError,
  type RazorpayInvoice,
  type RazorpaySubscription,
} from "../../src/server/lib/razorpay-subscriptions.js";

export const config = { maxDuration: 60 };

const EDITOR_ROLES = new Set(["owner", "admin"]);
const INVOICE_PAGE_SIZE = 24;

type BillingCycle = "month" | "year";
type PlanTier = "starter" | "growth" | "pro";

// ---------------------------------------------------------------------------
// Top-level dispatcher
// ---------------------------------------------------------------------------

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method === "GET") return getBilling(ctx);
  if (req.method === "POST") return postBilling(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

export default withOrgContext(handler);

// ---------------------------------------------------------------------------
// GET — snapshot
// ---------------------------------------------------------------------------

async function getBilling(ctx: OrgContext): Promise<Response> {
  let creds: ReturnType<typeof getRazorpayCredentials>;
  try {
    creds = getRazorpayCredentials("default");
  } catch (e) {
    return j({ ok: false, error: e instanceof Error ? e.message : "Razorpay not configured" }, 503);
  }

  const supabase = ctx.supabase;
  /**
   * Use SELECT * for `subscriptions` so the page keeps rendering even when
   * the new lifecycle migration (plan_tier / razorpay_status / paid_count /
   * charge_at / scheduled_change / access_suspended / etc.) hasn't been
   * applied yet on a given environment. Missing columns surface as
   * `undefined` on the row, which the typed frontend already treats as
   * "no value" — far better UX than the page hanging on an error.
   */
  const [orgQ, subQ, plansQ, invQ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, slug, name, currency, country, status, is_internal, trial_ends_at")
      .eq("id", ctx.organizationId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("plans")
      .select(
        "id, code, name, is_public, is_active, price_inr_month, price_inr_year, razorpay_plan_id_month, razorpay_plan_id_year, sort_order",
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

  if (orgQ.error) return j({ ok: false, error: `organizations: ${orgQ.error.message}` }, 500);
  if (!orgQ.data) return j({ ok: false, error: "Organization not found." }, 404);
  if (subQ.error) return j({ ok: false, error: `subscriptions: ${subQ.error.message}` }, 500);
  if (plansQ.error) return j({ ok: false, error: `plans: ${plansQ.error.message}` }, 500);
  if (invQ.error) return j({ ok: false, error: `invoices: ${invQ.error.message}` }, 500);

  let currentPlan: { id: string; code: string; name: string } | null = null;
  if (subQ.data?.plan_id) {
    const match = (plansQ.data ?? []).find((p) => p.id === subQ.data!.plan_id);
    if (match) {
      currentPlan = { id: match.id, code: match.code, name: match.name };
    } else {
      const { data: lookup } = await supabase
        .from("plans")
        .select("id, code, name")
        .eq("id", subQ.data.plan_id)
        .maybeSingle();
      if (lookup) currentPlan = lookup;
    }
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("email, display_name, username")
    .eq("id", ctx.user.id)
    .maybeSingle();

  let billingContactEmail: string | null = null;
  let billingPrefillName: string | null = null;
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
      razorpay: { mode: creds.isLive ? "live" : "test", keyId: creds.keyId },
      billingContactEmail,
      billingPrefillName,
    },
    200,
  );
}

// ---------------------------------------------------------------------------
// POST — action dispatcher
// ---------------------------------------------------------------------------

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
    case "create":
    case "renew":
      return createOrRenewAction(ctx, body, creds, action === "renew");
    case "verify-payment":
      return verifyPaymentAction(ctx, body, creds);
    case "upgrade":
      return upgradeAction(ctx, body);
    case "cancel-scheduled-change":
      return cancelScheduledChangeAction(ctx);
    case "cancel":
      return cancelAction(ctx);
    case "pause":
      return pauseAction(ctx);
    case "resume":
      return resumeAction(ctx);
    case "fetch-invoices":
      return fetchInvoicesAction(ctx);
    default:
      return j({ ok: false, error: `Unknown action: ${action}` }, 400);
  }
}

// ---------------------------------------------------------------------------
// Plan / cycle resolution
// ---------------------------------------------------------------------------

function normaliseCycle(raw: unknown): BillingCycle {
  if (raw === "year" || raw === "yearly" || raw === "annual") return "year";
  return "month";
}

function normaliseTier(raw: unknown): PlanTier | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "starter" || s === "growth" || s === "pro") return s;
  return null;
}

async function resolvePlanRow(
  ctx: OrgContext,
  tier: PlanTier,
): Promise<{
  id: string;
  code: string;
  name: string;
  razorpay_plan_id_month: string | null;
  razorpay_plan_id_year: string | null;
} | null> {
  const { data, error } = await ctx.supabase
    .from("plans")
    .select("id, code, name, razorpay_plan_id_month, razorpay_plan_id_year, is_active, is_public")
    .eq("code", tier)
    .maybeSingle();
  if (error || !data || !data.is_active || !data.is_public) return null;
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    razorpay_plan_id_month: data.razorpay_plan_id_month ?? null,
    razorpay_plan_id_year: data.razorpay_plan_id_year ?? null,
  };
}

// ---------------------------------------------------------------------------
// Actions: create / renew
// ---------------------------------------------------------------------------

async function createOrRenewAction(
  ctx: OrgContext,
  body: Record<string, unknown>,
  creds: ReturnType<typeof getRazorpayCredentials>,
  isRenewExplicit: boolean,
): Promise<Response> {
  if (ctx.isInternal) {
    return j(
      { ok: false, error: "This workspace is managed internally and is not billed via Razorpay." },
      400,
    );
  }

  const tier = normaliseTier(body.planTier ?? body.tier ?? body.planCode);
  const cycle = normaliseCycle(body.billingCycle ?? body.interval ?? body.cycle);
  if (!tier) return j({ ok: false, error: "planTier must be one of: starter, growth, pro." }, 400);

  const plan = await resolvePlanRow(ctx, tier);
  if (!plan) return j({ ok: false, error: `Plan "${tier}" is not available for subscription.` }, 404);

  const razorpayPlanId = cycle === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
  if (!razorpayPlanId) {
    return j(
      {
        ok: false,
        error: `Missing Razorpay ${cycle}ly plan id for "${plan.code}". Set it in Platform → Plans.`,
      },
      400,
    );
  }

  const { data: currentSub, error: subErr } = await ctx.supabase
    .from("subscriptions")
    .select(
      "id, plan_id, status, razorpay_status, interval, billing_cycle, razorpay_subscription_id, razorpay_customer_id, short_url",
    )
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subErr) return j({ ok: false, error: subErr.message }, 500);

  // Reuse: same tier + cycle and the Razorpay sub is still reusable. Renew
  // explicitly bypasses reuse because the user asked for a fresh mandate.
  if (
    !isRenewExplicit &&
    currentSub?.razorpay_subscription_id &&
    currentSub.plan_id === plan.id &&
    (currentSub.billing_cycle ?? currentSub.interval) === cycle &&
    isReusableRazorpayStatus(currentSub.razorpay_status ?? null)
  ) {
    try {
      const client = await getRazorpayClient();
      const fresh = await client.subscriptions.fetch(currentSub.razorpay_subscription_id);
      return j(
        {
          ok: true,
          reused: true,
          subscriptionId: fresh.id,
          shortUrl: fresh.short_url ?? null,
          checkout: {
            keyId: creds.keyId,
            subscriptionId: fresh.id,
            customerId: fresh.customer_id ?? currentSub.razorpay_customer_id ?? null,
            shortUrl: fresh.short_url ?? null,
          },
        },
        200,
      );
    } catch {
      // Fall through to create a fresh subscription.
    }
  }

  const notes = buildSubscriptionNotes({
    organizationId: ctx.organizationId,
    organizationSlug: ctx.organizationSlug,
    planTier: tier,
    billingCycle: cycle,
    adminUserId: ctx.user.id,
  });

  // Spec body. customer_id is intentionally omitted — Razorpay assigns it
  // after the customer completes mandate authorisation.
  const createReq: Record<string, unknown> = {
    plan_id: razorpayPlanId,
    total_count: cycle === "year" ? 1 : 12,
    quantity: 1,
    customer_notify: true,
    notes,
  };

  let sub: RazorpaySubscription;
  try {
    const client = await getRazorpayClient();
    sub = await client.subscriptions.create(createReq);
  } catch (err) {
    return billingError(err);
  }

  const mapped = mapRazorpaySubscriptionToRow(sub);
  const updatePayload = {
    plan_id: plan.id,
    interval: cycle,
    billing_cycle: cycle,
    plan_tier: tier,
    cancel_at_period_end: false,
    cancel_requested_at: null,
    scheduled_change: null,
    access_suspended: false,
    short_url: sub.short_url ?? null,
    ...mapped,
  };

  if (currentSub?.id) {
    const { error } = await ctx.supabase.from("subscriptions").update(updatePayload).eq("id", currentSub.id);
    if (error) console.error("[billing] subscriptions update failed", error);
  } else {
    const { error } = await ctx.supabase.from("subscriptions").insert({
      organization_id: ctx.organizationId,
      ...updatePayload,
    });
    if (error && (error as { code?: string }).code === "23505") {
      // Webhook landed first and inserted the row; fall back to update by sub id.
      await ctx.supabase
        .from("subscriptions")
        .update(updatePayload)
        .eq("razorpay_subscription_id", sub.id);
    } else if (error) {
      console.error("[billing] subscriptions insert failed", error);
    }
  }

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: isRenewExplicit ? "subscription.renewed" : "subscription.created",
    target_type: "subscription",
    target_id: sub.id,
    meta: { plan_tier: tier, billing_cycle: cycle, source: "tenant" },
  });

  return j(
    {
      ok: true,
      reused: false,
      subscriptionId: sub.id,
      shortUrl: sub.short_url ?? null,
      checkout: {
        keyId: creds.keyId,
        subscriptionId: sub.id,
        customerId: sub.customer_id ?? null,
        shortUrl: sub.short_url ?? null,
      },
    },
    200,
  );
}

// ---------------------------------------------------------------------------
// Actions: verify-payment
// ---------------------------------------------------------------------------

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
      { ok: false, error: "Missing razorpay_payment_id, razorpay_subscription_id, or razorpay_signature." },
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

// ---------------------------------------------------------------------------
// Actions: upgrade (PATCH at cycle_end)
// ---------------------------------------------------------------------------

async function upgradeAction(ctx: OrgContext, body: Record<string, unknown>): Promise<Response> {
  if (ctx.isInternal) {
    return j({ ok: false, error: "Internal workspaces have no Razorpay subscription to upgrade." }, 400);
  }
  const tier = normaliseTier(body.planTier ?? body.tier ?? body.planCode);
  const cycle = normaliseCycle(body.billingCycle ?? body.interval ?? body.cycle);
  if (!tier) return j({ ok: false, error: "planTier must be one of: starter, growth, pro." }, 400);

  const plan = await resolvePlanRow(ctx, tier);
  if (!plan) return j({ ok: false, error: `Plan "${tier}" is not available for subscription.` }, 404);
  const razorpayPlanId = cycle === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;
  if (!razorpayPlanId) {
    return j(
      {
        ok: false,
        error: `Missing Razorpay ${cycle}ly plan id for "${plan.code}". Set it in Platform → Plans.`,
      },
      400,
    );
  }

  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, plan_id, razorpay_subscription_id, razorpay_status")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub?.razorpay_subscription_id) {
    return j({ ok: false, error: "No active Razorpay subscription to upgrade." }, 404);
  }
  if (!isReusableRazorpayStatus(sub.razorpay_status ?? null)) {
    return j(
      {
        ok: false,
        error: `Cannot upgrade a subscription in status "${sub.razorpay_status}". Renew first.`,
      },
      409,
    );
  }
  if (sub.plan_id === plan.id) {
    return j({ ok: false, error: "Selected plan is already active." }, 400);
  }

  try {
    await rzpFetch<RazorpaySubscription>(
      "PATCH",
      `/subscriptions/${encodeURIComponent(sub.razorpay_subscription_id)}`,
      {
        plan_id: razorpayPlanId,
        quantity: 1,
        remaining_count: cycle === "year" ? 1 : 12,
        schedule_change_at: "cycle_end",
        customer_notify: 1,
      },
    );
  } catch (err) {
    return billingError(err);
  }

  await ctx.supabase
    .from("subscriptions")
    .update({
      scheduled_change: {
        plan_id: plan.id,
        plan_tier: tier,
        billing_cycle: cycle,
        razorpay_plan_id: razorpayPlanId,
        requested_at: new Date().toISOString(),
      },
    })
    .eq("id", sub.id);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.upgrade_scheduled",
    target_type: "subscription",
    target_id: sub.razorpay_subscription_id,
    meta: { plan_tier: tier, billing_cycle: cycle, source: "tenant" },
  });

  return j({ ok: true, message: "Plan change scheduled at next renewal." }, 200);
}

// ---------------------------------------------------------------------------
// Actions: cancel-scheduled-change
// ---------------------------------------------------------------------------

async function cancelScheduledChangeAction(ctx: OrgContext): Promise<Response> {
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id, scheduled_change")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub?.razorpay_subscription_id) {
    return j({ ok: false, error: "No subscription with a scheduled change." }, 404);
  }
  if (!sub.scheduled_change) {
    return j({ ok: true, message: "No scheduled change to cancel.", noop: true }, 200);
  }

  try {
    await rzpFetch(
      "POST",
      `/subscriptions/${encodeURIComponent(sub.razorpay_subscription_id)}/cancel_scheduled_changes`,
    );
  } catch (err) {
    return billingError(err);
  }

  await ctx.supabase.from("subscriptions").update({ scheduled_change: null }).eq("id", sub.id);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.upgrade_cancelled",
    target_type: "subscription",
    target_id: sub.razorpay_subscription_id,
    meta: { source: "tenant" },
  });

  return j({ ok: true, message: "Scheduled plan change cancelled." }, 200);
}

// ---------------------------------------------------------------------------
// Actions: cancel
// ---------------------------------------------------------------------------

async function cancelAction(ctx: OrgContext): Promise<Response> {
  if (ctx.isInternal) {
    return j({ ok: false, error: "Internal workspaces have no Razorpay subscription to cancel." }, 400);
  }
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id, razorpay_status")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub?.razorpay_subscription_id) {
    return j({ ok: false, error: "No subscription to cancel." }, 404);
  }
  if (isTerminalRazorpayStatus(sub.razorpay_status ?? null)) {
    return j({ ok: false, error: "Subscription is already in a terminal state." }, 409);
  }

  try {
    await rzpFetch(
      "POST",
      `/subscriptions/${encodeURIComponent(sub.razorpay_subscription_id)}/cancel`,
      { cancel_at_cycle_end: 1 },
    );
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
    meta: { source: "tenant", mode: "cycle_end" },
  });

  return j({ ok: true, message: "Subscription will cancel at the end of the current period." }, 200);
}

// ---------------------------------------------------------------------------
// Actions: pause / resume
// ---------------------------------------------------------------------------

async function pauseAction(ctx: OrgContext): Promise<Response> {
  if (ctx.isInternal) {
    return j({ ok: false, error: "Internal workspaces cannot pause billing." }, 400);
  }
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id, razorpay_status")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub?.razorpay_subscription_id) return j({ ok: false, error: "No subscription to pause." }, 404);
  if (sub.razorpay_status === "paused") {
    return j({ ok: true, message: "Subscription is already paused.", noop: true }, 200);
  }

  try {
    await rzpFetch(
      "POST",
      `/subscriptions/${encodeURIComponent(sub.razorpay_subscription_id)}/pause`,
      { pause_at: "now" },
    );
  } catch (err) {
    return billingError(err);
  }

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.paused_requested",
    target_type: "subscription",
    target_id: sub.razorpay_subscription_id,
    meta: { source: "tenant" },
  });

  return j({ ok: true, message: "Subscription paused." }, 200);
}

async function resumeAction(ctx: OrgContext): Promise<Response> {
  if (ctx.isInternal) {
    return j({ ok: false, error: "Internal workspaces have no billing to resume." }, 400);
  }
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id, razorpay_status, cancel_at_period_end")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub) return j({ ok: false, error: "No subscription to resume." }, 404);

  // If the user just wants to undo a pending cancel (no Razorpay call needed).
  // Note: Razorpay does not provide an "undo cancel_at_cycle_end" endpoint —
  // once cancel is scheduled there, the only way to revive billing is a fresh
  // subscription at cycle end. We keep the local flag flip behaviour from the
  // previous implementation so the UI matches user intent even though Razorpay
  // will still cancel.
  if (sub.cancel_at_period_end && sub.razorpay_status !== "paused") {
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
      target_id: sub.razorpay_subscription_id ?? sub.id,
      meta: { source: "tenant" },
    });
    return j({ ok: true, message: "Cancellation flag cleared locally." }, 200);
  }

  if (!sub.razorpay_subscription_id) {
    return j({ ok: false, error: "No Razorpay subscription to resume." }, 404);
  }
  if (sub.razorpay_status !== "paused") {
    return j({ ok: true, message: "Subscription is not paused.", noop: true }, 200);
  }

  try {
    await rzpFetch(
      "POST",
      `/subscriptions/${encodeURIComponent(sub.razorpay_subscription_id)}/resume`,
      { resume_at: "now" },
    );
  } catch (err) {
    return billingError(err);
  }

  await ctx.supabase
    .from("subscriptions")
    .update({ access_suspended: false })
    .eq("id", sub.id);

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "subscription.resumed_requested",
    target_type: "subscription",
    target_id: sub.razorpay_subscription_id,
    meta: { source: "tenant" },
  });

  return j({ ok: true, message: "Subscription resumed." }, 200);
}

// ---------------------------------------------------------------------------
// Actions: fetch-invoices
// ---------------------------------------------------------------------------

async function fetchInvoicesAction(ctx: OrgContext): Promise<Response> {
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub?.razorpay_subscription_id) {
    return j({ ok: true, invoices: [] }, 200);
  }

  let list: { items?: RazorpayInvoice[] };
  try {
    list = await rzpFetch<{ items?: RazorpayInvoice[] }>(
      "GET",
      `/invoices?subscription_id=${encodeURIComponent(sub.razorpay_subscription_id)}&count=100`,
    );
  } catch (err) {
    return billingError(err);
  }

  const items = list?.items ?? [];

  // Upsert each into public.invoices, keyed by (organization_id, provider_invoice_id).
  for (const inv of items) {
    if (!inv?.id) continue;
    const status =
      inv.status === "paid"
        ? "paid"
        : inv.status === "issued"
          ? "issued"
          : inv.status === "expired"
            ? "cancelled"
            : "failed";
    const amountPaise = Number(inv.amount_paid ?? inv.amount ?? 0);
    const amountInr = Number.isFinite(amountPaise) ? amountPaise / 100 : 0;

    const { data: existing } = await ctx.supabase
      .from("invoices")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("provider_invoice_id", inv.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await ctx.supabase
        .from("invoices")
        .update({
          status,
          amount_inr: amountInr,
          paid_at: unixToIso(inv.paid_at ?? inv.issued_at),
          short_url: inv.short_url ?? null,
          provider_payment_id: inv.payment_id ?? null,
          raw: inv as unknown as Record<string, unknown>,
        })
        .eq("id", existing.id);
    } else {
      await ctx.supabase.from("invoices").insert({
        organization_id: ctx.organizationId,
        subscription_id: sub.id,
        provider: "razorpay",
        provider_invoice_id: inv.id,
        provider_subscription_id: sub.razorpay_subscription_id,
        provider_payment_id: inv.payment_id ?? null,
        status,
        amount_inr: amountInr,
        currency: inv.currency || "INR",
        period_start: unixToIso(inv.period_start),
        period_end: unixToIso(inv.period_end),
        paid_at: unixToIso(inv.paid_at ?? inv.issued_at),
        short_url: inv.short_url ?? null,
        raw: inv as unknown as Record<string, unknown>,
      });
    }
  }

  const { data: refreshed } = await ctx.supabase
    .from("invoices")
    .select(
      "id, status, amount_inr, currency, period_start, period_end, paid_at, short_url, provider_invoice_id, provider_payment_id, provider_subscription_id, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(INVOICE_PAGE_SIZE);

  return j({ ok: true, invoices: refreshed ?? [] }, 200);
}

// ---------------------------------------------------------------------------
// Error normalisation
// ---------------------------------------------------------------------------

function billingError(err: unknown): Response {
  const anyErr = err as Partial<RazorpayApiError> & {
    statusCode?: number;
    error?: { description?: string; code?: string } | null;
  };
  const msg =
    anyErr?.description ||
    anyErr?.error?.description ||
    anyErr?.message ||
    "Razorpay request failed.";
  const status = Number(anyErr?.status ?? anyErr?.statusCode ?? 0);
  return j(
    {
      ok: false,
      error: msg,
      provider: "razorpay",
      status: status || undefined,
      provider_body: anyErr?.body ?? anyErr?.error ?? null,
    },
    502,
  );
}
