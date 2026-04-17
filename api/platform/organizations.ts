/**
 * /api/platform/organizations
 *
 * GET  — list tenants enriched with subscription + plan + location/member counts.
 * POST — create a new tenant with a starter subscription + one default location.
 *
 * Both routes require a valid platform session.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { requirePlatformSession } from "../../src/server/platformApiUtils";

export const config = { runtime: "edge" };

type SubRow = { plan_id: string; status: string; provider: string; interval: string };
type PlanRow = { id: string; code: string; name: string };

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "billing", "cuetronix", "dashboard", "docs",
  "help", "internal", "login", "logout", "mail", "onboarding", "platform",
  "public", "settings", "signup", "staff", "status", "support", "system",
  "tenant", "user", "users", "www",
]);

export default async function handler(req: Request) {
  if (req.method === "GET") return listOrganizations(req);
  if (req.method === "POST") return createOrganization(req);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

// ---------------------------------------------------------------------------
// GET /api/platform/organizations
// ---------------------------------------------------------------------------
async function listOrganizations(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-organizations");
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = (url.searchParams.get("q") || "").trim();

    let query = supabase
      .from("organizations")
      .select(
        "id, slug, name, legal_name, country, currency, status, is_internal, trial_ends_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);

    const { data: orgs, error: orgErr } = await query;
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);

    const orgIds = (orgs ?? []).map((o) => o.id);
    if (orgIds.length === 0) return j({ ok: true, organizations: [] }, 200);

    const [{ data: subs, error: subErr }, { data: plans, error: planErr }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("organization_id, plan_id, status, provider, interval")
        .in("organization_id", orgIds),
      supabase.from("plans").select("id, code, name"),
    ]);
    if (subErr) return j({ ok: false, error: subErr.message }, 500);
    if (planErr) return j({ ok: false, error: planErr.message }, 500);

    const planById = new Map<string, PlanRow>();
    for (const p of (plans ?? []) as PlanRow[]) planById.set(p.id, p);

    const subByOrg = new Map<string, SubRow>();
    for (const s of (subs ?? []) as Array<SubRow & { organization_id: string }>) {
      if (!subByOrg.has(s.organization_id)) subByOrg.set(s.organization_id, s);
    }

    const { data: locCounts, error: locErr } = await supabase
      .from("locations")
      .select("organization_id")
      .in("organization_id", orgIds)
      .eq("is_active", true);
    if (locErr) return j({ ok: false, error: locErr.message }, 500);
    const locCountByOrg = new Map<string, number>();
    for (const r of (locCounts ?? []) as Array<{ organization_id: string }>) {
      locCountByOrg.set(r.organization_id, (locCountByOrg.get(r.organization_id) ?? 0) + 1);
    }

    const { data: memberCounts, error: memErr } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .in("organization_id", orgIds);
    if (memErr) return j({ ok: false, error: memErr.message }, 500);
    const memCountByOrg = new Map<string, number>();
    for (const r of (memberCounts ?? []) as Array<{ organization_id: string }>) {
      memCountByOrg.set(r.organization_id, (memCountByOrg.get(r.organization_id) ?? 0) + 1);
    }

    const enriched = (orgs ?? []).map((o) => {
      const s = subByOrg.get(o.id);
      const plan = s ? planById.get(s.plan_id) : undefined;
      return {
        ...o,
        subscription: s
          ? {
              planCode: plan?.code ?? null,
              planName: plan?.name ?? null,
              status: s.status,
              provider: s.provider,
              interval: s.interval,
            }
          : null,
        locationCount: locCountByOrg.get(o.id) ?? 0,
        memberCount: memCountByOrg.get(o.id) ?? 0,
      };
    });

    return j({ ok: true, organizations: enriched }, 200);
  } catch (err: unknown) {
    return errorResponse(err, "listOrganizations");
  }
}

// ---------------------------------------------------------------------------
// POST /api/platform/organizations
// ---------------------------------------------------------------------------
async function createOrganization(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: {
    name?: string;
    slug?: string;
    legalName?: string;
    country?: string;
    currency?: string;
    timezone?: string;
    planCode?: string;
    status?: "trialing" | "active";
    trialDays?: number;
    primaryLocationName?: string;
    primaryLocationShortCode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const name = (body.name || "").trim();
  const slug = (body.slug || "").trim().toLowerCase();
  const legalName = (body.legalName || "").trim() || null;
  const country = (body.country || "IN").trim().toUpperCase();
  const currency = (body.currency || "INR").trim().toUpperCase();
  const timezone = (body.timezone || "Asia/Kolkata").trim();
  const planCode = (body.planCode || "starter").trim().toLowerCase();
  const rawStatus = body.status === "active" ? "active" : "trialing";
  const trialDays = Number.isFinite(body.trialDays) ? Math.max(0, Math.min(60, Number(body.trialDays))) : 14;
  const primaryLocationName = (body.primaryLocationName || "Main Branch").trim();
  const primaryLocationShortCode = (body.primaryLocationShortCode || "MAIN").trim().toUpperCase();

  if (name.length < 2 || name.length > 120) {
    return j({ ok: false, error: "Name must be 2–120 characters." }, 400);
  }
  if (!SLUG_RE.test(slug)) {
    return j({ ok: false, error: "Slug must be 3–40 chars, lowercase letters/numbers/dashes, start with a letter." }, 400);
  }
  if (RESERVED_SLUGS.has(slug)) {
    return j({ ok: false, error: `Slug "${slug}" is reserved.` }, 400);
  }
  if (!/^[A-Z][A-Z0-9]{1,11}$/.test(primaryLocationShortCode)) {
    return j({ ok: false, error: "Primary location short code must be 2–12 uppercase letters/numbers." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-create-org");

    // Check slug availability up-front so the error message is clear.
    const { data: existing, error: slugCheckErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (slugCheckErr) return j({ ok: false, error: slugCheckErr.message }, 500);
    if (existing) return j({ ok: false, error: `Slug "${slug}" is already taken.` }, 409);

    // Resolve plan.
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("id, code, is_active")
      .eq("code", planCode)
      .maybeSingle();
    if (planErr) return j({ ok: false, error: planErr.message }, 500);
    if (!plan) return j({ ok: false, error: `Unknown plan "${planCode}".` }, 400);

    const trialEndsAt =
      rawStatus === "trialing" && trialDays > 0
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // --- Insert organization -----------------------------------------------
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        slug,
        name,
        legal_name: legalName,
        country,
        currency,
        timezone,
        status: rawStatus,
        is_internal: false,
        trial_ends_at: trialEndsAt,
      })
      .select("*")
      .single();
    if (orgErr || !org) return j({ ok: false, error: orgErr?.message || "Failed to create org" }, 500);

    // --- Insert subscription -----------------------------------------------
    const { error: subErr } = await supabase.from("subscriptions").insert({
      organization_id: org.id,
      plan_id: plan.id,
      provider: "manual",
      status: rawStatus,
      interval: "month",
      trial_ends_at: trialEndsAt,
    });
    if (subErr) {
      // Best-effort rollback — we never want an org without a subscription row.
      await supabase.from("organizations").delete().eq("id", org.id);
      return j({ ok: false, error: `Subscription insert failed: ${subErr.message}` }, 500);
    }

    // --- Insert default location ------------------------------------------
    const { error: locErr } = await supabase.from("locations").insert({
      organization_id: org.id,
      name: primaryLocationName,
      slug: "main",
      short_code: primaryLocationShortCode,
      sort_order: 0,
      is_active: true,
    });
    if (locErr) {
      await supabase.from("subscriptions").delete().eq("organization_id", org.id);
      await supabase.from("organizations").delete().eq("id", org.id);
      return j({ ok: false, error: `Default branch insert failed: ${locErr.message}` }, 500);
    }

    // --- Audit ------------------------------------------------------------
    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: org.id,
      action: "organization.created",
      target_type: "organization",
      target_id: org.id,
      meta: {
        slug,
        plan: planCode,
        status: rawStatus,
        trialDays,
      },
    });

    return j({ ok: true, organization: org }, 201);
  } catch (err: unknown) {
    return errorResponse(err, "createOrganization");
  }
}

function errorResponse(err: unknown, scope: string): Response {
  console.error(`platform/organizations:${scope} error:`, err);
  if (err instanceof SupabaseConfigError) {
    return j({ ok: false, error: err.message }, 503);
  }
  return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
}
