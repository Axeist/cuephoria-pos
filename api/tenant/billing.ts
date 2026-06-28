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
 *   - "record-checkout-dismiss"  When Razorpay status is still `created`, stamps
 *                                `checkout_abandoned_at` once (anchors grace).
 *   - "fetch-invoices"          GET /v1/invoices?subscription_id=:id; upserts local
 *                                public.invoices, syncs subscription status, returns both.
 *   - "sync-subscription"       Fetches live Razorpay subscription and mirrors locally.
 *
 * Notes payload is org-scoped (no outlet_id) by product decision so the
 * webhook can resolve the originating organization with a single lookup.
 */

import { j } from "../../src/server/adminApiUtils.js";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext.js";
import { applyPlanChange } from "../../src/server/lib/planChange.js";
import { isInternalOrganization } from "../../src/types/tenancy.js";
import { getRazorpayCredentials } from "../../src/server/lib/razorpay-credentials.js";
import {
  buildSubscriptionNotes,
  ensureRazorpayPlanAmount,
  getRazorpayClient,
  isReusableRazorpayStatus,
  isTerminalRazorpayStatus,
  mapRazorpaySubscriptionToRow,
  rzpFetch,
  subscriptionSnapshotUpdate,
  unixToIso,
  verifySubscriptionCheckoutSignature,
  type RazorpayApiError,
  type RazorpayInvoice,
  type RazorpaySubscription,
} from "../../src/server/lib/razorpay-subscriptions.js";
import {
  fetchBillingAccessGraceMinutes,
  DEFAULT_BILLING_ACCESS_GRACE_MINUTES,
} from "../../src/server/lib/platformBillingGrace.js";

export const config = { maxDuration: 60 };

/**
 * Minimal Vercel Node handler shape. We deliberately avoid importing
 * `@vercel/node` types so we don't depend on a peer dep that may not be
 * resolved by the bundler — every property we touch is part of the
 * underlying Node `IncomingMessage` / `ServerResponse`.
 */
type VercelNodeReq = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
  body?: unknown;
};
type VercelNodeRes = {
  setHeader: (key: string, value: string | number | string[]) => void;
  status: (code: number) => VercelNodeRes;
  send: (body: string | Buffer) => void;
  json: (body: unknown) => void;
  end: (body?: string | Buffer) => void;
};

const EDITOR_ROLES = new Set(["owner", "admin"]);
const INVOICE_PAGE_SIZE = 24;
const DB_QUERY_TIMEOUT_MS = 12_000;

type BillingCycle = "month" | "year";
type PlanTier = "starter" | "growth" | "pro" | "test";

/**
 * Race a Supabase query against a clear timeout error so a stuck DB call
 * surfaces as a labelled failure instead of hanging the entire handler.
 */
async function withTimeout<T>(label: string, p: PromiseLike<T>, ms = DB_QUERY_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} query timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(p), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Top-level dispatcher
// ---------------------------------------------------------------------------

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method === "GET") return getBilling(ctx);
  if (req.method === "POST") return postBilling(req, ctx);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

// Allow suspended workspaces to reach this endpoint: the entire point of the
// /subscription page is to let a tenant retry payment and get unstuck. If
// `withOrgContext` blocked this route the way it blocks every other tenant
// endpoint, the user would be locked out of the very screen that could
// resolve the lock.
const wrappedHandler = withOrgContext(handler, { allowSuspended: true });

/**
 * Pick a single string value from req.query (Vercel may give string | string[]).
 */
