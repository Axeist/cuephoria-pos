/**
 * Razorpay subscription webhook processing (Node-only).
 *
 * Called from /api/razorpay/webhook when the incoming event is a subscription
 * or invoice lifecycle event. We:
 *   1. Verify the HMAC SHA256 signature (strict — failures return 401).
 *   2. Upsert the local `subscriptions` row keyed by razorpay_subscription_id.
 *   3. Record `invoices` rows for invoice.paid / invoice.issued events.
 *   4. Append an audit_log entry for every processed event.
 *
 * Idempotency
 *   - Subscription upserts use the razorpay_subscription_id unique index to
 *     noop on duplicate deliveries.
 *   - Invoice inserts use a (organization_id, provider_invoice_id) guard to
 *     prevent double-counting if Razorpay retries.
 */

import { createHmac, timingSafeEqual } from "crypto";

// Local env helper — webhook file lives outside src/server/ bundling scope
function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  return undefined;
}

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

const RZP_STATUS_TO_INTERNAL: Record<string, string> = {
  created: "trialing",
  authenticated: "trialing",
  active: "active",
  pending: "past_due",
  halted: "past_due",
  cancelled: "canceled",
  completed: "canceled",
  expired: "canceled",
  paused: "paused",
};

function unixToIso(n: number | null | undefined): string | null {
  if (!n || Number.isNaN(n)) return null;
  return new Date(n * 1000).toISOString();
}

function getWebhookSecret(): string {
  const mode = env("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  const secret = isLive
    ? env("RAZORPAY_WEBHOOK_SECRET_LIVE") || env("RAZORPAY_WEBHOOK_SECRET")
    : env("RAZORPAY_WEBHOOK_SECRET_TEST") || env("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    throw Object.assign(new Error("Webhook secret not configured"), { status: 500 });
  }
  return secret;
}

function verifySignature(rawBody: string, signature: string): boolean {
  if (!signature || !rawBody) return false;
  try {
    const secret = getWebhookSecret();
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    env("SUPABASE_SERVICE_ROLE_KEY") ||
    env("SUPABASE_ANON_KEY") ||
    env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url) throw Object.assign(new Error("Supabase URL missing"), { status: 500 });
  if (!key) throw Object.assign(new Error("Supabase key missing"), { status: 500 });
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-subscription-webhook" } },
  });
}

