/**
 * Razorpay subscription webhook handler (Node-only).
 *
 * Called from /api/razorpay/webhook when the incoming event is a subscription
 * or invoice lifecycle event. Handles all 9 subscription events plus invoice
 * events per https://razorpay.com/docs/webhooks/subscriptions/.
 *
 * Important: the dispatcher in api/razorpay/webhook.ts verifies the signature
 * BEFORE calling us. We intentionally do NOT re-verify here — a single
 * verification point at the edge prevents the two paths from drifting on
 * secret-resolution rules.
 *
 * State writes:
 *   - subscriptions.status keeps the INTERNAL bucket vocabulary used by
 *     organization-action.ts and OrganizationSettings.tsx
 *     (active / trialing / past_due / canceled / paused / suspended).
 *   - subscriptions.razorpay_status carries the verbatim 9-state value for
 *     the new Billing page.
 *   - subscriptions.paid_count / remaining_count / charge_at /
 *     last_payment_id / last_payment_amount / access_suspended are mirrored
 *     from the payload on every applicable event. paid_count is ALWAYS set
 *     from the payload (never incremented) so duplicate or out-of-order
 *     deliveries stay idempotent.
 *   - invoices are inserted ONLY from invoice.* events (subscription.charged
 *     does not insert, to avoid double-counting against the same charge).
 */

import { RZP_STATUS_TO_INTERNAL } from "./razorpay-subscriptions.js";

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
  "invoice.paid",
  "invoice.partially_paid",
  "invoice.expired",
]);

export function isSubscriptionWebhookEvent(evt?: string): boolean {
  if (!evt) return false;
  return SUBSCRIPTION_EVENTS.has(evt);
}

function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  return undefined;
}

function unixToIso(n: number | null | undefined): string | null {
  if (!n || Number.isNaN(n)) return null;
  return new Date(n * 1000).toISOString();
}

async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url) throw Object.assign(new Error("Supabase URL missing"), { status: 500 });
  if (!key) throw Object.assign(new Error("Supabase key missing"), { status: 500 });
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-subscription-webhook" } },
  });
}

type SubscriptionEntity = {
  id: string;
  status: string;
  plan_id?: string;
  customer_id?: string;
  paid_count?: number;
  total_count?: number;
  remaining_count?: number;
  current_start?: number | null;
  current_end?: number | null;
  start_at?: number | null;
  end_at?: number | null;
  charge_at?: number | null;
  short_url?: string | null;
  notes?: Record<string, string> | null;
};

type InvoiceEntity = {
  id: string;
  status: string;
  subscription_id?: string | null;
  amount?: number;
  amount_paid?: number;
  currency?: string;
  short_url?: string | null;
  paid_at?: number | null;
  issued_at?: number | null;
  period_start?: number | null;
  period_end?: number | null;
};

type PaymentEntity = {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
};

type Args = {
  event: string;
  /** Raw body kept in the args for parity with the dispatcher; not used here. */
  rawBody: string;
  /** Signature kept in the args for parity; verification is done by the dispatcher. */
  signature: string;
  data: {
    event?: string;
    payload?: {
      subscription?: { entity?: SubscriptionEntity };
      invoice?: { entity?: InvoiceEntity };
      payment?: { entity?: PaymentEntity };
    };
  };
};

type Outcome = {
  received: true;
  event: string;
  subscriptionId?: string;
  invoiceId?: string;
  message?: string;
};

// ---------------------------------------------------------------------------
// Main entry — dispatches on event name
// ---------------------------------------------------------------------------