function firstQuery(req: VercelNodeReq, key: string): string | undefined {
  const v = req.query?.[key];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

/**
 * Pick a header value (first if array) from a Node IncomingMessage-shaped req.
 */
function header(req: VercelNodeReq, key: string): string | undefined {
  const v = req.headers[key.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

/**
 * Build a Web `Request` from a Vercel Node `req`. This is the bridge that
 * lets `withOrgContext` (Web fetch contract) keep working underneath the
 * Express-style Vercel entry point.
 *
 * Wrapped in try/catch so a malformed URL surfaces as a 500 JSON instead of
 * an uncaught FUNCTION_INVOCATION_FAILED at the Vercel runtime layer.
 */
function buildWebRequest(req: VercelNodeReq): Request {
  const host = header(req, "host") || "localhost";
  const proto = header(req, "x-forwarded-proto") || "https";
  const rawUrl = req.url || "/";
  // `new URL(rawUrl, base)` is safe for both absolute and relative `rawUrl`.
  const fullUrl = new URL(rawUrl, `${proto}://${host}`).toString();

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) headers.append(k, item);
    } else {
      headers.set(k, String(v));
    }
  }

  const method = (req.method || "GET").toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD" && req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      init.body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      init.body = req.body as unknown as BodyInit;
    } else {
      init.body = JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }

  return new Request(fullUrl, init);
}

/**
 * Marshal a Web Response into the Vercel Node res object so the response
 * status/headers/body all reach the client correctly.
 */
async function sendWebResponse(res: VercelNodeRes, webRes: Response): Promise<void> {
  webRes.headers.forEach((value, key) => {
    try {
      res.setHeader(key, value);
    } catch {
      // ignore reserved headers that some runtimes reject
    }
  });
  const text = await webRes.text();
  res.status(webRes.status).send(text);
}

/**
 * Outer entry — Vercel Node serverless function. Uses the Express-style
 * (req, res) signature that all other Node-runtime endpoints in this repo
 * use (api/razorpay/webhook.ts, api/bookings/[action].ts, etc.) and which
 * Vercel guarantees to support without any auto-detection magic.
 *
 *   - `?probe=1` short-circuits with a lightweight diagnostic JSON before
 *     touching Supabase, Razorpay, or the org-context middleware. Use this
 *     to confirm the function is live and that env vars are wired up.
 *
 *   - The real handler is wrapped in a 30 s watchdog and a top-level
 *     try/catch so a crash ALWAYS produces JSON instead of Vercel's
 *     FUNCTION_INVOCATION_FAILED HTML page.
 */
export default async function billingEntry(req: VercelNodeReq, res: VercelNodeRes): Promise<void> {
  // Always JSON for billing.
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    if ((req.method || "GET").toUpperCase() === "GET" && firstQuery(req, "probe") === "1") {
      res.status(200).json({
        ok: true,
        probe: true,
        runtime: "node",
        nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
        method: req.method,
        url: req.url,
        host: header(req, "host") || null,
        razorpayConfigured: !!(
          process.env.RAZORPAY_KEY_ID_LIVE ||
          process.env.RAZORPAY_KEY_ID_TEST ||
          process.env.RAZORPAY_KEY_ID
        ),
        supabaseConfigured: !!(
          process.env.SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL
        ),
        supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        webhookSecret: !!(
          process.env.RAZORPAY_WEBHOOK_SECRET_LIVE ||
          process.env.RAZORPAY_WEBHOOK_SECRET_TEST ||
          process.env.RAZORPAY_WEBHOOK_SECRET
        ),
        ts: new Date().toISOString(),
      });
      return;
    }

    let webReq: Request;
    try {
      webReq = buildWebRequest(req);
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : "Failed to build Request",
        step: "buildWebRequest",
      });
      return;
    }

    const WATCHDOG_MS = 30_000;
    const watchdog = new Promise<Response>((resolve) =>
      setTimeout(
        () =>
          resolve(
            j(
              {
                ok: false,
                error:
                  "Billing handler watchdog tripped at 30s — a downstream call (Supabase or Razorpay) never returned. Check Vercel function logs for the last [billing.*] line.",
                step: "watchdog",
              },
              504,
            ),
          ),
        WATCHDOG_MS,
      ),
    );

    const webRes = await Promise.race([wrappedHandler(webReq), watchdog]);
    await sendWebResponse(res, webRes);
  } catch (e) {
    console.error("[billing.entry] uncaught error", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    const stack = e instanceof Error ? e.stack : undefined;
    try {
      res.status(500).json({
        ok: false,
        error: message,
        step: "billing.entry",
        stack: stack ? stack.split("\n").slice(0, 6).join("\n") : undefined,
      });
    } catch {
      res.status(500).end(JSON.stringify({ ok: false, error: message, step: "billing.entry.fallback" }));
    }
  }
}

