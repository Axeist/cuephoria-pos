/**
 * /api/platform/organization?id=<uuid>
 *
 * GET   — detailed view (org + subscription + plan + plan_features +
 *         locations + members + recent audit activity).
 * PATCH — update editable fields (name, legal_name, country, currency,
 *         timezone). Slug is immutable. Platform session required.
 */

import { j } from "../../src/server/adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../src/server/supabaseServer";
import { requirePlatformSession } from "../../src/server/platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!UUID_RE.test(id)) return j({ ok: false, error: "Invalid organization id." }, 400);

  if (req.method === "GET") return getDetail(req, id);
  if (req.method === "PATCH") return patchDetail(req, id);
  return j({ ok: false, error: "Method not allowed" }, 405);
}

async function getDetail(req: Request, id: string): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-org-detail");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
    if (!org) return j({ ok: false, error: "Organization not found." }, 404);

    const [
      subRes,
      plansRes,
      featuresRes,
      locationsRes,
      membershipRes,
      activityRes,
      stationCountRes,
      customerCountRes,
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("plans").select("*").order("sort_order", { ascending: true }),
      supabase.from("plan_features").select("plan_id, key, value"),
      supabase
        .from("locations")
        .select("id, name, slug, short_code, sort_order, is_active, created_at")
        .eq("organization_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("org_memberships")
        .select("id, role, created_at, admin_user_id, admin_users:admin_user_id(id, username, is_admin, is_super_admin, created_at)")
        .eq("organization_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("audit_log")
        .select("id, actor_type, actor_label, action, target_type, target_id, meta, created_at")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("stations").select("id", { count: "exact", head: true }).eq("organization_id", id),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", id),
    ]);

    for (const r of [subRes, plansRes, featuresRes, locationsRes, membershipRes, activityRes]) {
      if (r.error) return j({ ok: false, error: r.error.message }, 500);
    }

    const sub = subRes.data as
      | {
          id: string;
          plan_id: string;
          provider: string;
          status: string;
          interval: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        }
      | null;

    const plans = plansRes.data as Array<{
      id: string;
      code: string;
      name: string;
      is_public: boolean;
      price_inr_month: number | null;
      price_inr_year: number | null;
      sort_order: number;
      is_active: boolean;
    }>;
    const plan = sub ? plans.find((p) => p.id === sub.plan_id) : undefined;

    const featureRows = featuresRes.data as Array<{ plan_id: string; key: string; value: unknown }>;
    const currentFeatures = plan
      ? Object.fromEntries(
          featureRows
            .filter((f) => f.plan_id === plan.id)
            .map((f) => [f.key, f.value]),
        )
      : {};

    const members = (membershipRes.data ?? []).map(
      (m: {
        id: string;
        role: string;
        created_at: string;
        admin_user_id: string;
        admin_users:
          | { id: string; username: string; is_admin: boolean; is_super_admin: boolean; created_at: string }
          | Array<{ id: string; username: string; is_admin: boolean; is_super_admin: boolean; created_at: string }>
          | null;
      }) => {
        const au = Array.isArray(m.admin_users) ? m.admin_users[0] : m.admin_users;
        return {
          membershipId: m.id,
          role: m.role,
          joinedAt: m.created_at,
          adminUserId: m.admin_user_id,
          username: au?.username ?? null,
          isAdmin: au?.is_admin ?? false,
          isSuperAdmin: au?.is_super_admin ?? false,
        };
      },
    );

    return j(
      {
        ok: true,
        organization: org,
        subscription: sub,
        plan,
        plans,
        currentFeatures,
        locations: locationsRes.data ?? [],
        members,
        activity: activityRes.data ?? [],
        usage: {
          stations: stationCountRes.count ?? 0,
          customers: customerCountRes.count ?? 0,
          branches: (locationsRes.data ?? []).filter((l: { is_active: boolean }) => l.is_active).length,
        },
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/organization GET error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

async function patchDetail(req: Request, id: string): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (v.length < 2 || v.length > 120) return j({ ok: false, error: "Name must be 2–120 chars." }, 400);
    updates.name = v;
  }
  if (body.legalName !== undefined) {
    if (body.legalName === null || body.legalName === "") {
      updates.legal_name = null;
    } else if (typeof body.legalName === "string") {
      updates.legal_name = body.legalName.trim();
    }
  }
  if (typeof body.country === "string") {
    updates.country = body.country.trim().toUpperCase().slice(0, 2);
  }
  if (typeof body.currency === "string") {
    updates.currency = body.currency.trim().toUpperCase().slice(0, 3);
  }
  if (typeof body.timezone === "string") {
    updates.timezone = body.timezone.trim().slice(0, 64);
  }

  if (Object.keys(updates).length === 0) {
    return j({ ok: false, error: "No editable fields provided." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-org-patch");

    const { data: existing, error: existErr } = await supabase
      .from("organizations")
      .select("id, slug, is_internal")
      .eq("id", id)
      .maybeSingle();
    if (existErr) return j({ ok: false, error: existErr.message }, 500);
    if (!existing) return j({ ok: false, error: "Organization not found." }, 404);

    const { data: updated, error: updErr } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (updErr) return j({ ok: false, error: updErr.message }, 500);

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: id,
      action: "organization.updated",
      target_type: "organization",
      target_id: id,
      meta: { fields: Object.keys(updates) },
    });

    return j({ ok: true, organization: updated }, 200);
  } catch (err: unknown) {
    console.error("platform/organization PATCH error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