type Args = {
  event: string;
  rawBody: string;
  signature: string;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

type Outcome = {
  received: true;
  event: string;
  subscriptionId?: string;
  invoiceId?: string;
  message?: string;
};

export async function handleSubscriptionWebhookEvent(args: Args): Promise<Outcome> {
  const { event, rawBody, signature, data } = args;

  if (!verifySignature(rawBody, signature)) {
    throw Object.assign(new Error("Invalid webhook signature"), { status: 401 });
  }

  const supabase = await getSupabase();

  const subPayload = data?.payload?.subscription?.entity || null;
  const invoicePayload = data?.payload?.invoice?.entity || null;
  const paymentPayload = data?.payload?.payment?.entity || null;

  // ---------------------------------------------------------------------
  // Subscription events
  // ---------------------------------------------------------------------
  if (subPayload?.id) {
    const subId: string = subPayload.id;
    // Resolve the local subscription row by razorpay_subscription_id or by notes fallback.
    let orgId: string | null = subPayload?.notes?.organization_id || null;

    const { data: existingRow } = await supabase
      .from("subscriptions")
      .select("id, organization_id, plan_id")
      .eq("razorpay_subscription_id", subId)
      .maybeSingle();

    if (!existingRow && orgId) {
      // Grab any row for this org so we can upgrade it instead of inserting duplicates.
      const { data: orgRow } = await supabase
        .from("subscriptions")
        .select("id, organization_id, plan_id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orgRow) {
        orgId = orgRow.organization_id;
      }
    }

    const rowOrgId = existingRow?.organization_id || orgId;

    const updatePayload: Record<string, unknown> = {
      status: RZP_STATUS_TO_INTERNAL[subPayload.status] ?? "active",
      razorpay_subscription_id: subId,
      razorpay_customer_id: subPayload.customer_id ?? null,
      provider: "razorpay",
      provider_subscription_id: subId,
      provider_customer_id: subPayload.customer_id ?? null,
      current_period_start: unixToIso(subPayload.current_start),
      current_period_end: unixToIso(subPayload.current_end),
    };

    if (event === "subscription.cancelled") {
      updatePayload.cancel_at_period_end = true;
    }
    if (event === "subscription.resumed") {
      updatePayload.cancel_at_period_end = false;
      updatePayload.cancel_requested_at = null;
    }

    if (existingRow) {
      await supabase.from("subscriptions").update(updatePayload).eq("id", existingRow.id);
    } else if (rowOrgId) {
      // Fall back: look up by org + no razorpay_subscription_id match (first subscribe).
      const { data: blankRow } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("organization_id", rowOrgId)
        .is("razorpay_subscription_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (blankRow) {
        await supabase.from("subscriptions").update(updatePayload).eq("id", blankRow.id);
      } else {
        await supabase.from("subscriptions").insert({
          organization_id: rowOrgId,
          plan_id: existingRow?.plan_id ?? null,
          interval: "month",
          ...updatePayload,
        });
      }
    } else {
      console.warn("⚠️ Subscription webhook — could not resolve organization", { subId, event });
    }

    await supabase.from("audit_log").insert({
      actor_type: "webhook",
      actor_label: "razorpay",
      organization_id: rowOrgId,
      action: event,
      target_type: "subscription",
      target_id: subId,
      meta: { status: subPayload.status, plan_id: subPayload.plan_id ?? null },
    });
  }

  // ---------------------------------------------------------------------
  // Invoice events
  // ---------------------------------------------------------------------
  if (invoicePayload?.id) {
    const invId: string = invoicePayload.id;
    const subRef: string | null = invoicePayload.subscription_id || subPayload?.id || null;

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
      // Idempotency: skip if we've already recorded this invoice.
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("organization_id", orgId)
        .eq("provider_invoice_id", invId)
        .limit(1)
        .maybeSingle();

      const status = invoicePayload.status === "paid"
        ? "paid"
        : invoicePayload.status === "issued"
          ? "issued"
          : invoicePayload.status === "expired"
            ? "cancelled"
            : "failed";
      const amountPaise = Number(invoicePayload.amount_paid ?? invoicePayload.amount ?? 0);
      const amountInr = Number.isFinite(amountPaise) ? amountPaise / 100 : 0;

      if (!existing) {
        await supabase.from("invoices").insert({
          organization_id: orgId,
          subscription_id: localSubId,
          provider: "razorpay",
          provider_invoice_id: invId,
          provider_subscription_id: subRef,
          provider_payment_id: paymentPayload?.id || null,
          status,
          amount_inr: amountInr,
          currency: invoicePayload.currency || "INR",
          period_start: unixToIso(invoicePayload.period_start),
          period_end: unixToIso(invoicePayload.period_end),
          paid_at: unixToIso(invoicePayload.paid_at ?? invoicePayload.issued_at),
          short_url: invoicePayload.short_url ?? null,
          raw: invoicePayload,
        });
      } else {
        await supabase
          .from("invoices")
          .update({
            status,
            amount_inr: amountInr,
            paid_at: unixToIso(invoicePayload.paid_at ?? invoicePayload.issued_at),
            short_url: invoicePayload.short_url ?? null,
            raw: invoicePayload,
            provider_payment_id: paymentPayload?.id || null,
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
      meta: { subscription_id: subRef, amount_paid: invoicePayload.amount_paid ?? null },
    });

    // ── Payment success receipt email (best-effort, never blocks the webhook)
    //    Fires on invoice.paid so every successful charge produces a receipt.
    //    We ignore failures — the invoice row is already persisted, so the UI
    //    billing page will still show the charge.
    if (orgId && event === "invoice.paid") {
      try {
        const paise = Number(invoicePayload.amount_paid ?? invoicePayload.amount ?? 0);
        await sendPaymentSuccessEmail(supabase, orgId, {
          invoiceId: invId,
          amountInr: Number.isFinite(paise) ? paise / 100 : 0,
          periodEndUnix: invoicePayload.period_end ?? null,
          shortUrl: invoicePayload.short_url || null,
        });
      } catch (mailErr) {
        console.warn("[webhook] invoice.paid email failed:", (mailErr as Error).message);
      }
    }

    return { received: true, event, invoiceId: invId, subscriptionId: subRef || undefined };
  }

  return { received: true, event, subscriptionId: subPayload?.id };
}

// ────────────────────────────────────────────────────────────────────────────
// Payment success email (Node runtime, called from invoice.paid only)
// ────────────────────────────────────────────────────────────────────────────

async function sendPaymentSuccessEmail(
  supabase: { from: (t: string) => { select: (s: string) => unknown } },
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

  const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient;

  const { data: org } = await db
    .from("organizations")
    .select("id, name, slug, branding")
    .eq("id", organizationId)
    .maybeSingle();

  // Find the owner or first admin with an email.
  const { data: ownerLink } = await db
    .from("org_memberships")
    .select("admin_user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
    .limit(5);
  const adminIds = (ownerLink || []).map((r: { admin_user_id: string }) => r.admin_user_id);
  if (adminIds.length === 0) return;

  const { data: users } = await db
    .from("admin_users")
    .select("id, email, display_name, username")
    .in("id", adminIds)
    .not("email", "is", null);
  const recipient = (users || []).find(
    (u: { email: string | null }) => typeof u.email === "string" && u.email.includes("@"),
  );
  if (!recipient) return;

  const planRes = await db
    .from("subscriptions")
    .select("plan_id, plans(code, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  type PlanJoinRow = { plans?: { code?: string; name?: string } | { code?: string; name?: string }[] | null };
  const joined = (planRes.data as PlanJoinRow | null)?.plans;
  const planMeta = Array.isArray(joined) ? joined[0] : joined;
  const planName: string = planMeta?.name || planMeta?.code || "Subscription";

  const base = (env("APP_BASE_URL") || "https://cuetronix.app").replace(/\/+$/, "");
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

  // Call our Resend helper dynamically — keeps the module import tree flat
  // for the Node-only webhook bundle.
  const { sendEmail } = await import("../email");
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
      billingPortalUrl: payload.shortUrl || `${base}/account/billing`,
    },
    organizationId,
    adminUserId: recipient.id as string,
    supabase: db,
  });
}