// ---------------------------------------------------------------------------
// GET — snapshot
// ---------------------------------------------------------------------------

async function getBilling(ctx: OrgContext): Promise<Response> {
  // Per-request log prefix; every step in this handler tags its log lines so
  // a stuck billing page can always be diagnosed from Vercel function logs
  // without having to add ad-hoc instrumentation.
  const log = (msg: string, extra?: unknown) =>
    console.log(`[billing.GET] org=${ctx.organizationSlug} role=${ctx.role} ${msg}`, extra ?? "");
  const err = (msg: string, extra?: unknown) =>
    console.error(`[billing.GET] org=${ctx.organizationSlug} ${msg}`, extra ?? "");

  log("start");
  let creds: ReturnType<typeof getRazorpayCredentials>;
  try {
    creds = getRazorpayCredentials("default");
  } catch (e) {
    err("razorpay credentials missing", e);
    return j(
      { ok: false, error: e instanceof Error ? e.message : "Razorpay not configured", step: "credentials" },
      503,
    );
  }
  log(`credentials ok mode=${creds.isLive ? "live" : "test"} key=${creds.keyId.slice(0, 12)}…`);

  const supabase = ctx.supabase;
  /**
   * Use SELECT * for `subscriptions` so the page keeps rendering even when
   * the new lifecycle migration (plan_tier / razorpay_status / paid_count /
   * charge_at / scheduled_change / access_suspended / etc.) hasn't been
   * applied yet on a given environment. Missing columns surface as
   * `undefined` on the row, which the typed frontend already treats as
   * "no value" — far better UX than the page hanging on an error.
   */
  let orgQ, subQ, plansQ, invQ, graceQ, adminQ;
  try {
    [orgQ, subQ, plansQ, invQ, graceQ, adminQ] = await Promise.all([
      withTimeout(
        "organizations",
        supabase
          .from("organizations")
          .select("id, slug, name, currency, country, status, is_internal, is_sandbox, trial_ends_at")
          .eq("id", ctx.organizationId)
          .maybeSingle(),
      ),
      withTimeout(
        "subscriptions",
        supabase
          .from("subscriptions")
          .select("*, plan:plan_id ( id, code, name )")
          .eq("organization_id", ctx.organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      withTimeout(
        "plans",
        supabase
          .from("plans")
          .select(
            "id, code, name, is_public, is_active, price_inr_month, price_inr_year, razorpay_plan_id_month, razorpay_plan_id_year, sort_order",
          )
          .eq("is_active", true)
          .eq("is_public", true)
          .order("sort_order", { ascending: true }),
      ),
      withTimeout(
        "invoices",
        supabase
          .from("invoices")
          .select(
            "id, status, amount_inr, currency, period_start, period_end, paid_at, short_url, provider_invoice_id, provider_payment_id, provider_subscription_id, created_at",
          )
          .eq("organization_id", ctx.organizationId)
          .order("created_at", { ascending: false })
          .limit(INVOICE_PAGE_SIZE),
      ),
      withTimeout(
        "platform_settings",
        fetchBillingAccessGraceMinutes(supabase).catch(() => DEFAULT_BILLING_ACCESS_GRACE_MINUTES),
        5_000,
      ),
      withTimeout(
        "adminUserLookup",
        supabase
          .from("admin_users")
          .select("email, display_name, username")
          .eq("id", ctx.user.id)
          .maybeSingle(),
      ),
    ]);
  } catch (timeoutErr) {
    const m = timeoutErr instanceof Error ? timeoutErr.message : String(timeoutErr);
    err("db query timeout", m);
    return j({ ok: false, error: m, step: "db-timeout" }, 504);
  }

  if (orgQ.error) {
    err("organizations query failed", orgQ.error);
    return j({ ok: false, error: `organizations: ${orgQ.error.message}`, step: "organizations" }, 500);
  }
  if (!orgQ.data) {
    err("organization row missing");
    return j({ ok: false, error: "Organization not found.", step: "organizations" }, 404);
  }
  if (subQ.error) {
    err("subscriptions query failed", subQ.error);
    return j({ ok: false, error: `subscriptions: ${subQ.error.message}`, step: "subscriptions" }, 500);
  }
  if (plansQ.error) {
    err("plans query failed", plansQ.error);
    return j({ ok: false, error: `plans: ${plansQ.error.message}`, step: "plans" }, 500);
  }
  if (invQ.error) {
    err("invoices query failed", invQ.error);
    return j({ ok: false, error: `invoices: ${invQ.error.message}`, step: "invoices" }, 500);
  }
  log(
    `db ok plans=${plansQ.data?.length ?? 0} invoices=${invQ.data?.length ?? 0} ` +
      `subscription=${subQ.data ? "yes" : "no"}`,
  );

  // Hosted checkout does not hit verify-payment; pull live Razorpay state when
  // local status looks stale (created / paid invoice but not yet active).
  let subscriptionData = subQ.data;
  if (
    subscriptionData?.id &&
    subscriptionData.razorpay_subscription_id &&
    subscriptionNeedsRazorpaySync(
      subscriptionData as Record<string, unknown>,
      invQ.data ?? [],
    )
  ) {
    try {
      await syncSubscriptionFromRazorpay(ctx, {
        id: subscriptionData.id,
        razorpay_subscription_id: subscriptionData.razorpay_subscription_id,
      });
      const refreshed = await withTimeout(
        "subscriptions.resync",
        supabase
          .from("subscriptions")
          .select("*, plan:plan_id ( id, code, name )")
          .eq("id", subscriptionData.id)
          .maybeSingle(),
      );
      if (refreshed.data) subscriptionData = refreshed.data;
      log("subscription synced from Razorpay");
    } catch (syncErr) {
      err("subscription sync failed (non-fatal)", syncErr);
    }
  }

  let currentPlan: { id: string; code: string; name: string } | null = null;
  if (subscriptionData?.plan_id) {
    const rawPlan = (subscriptionData as { plan?: { id: string; code: string; name: string } | { id: string; code: string; name: string }[] | null }).plan;
    const embedded = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
    if (embedded?.id) {
      currentPlan = { id: embedded.id, code: embedded.code, name: embedded.name };
    } else {
      const match = (plansQ.data ?? []).find((p) => p.id === subscriptionData!.plan_id);
      if (match) {
        currentPlan = { id: match.id, code: match.code, name: match.name };
      }
    }
  }

  const adminRow = adminQ.error ? null : adminQ.data;
  if (adminQ.error) {
    err("adminUserLookup failed (non-fatal)", adminQ.error);
  }

  let billingContactEmail: string | null = null;
  let billingPrefillName: string | null = null;
  const em = adminRow?.email;
  if (typeof em === "string" && em.includes("@")) billingContactEmail = em.trim();
  const dn = adminRow?.display_name;
  const un = adminRow?.username;
  if (typeof dn === "string" && dn.trim()) billingPrefillName = dn.trim();
  else if (typeof un === "string" && un.trim()) billingPrefillName = un.trim();

  log("returning snapshot");
  const billingAccessGraceMinutes =
    typeof graceQ === "number" && Number.isFinite(graceQ) ? graceQ : DEFAULT_BILLING_ACCESS_GRACE_MINUTES;
  const subscriptionRow = subscriptionData
    ? (() => {
        const { plan: _plan, ...rest } = subscriptionData as Record<string, unknown> & {
          plan?: unknown;
        };
        return rest;
      })()
    : null;

  let sandboxExpiresAt: string | null = null;
  if ((orgQ.data as { is_sandbox?: boolean })?.is_sandbox) {
    const { data: grant } = await supabase
      .from("sandbox_access_grants")
      .select("expires_at")
      .eq("organization_id", ctx.organizationId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sandboxExpiresAt = grant?.expires_at ?? null;
  }

  return j(
    {
      ok: true,
      role: ctx.role,
      canEdit: EDITOR_ROLES.has(ctx.role),
      organization: orgQ.data,
      subscription: subscriptionRow,
      currentPlan,
      plans: plansQ.data ?? [],
      invoices: invQ.data ?? [],
      razorpay: { mode: creds.isLive ? "live" : "test", keyId: creds.keyId },
      billingContactEmail,
      billingPrefillName,
      billingAccessGraceMinutes,
      sandboxExpiresAt,
    },
    200,
  );
}

// ---------------------------------------------------------------------------
// POST — action dispatcher
// ---------------------------------------------------------------------------

async function postBilling(req: Request, ctx: OrgContext): Promise<Response> {
  if ((ctx.status ?? "").trim().toLowerCase() === "pending_approval") {
    return j(
      {
        ok: false,
        error: "Your workspace is awaiting platform approval. Billing is available after approval.",
      },
      403,
    );
  }

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
    case "sync-subscription":
      return syncSubscriptionAction(ctx);
    case "sandbox-switch-plan":
      return sandboxSwitchPlanAction(ctx, body);
    case "record-checkout-dismiss":
      return recordCheckoutDismissAction(ctx);
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
  if (s === "starter" || s === "growth" || s === "pro" || s === "test") return s;
  return null;
}

type ResolvedPlanRow = {
  id: string;
  code: string;
  name: string;
  price_inr_month: number | null;
  price_inr_year: number | null;
  razorpay_plan_id_month: string | null;
  razorpay_plan_id_year: string | null;
};

async function resolvePlanRow(ctx: OrgContext, tier: PlanTier): Promise<ResolvedPlanRow | null> {
  const { data, error } = await ctx.supabase
    .from("plans")
    .select(
      "id, code, name, price_inr_month, price_inr_year, razorpay_plan_id_month, razorpay_plan_id_year, is_active, is_public",
    )
    .eq("code", tier)
    .maybeSingle();
  if (error || !data || !data.is_active || !data.is_public) return null;
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    price_inr_month: data.price_inr_month != null ? Number(data.price_inr_month) : null,
    price_inr_year: data.price_inr_year != null ? Number(data.price_inr_year) : null,
    razorpay_plan_id_month: data.razorpay_plan_id_month ?? null,
    razorpay_plan_id_year: data.razorpay_plan_id_year ?? null,
  };
}

/** Map catalog price → Razorpay plan id (creates/replaces when amount drifts). */
async function resolveRazorpayPlanIdForCheckout(
  ctx: OrgContext,
  plan: ResolvedPlanRow,
  cycle: BillingCycle,
): Promise<string | Response> {
  const expectedAmountInr = cycle === "year" ? plan.price_inr_year : plan.price_inr_month;
  if (expectedAmountInr == null || !Number.isFinite(expectedAmountInr) || expectedAmountInr <= 0) {
    return j(
      {
        ok: false,
        error: `Plan "${plan.code}" has no ${cycle === "year" ? "yearly" : "monthly"} price configured. Set it in Platform → Plans.`,
      },
      400,
    );
  }

  const existingId = cycle === "year" ? plan.razorpay_plan_id_year : plan.razorpay_plan_id_month;

  try {
    const { planId, created } = await ensureRazorpayPlanAmount({
      existingPlanId: existingId,
      expectedAmountInr,
      cycle,
      planCode: plan.code,
      planName: plan.name,
    });

    if (created && planId !== existingId) {
      const column = cycle === "year" ? "razorpay_plan_id_year" : "razorpay_plan_id_month";
      const { error } = await ctx.supabase.from("plans").update({ [column]: planId }).eq("id", plan.id);
      if (error) console.error("[billing] failed to persist Razorpay plan id", error);
    }

    return planId;
  } catch (err) {
    return billingError(err);
  }
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
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) {
    return j(
      { ok: false, error: "This workspace is managed internally and is not billed via Razorpay." },
      400,
    );
  }

  const tier = normaliseTier(body.planTier ?? body.tier ?? body.planCode);
  const cycle = normaliseCycle(body.billingCycle ?? body.interval ?? body.cycle);
  if (!tier) return j({ ok: false, error: "planTier must be one of: starter, growth, pro, test." }, 400);

  const plan = await resolvePlanRow(ctx, tier);
  if (!plan) return j({ ok: false, error: `Plan "${tier}" is not available for subscription.` }, 404);

  const razorpayPlanResolved = await resolveRazorpayPlanIdForCheckout(ctx, plan, cycle);
  if (razorpayPlanResolved instanceof Response) return razorpayPlanResolved;
  const razorpayPlanId = razorpayPlanResolved;

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
      if (fresh.plan_id === razorpayPlanId) {
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
      }
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
    access_suspended_at: null,
    checkout_abandoned_at: null,
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

async function recordCheckoutDismissAction(ctx: OrgContext): Promise<Response> {
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) return j({ ok: true, skipped: true, reason: "internal" }, 200);

  const { data: row, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_status, checkout_abandoned_at")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return j({ ok: false, error: error.message }, 500);
  if (!row?.id) return j({ ok: true, skipped: true, reason: "no_row" }, 200);

  const rs = String(row.razorpay_status ?? "").toLowerCase();
  if (rs !== "created") return j({ ok: true, skipped: true, reason: "not_created" }, 200);

  if (row.checkout_abandoned_at) return j({ ok: true, skipped: true, reason: "already_abandoned" }, 200);

  const stamp = new Date().toISOString();
  const { error: upErr } = await ctx.supabase
    .from("subscriptions")
    .update({ checkout_abandoned_at: stamp })
    .eq("id", row.id);

  if (upErr) return j({ ok: false, error: upErr.message }, 500);
  return j({ ok: true, checkoutAbandonedAt: stamp }, 200);
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
    .select("id, razorpay_subscription_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row?.razorpay_subscription_id || row.razorpay_subscription_id !== subscriptionId) {
    return j({ ok: false, error: "Subscription does not belong to this workspace." }, 403);
  }

  const valid = verifySubscriptionCheckoutSignature(paymentId, subscriptionId, signature, creds.keySecret);
  if (!valid) return j({ ok: false, error: "Invalid Razorpay payment signature." }, 400);

  if (row.id) {
    const { error: upErr } = await ctx.supabase
      .from("subscriptions")
      .update({ checkout_abandoned_at: null })
      .eq("id", row.id);
    if (upErr) console.error("[billing] clear checkout_abandoned_at failed", upErr);
  }

  return j({ ok: true }, 200);
}

// ---------------------------------------------------------------------------
// Actions: upgrade (PATCH at cycle_end)
// ---------------------------------------------------------------------------

async function upgradeAction(ctx: OrgContext, body: Record<string, unknown>): Promise<Response> {
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) {
    return j({ ok: false, error: "Internal workspaces have no Razorpay subscription to upgrade." }, 400);
  }
  const tier = normaliseTier(body.planTier ?? body.tier ?? body.planCode);
  const cycle = normaliseCycle(body.billingCycle ?? body.interval ?? body.cycle);
  if (!tier) return j({ ok: false, error: "planTier must be one of: starter, growth, pro, test." }, 400);

  const plan = await resolvePlanRow(ctx, tier);
  if (!plan) return j({ ok: false, error: `Plan "${tier}" is not available for subscription.` }, 404);

  const razorpayPlanResolved = await resolveRazorpayPlanIdForCheckout(ctx, plan, cycle);
  if (razorpayPlanResolved instanceof Response) return razorpayPlanResolved;
  const razorpayPlanId = razorpayPlanResolved;

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
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) {
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
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) {
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
  if (isInternalOrganization(ctx.organizationSlug, ctx.isInternal)) {
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
    .update({ access_suspended: false, access_suspended_at: null })
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

async function sandboxSwitchPlanAction(
  ctx: OrgContext,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!ctx.isSandbox) {
    return j({ ok: false, error: "Plan switching without payment is only available in demo workspaces." }, 403);
  }

  const planCode = String(body.planCode ?? body.planTier ?? "").trim().toLowerCase();
  if (!planCode) return j({ ok: false, error: "planCode is required." }, 400);
  if (!["starter", "growth", "pro"].includes(planCode)) {
    return j({ ok: false, error: "Demo workspaces can switch between Starter, Growth, and Pro." }, 400);
  }

  const result = await applyPlanChange(ctx.supabase, ctx.organizationId, planCode, {
    confirm: body.confirm === true,
  });

  if (result.ok === false) {
    return j(
      { ok: false, error: result.error, warnings: result.warnings },
      result.status,
    );
  }

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "sandbox.plan_switched",
    target_type: "subscription",
    target_id: String(result.subscription.id ?? ctx.organizationId),
    meta: { planCode, warnings: result.warnings },
  });

  return j({ ok: true, subscription: result.subscription, warnings: result.warnings }, 200);
}