export async function handleSubscriptionWebhookEvent(args: Args): Promise<Outcome> {
  const { event, data } = args;
  const supabase = await getSupabase();

  const subEntity = data?.payload?.subscription?.entity ?? null;
  const invEntity = data?.payload?.invoice?.entity ?? null;
  const payEntity = data?.payload?.payment?.entity ?? null;

  // -----------------------------------------------------------------------
  // Subscription events
  // -----------------------------------------------------------------------
  if (subEntity?.id) {
    const subId = subEntity.id;

    const { data: existingRow } = await supabase
      .from("subscriptions")
      .select(
        "id, organization_id, plan_id, plan_tier, billing_cycle, scheduled_change, razorpay_subscription_id, access_suspended, access_suspended_at",
      )
      .eq("razorpay_subscription_id", subId)
      .maybeSingle();

    let orgId: string | null = existingRow?.organization_id ?? null;
    if (!orgId) {
      const notesOrg = subEntity.notes?.organization_id;
      if (notesOrg) orgId = String(notesOrg);
    }

    const updatePayload = buildSubscriptionUpdate(event, subEntity, payEntity, existingRow);

    if (existingRow) {
      await supabase.from("subscriptions").update(updatePayload).eq("id", existingRow.id);
    } else if (orgId) {
      // Look for a blank row attached to the org that the tenant API may have
      // started but the create call hasn't returned yet.
      const { data: blankRow } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("organization_id", orgId)
        .is("razorpay_subscription_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (blankRow) {
        await supabase.from("subscriptions").update(updatePayload).eq("id", blankRow.id);
      } else {
        const insertPayload: Record<string, unknown> = {
          organization_id: orgId,
          interval: deriveCycle(subEntity),
          billing_cycle: deriveCycle(subEntity),
          plan_tier: subEntity.notes?.plan_tier ?? null,
          ...updatePayload,
        };
        const { error: insErr } = await supabase.from("subscriptions").insert(insertPayload);
        const dup = insErr && (insErr as { code?: string }).code === "23505";
        if (dup) {
          await supabase
            .from("subscriptions")
            .update(updatePayload)
            .eq("razorpay_subscription_id", subId);
        } else if (insErr) {
          console.error("[subscription-webhook] insert failed", insErr);
        }
      }
    } else {
      console.warn("[subscription-webhook] could not resolve organization", { subId, event });
    }

    // Welcome / cancellation emails are best-effort and never block the
    // webhook. Templates that don't exist are silently skipped.
    if (orgId && (event === "subscription.authenticated" || event === "subscription.activated")) {
      sendOptionalEmail(supabase, orgId, "subscription_welcome").catch((err) =>
        console.warn("[subscription-webhook] welcome email skipped", (err as Error).message),
      );
    }
    if (orgId && event === "subscription.cancelled") {
      sendOptionalEmail(supabase, orgId, "subscription_cancelled").catch((err) =>
        console.warn("[subscription-webhook] cancellation email skipped", (err as Error).message),
      );
    }

    await supabase.from("audit_log").insert({
      actor_type: "webhook",
      actor_label: "razorpay",
      organization_id: orgId,
      action: event,
      target_type: "subscription",
      target_id: subId,
      meta: {
        status: subEntity.status,
        plan_id: subEntity.plan_id ?? null,
        paid_count: subEntity.paid_count ?? null,
        remaining_count: subEntity.remaining_count ?? null,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Invoice events
  // -----------------------------------------------------------------------
  if (invEntity?.id) {
    const invId = invEntity.id;
    const subRef = invEntity.subscription_id ?? subEntity?.id ?? null;

    let orgId: string | null = null;
    let localSubId: string | null = null;
    if (subRef) {
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("id, organization_id")
        .eq("razorpay_subscription_id", subRef)
        .maybeSingle();
      if (subRow) {
        orgId = subRow.organization_id;
        localSubId = subRow.id;
      }
    }

    if (orgId) {
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("organization_id", orgId)
        .eq("provider_invoice_id", invId)
        .limit(1)
        .maybeSingle();

      const status =
        invEntity.status === "paid"
          ? "paid"
          : invEntity.status === "issued"
            ? "issued"
            : invEntity.status === "expired"
              ? "cancelled"
              : "failed";
      const amountPaise = Number(invEntity.amount_paid ?? invEntity.amount ?? 0);
      const amountInr = Number.isFinite(amountPaise) ? amountPaise / 100 : 0;

      if (!existing) {
        await supabase.from("invoices").insert({
          organization_id: orgId,
          subscription_id: localSubId,
          provider: "razorpay",
          provider_invoice_id: invId,
          provider_subscription_id: subRef,
          provider_payment_id: payEntity?.id ?? null,
          status,
          amount_inr: amountInr,
          currency: invEntity.currency || "INR",
          period_start: unixToIso(invEntity.period_start),
          period_end: unixToIso(invEntity.period_end),
          paid_at: unixToIso(invEntity.paid_at ?? invEntity.issued_at),
          short_url: invEntity.short_url ?? null,
          raw: invEntity,
        });
      } else {
        await supabase
          .from("invoices")
          .update({
            status,
            amount_inr: amountInr,
            paid_at: unixToIso(invEntity.paid_at ?? invEntity.issued_at),
            short_url: invEntity.short_url ?? null,
            provider_payment_id: payEntity?.id ?? null,
            raw: invEntity,
          })
          .eq("id", existing.id);
      }
    }

    await supabase.from("audit_log").insert({
      actor_type: "webhook",
      actor_label: "razorpay",
      organization_id: orgId,
      action: event,
      target_type: "invoice",
      target_id: invId,
      meta: { subscription_id: subRef, amount_paid: invEntity.amount_paid ?? null },
    });

    // Payment success receipt email (only on invoice.paid). Best-effort —
    // never blocks the webhook so the invoice row is always persisted.
    if (orgId && event === "invoice.paid") {
      try {
        const paise = Number(invEntity.amount_paid ?? invEntity.amount ?? 0);
        await sendPaymentSuccessEmail(supabase, orgId, {
          invoiceId: invId,
          amountInr: Number.isFinite(paise) ? paise / 100 : 0,
          periodEndUnix: invEntity.period_end ?? null,
          shortUrl: invEntity.short_url ?? null,
        });
      } catch (mailErr) {
        console.warn("[subscription-webhook] invoice.paid email failed", (mailErr as Error).message);
      }
    }

    return { received: true, event, invoiceId: invId, subscriptionId: subRef ?? undefined };
  }

  return { received: true, event, subscriptionId: subEntity?.id };
}

// ---------------------------------------------------------------------------
// Per-event subscription update builder
// ---------------------------------------------------------------------------

function deriveCycle(sub: SubscriptionEntity): "month" | "year" {
  // Razorpay doesn't return the period directly on the subscription resource;
  // we derive from notes (most reliable) or default to month.
  const fromNotes = (sub.notes?.billing_cycle ?? "").toString().toLowerCase();
  if (fromNotes === "year") return "year";
  return "month";
}

function buildSubscriptionUpdate(
  event: string,
  sub: SubscriptionEntity,
  pay: PaymentEntity | null,
  existing:
    | {
        id: string;
        plan_tier?: string | null;
        billing_cycle?: string | null;
        scheduled_change?: Record<string, unknown> | null;
        access_suspended?: boolean | null;
        access_suspended_at?: string | null;
      }
    | null,
): Record<string, unknown> {
  const internalStatus = RZP_STATUS_TO_INTERNAL[sub.status] ?? "active";
  // Helper for false->true transitions: only stamp `access_suspended_at` the
  // first time the subscription enters a suspended state, so retries of the
  // same halted/cancelled event don't keep resetting the grace clock.
  const nowIso = new Date().toISOString();
  const suspendIfFresh = (target: Record<string, unknown>) => {
    target.access_suspended = true;
    const wasSuspended = !!existing?.access_suspended;
    const hadAnchor =
      typeof existing?.access_suspended_at === "string" && existing.access_suspended_at.length > 0;
    if (!wasSuspended || !hadAnchor) {
      target.access_suspended_at = nowIso;
    }
  };
  const restoreAccess = (target: Record<string, unknown>) => {
    target.access_suspended = false;
    target.access_suspended_at = null;
  };
  const update: Record<string, unknown> = {
    status: internalStatus,
    razorpay_status: sub.status,
    razorpay_subscription_id: sub.id,
    razorpay_customer_id: sub.customer_id ?? null,
    provider: "razorpay",
    provider_subscription_id: sub.id,
    provider_customer_id: sub.customer_id ?? null,
    current_period_start: unixToIso(sub.current_start),
    current_period_end: unixToIso(sub.current_end),
    start_at: unixToIso(sub.start_at),
    end_at: unixToIso(sub.end_at),
    charge_at: unixToIso(sub.charge_at),
    total_count: typeof sub.total_count === "number" ? sub.total_count : null,
    paid_count: typeof sub.paid_count === "number" ? sub.paid_count : 0,
    remaining_count: typeof sub.remaining_count === "number" ? sub.remaining_count : null,
    short_url: sub.short_url ?? null,
  };

  switch (event) {
    case "subscription.authenticated":
      restoreAccess(update);
      break;
    case "subscription.activated":
      restoreAccess(update);
      update.cancel_at_period_end = false;
      update.cancel_requested_at = null;
      break;
    case "subscription.charged":
      // Counters already set above from payload; capture the payment too.
      if (pay?.id) update.last_payment_id = pay.id;
      if (typeof pay?.amount === "number") update.last_payment_amount = pay.amount;
      restoreAccess(update);
      break;
    case "subscription.pending":
      // Razorpay is retrying; spec says soft warning, do NOT suspend access.
      restoreAccess(update);
      break;
    case "subscription.halted":
      suspendIfFresh(update);
      break;
    case "subscription.cancelled":
      suspendIfFresh(update);
      update.cancel_at_period_end = true;
      if (!existing) update.cancel_requested_at = nowIso;
      break;
    case "subscription.completed":
      suspendIfFresh(update);
      break;
    case "subscription.updated": {
      // Razorpay applied the scheduled plan change. If we tracked a
      // scheduled_change row that matches, clear it and update plan_tier /
      // billing_cycle to match the new state.
      const scheduled = existing?.scheduled_change as
        | { plan_id?: string; razorpay_plan_id?: string; plan_tier?: string; billing_cycle?: string }
        | null
        | undefined;
      if (scheduled && (scheduled.razorpay_plan_id ?? scheduled.plan_id) === sub.plan_id) {
        update.scheduled_change = null;
        if (scheduled.plan_id) update.plan_id = scheduled.plan_id;
        if (scheduled.plan_tier) update.plan_tier = scheduled.plan_tier;
        if (scheduled.billing_cycle) {
          update.billing_cycle = scheduled.billing_cycle;
          update.interval = scheduled.billing_cycle;
        }
      }
      break;
    }
    case "subscription.paused":
      suspendIfFresh(update);
      break;
    case "subscription.resumed":
      restoreAccess(update);
      break;
    default:
      // Unknown subscription event — still mirror the latest snapshot.
      break;
  }

  return update;
}

// ---------------------------------------------------------------------------
// Email helpers (best-effort; never block the webhook)
// ---------------------------------------------------------------------------

async function sendOptionalEmail(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  organizationId: string,
  kind: string,
): Promise<void> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM");
  if (!apiKey || !from) return;

  // We dynamically import the email module so that if the template kind
  // doesn't exist yet, we never break the webhook. The send is wrapped in a
  // try/catch at the call site too.
  const mod = (await import("../email.js")) as unknown as {
    sendEmail?: (args: Record<string, unknown>) => Promise<unknown>;
  };
  if (typeof mod.sendEmail !== "function") return;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  const { data: ownerLink } = await supabase
    .from("org_memberships")
    .select("admin_user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
    .limit(5);
  const adminIds = (ownerLink ?? []).map((r: { admin_user_id: string }) => r.admin_user_id);
  if (adminIds.length === 0) return;

  const { data: users } = await supabase
    .from("admin_users")
    .select("id, email, display_name, username")
    .in("id", adminIds)
    .not("email", "is", null);
  const recipient = (users ?? []).find(
    (u: { email: string | null }) => typeof u.email === "string" && u.email.includes("@"),
  );
  if (!recipient) return;

  try {
    await mod.sendEmail({
      kind,
      to: recipient.email as string,
      vars: {
        appBaseUrl: (env("APP_BASE_URL") || "https://www.cuetronix.com").replace(/\/+$/, ""),
        displayName: (recipient.display_name as string | null) || recipient.username,
        organizationName: (org?.name as string | null) || undefined,
      },
      organizationId,
      adminUserId: recipient.id as string,
      supabase,
    });
  } catch (err) {
    // Templates may not exist for these kinds yet; that is intentional.
    console.warn(`[subscription-webhook] ${kind} email skipped`, (err as Error).message);
  }
}

async function sendPaymentSuccessEmail(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  organizationId: string,
  payload: {
    invoiceId: string;
    amountInr: number;
    periodEndUnix: number | null;
    shortUrl: string | null;
  },
): Promise<void> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM");
  if (!apiKey || !from) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  const { data: ownerLink } = await supabase
    .from("org_memberships")
    .select("admin_user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
    .limit(5);
  const adminIds = (ownerLink ?? []).map((r: { admin_user_id: string }) => r.admin_user_id);
  if (adminIds.length === 0) return;

  const { data: users } = await supabase
    .from("admin_users")
    .select("id, email, display_name, username")
    .in("id", adminIds)
    .not("email", "is", null);
  const recipient = (users ?? []).find(
    (u: { email: string | null }) => typeof u.email === "string" && u.email.includes("@"),
  );
  if (!recipient) return;

  const planRes = await supabase
    .from("subscriptions")
    .select("plan_id, plans(code, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  type PlanJoinRow = {
    plans?: { code?: string; name?: string } | { code?: string; name?: string }[] | null;
  };
  const joined = (planRes.data as PlanJoinRow | null)?.plans;
  const planMeta = Array.isArray(joined) ? joined[0] : joined;
  const planName: string = planMeta?.name || planMeta?.code || "Subscription";

  const base = (env("APP_BASE_URL") || "https://www.cuetronix.com").replace(/\/+$/, "");
  const periodEndDisplay = payload.periodEndUnix
    ? new Date(payload.periodEndUnix * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  const amountDisplay = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(payload.amountInr);

  const { sendEmail } = await import("../email.js");
  await sendEmail({
    kind: "payment_success",
    to: recipient.email as string,
    vars: {
      appBaseUrl: base,
      displayName: (recipient.display_name as string | null) || recipient.username,
      organizationName: (org?.name as string | null) || undefined,
      amountDisplay,
      planName,
      invoiceNumber: payload.invoiceId,
      periodEnd: periodEndDisplay,
      billingPortalUrl: payload.shortUrl || `${base}/subscription`,
    },
    organizationId,
    adminUserId: recipient.id as string,
    supabase,
  });
}