// ---------------------------------------------------------------------------
// Razorpay subscription sync (hosted checkout / missed webhooks)
// ---------------------------------------------------------------------------

const TERMINAL_RZP_STATUSES = new Set(["cancelled", "completed", "expired"]);

function subscriptionNeedsRazorpaySync(
  row: Record<string, unknown>,
  invoices: { status?: string | null }[],
): boolean {
  const rs = String(row.razorpay_status ?? "").toLowerCase();
  if (rs === "created") return true;
  if (TERMINAL_RZP_STATUSES.has(rs)) return false;
  const hasPaidInvoice = invoices.some((inv) => String(inv.status ?? "").toLowerCase() === "paid");
  if (hasPaidInvoice && rs !== "active") return true;
  return false;
}

async function syncSubscriptionFromRazorpay(
  ctx: OrgContext,
  subRow: { id: string; razorpay_subscription_id: string },
): Promise<RazorpaySubscription> {
  const client = await getRazorpayClient();
  const remote = await client.subscriptions.fetch(subRow.razorpay_subscription_id);
  const updatePayload = subscriptionSnapshotUpdate(remote);
  const { error } = await ctx.supabase.from("subscriptions").update(updatePayload).eq("id", subRow.id);
  if (error) throw error;
  return remote;
}

async function loadSubscriptionSnapshot(ctx: OrgContext): Promise<Record<string, unknown> | null> {
  const { data, error } = await ctx.supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

async function syncSubscriptionAction(ctx: OrgContext): Promise<Response> {
  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return j({ ok: false, error: error.message }, 500);
  if (!sub?.razorpay_subscription_id) {
    return j({ ok: true, synced: false, reason: "no_subscription", subscription: null }, 200);
  }

  try {
    const remote = await syncSubscriptionFromRazorpay(ctx, {
      id: sub.id,
      razorpay_subscription_id: sub.razorpay_subscription_id,
    });
    const subscription = await loadSubscriptionSnapshot(ctx);
    return j(
      {
        ok: true,
        synced: true,
        razorpayStatus: remote.status ?? null,
        subscription,
      },
      200,
    );
  } catch (err) {
    return billingError(err);
  }
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
    return j({ ok: true, invoices: [], subscription: null, subscriptionSynced: false }, 200);
  }

  let subscriptionSynced = false;
  try {
    await syncSubscriptionFromRazorpay(ctx, {
      id: sub.id,
      razorpay_subscription_id: sub.razorpay_subscription_id,
    });
    subscriptionSynced = true;
  } catch (syncErr) {
    console.error("[billing] fetch-invoices subscription sync failed", syncErr);
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

  const subscription = await loadSubscriptionSnapshot(ctx);

  return j(
    {
      ok: true,
      invoices: refreshed ?? [],
      subscription,
      subscriptionSynced,
    },
    200,
  );
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
