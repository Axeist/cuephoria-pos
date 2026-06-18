/**
 * GET /api/platform/stats
 *
 * High-level SaaS health metrics for the platform dashboard: total/active/
 * trialing/past-due org counts, and a naive MRR approximation based on
 * subscribed plans (excludes internal orgs).
 */

import { createClient } from "@supabase/supabase-js";
import { j, getEnv } from "../../adminApiUtils";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

function service() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Supabase service env vars missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-platform-stats" } },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = service();

    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, status, is_internal, created_at");
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);

    const total = orgs?.length ?? 0;
    let active = 0;
    let trialing = 0;
    let pastDue = 0;
    let canceled = 0;
    let suspended = 0;
    let internal = 0;

    for (const o of orgs ?? []) {
      if (o.is_internal) internal += 1;
      switch (o.status) {
        case "active":
          active += 1;
          break;
        case "trialing":
          trialing += 1;
          break;
        case "past_due":
          pastDue += 1;
          break;
        case "canceled":
          canceled += 1;
          break;
        case "suspended":
          suspended += 1;
          break;
      }
    }

    // MRR: sum of billed plans on month intervals; years are divided by 12.
    // Internal + manual + no-price plans excluded.
    const { data: subs, error: subErr } = await supabase
      .from("subscriptions")
      .select("organization_id, plan_id, status, interval, provider")
      .in("status", ["active", "trialing", "past_due"]);
    if (subErr) return j({ ok: false, error: subErr.message }, 500);

    const { data: plans, error: planErr } = await supabase
      .from("plans")
      .select("id, code, price_inr_month, price_inr_year");
    if (planErr) return j({ ok: false, error: planErr.message }, 500);

    const planById = new Map<string, { code: string; month: number | null; year: number | null }>();
    for (const p of plans ?? []) {
      planById.set(p.id, {
        code: p.code,
        month: p.price_inr_month === null ? null : Number(p.price_inr_month),
        year: p.price_inr_year === null ? null : Number(p.price_inr_year),
      });
    }

    const internalOrgIds = new Set((orgs ?? []).filter((o) => o.is_internal).map((o) => o.id));

    let mrrInr = 0;
    let payingOrgs = 0;
    for (const s of subs ?? []) {
      if (internalOrgIds.has(s.organization_id)) continue;
      if (s.provider === "internal" || s.provider === "manual") continue;
      const p = planById.get(s.plan_id);
      if (!p) continue;
      if (s.interval === "year" && p.year) {
        mrrInr += p.year / 12;
        payingOrgs += 1;
      } else if (p.month) {
        mrrInr += p.month;
        payingOrgs += 1;
      }
    }

    // 7-day new org count
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newThisWeek = (orgs ?? []).filter((o) => o.created_at && o.created_at >= since).length;

    return j(
      {
        ok: true,
        stats: {
          totalOrgs: total,
          active,
          trialing,
          pastDue,
          canceled,
          suspended,
          internal,
          newOrgsLast7Days: newThisWeek,
          mrrInr: Math.round(mrrInr * 100) / 100,
          payingOrgs,
        },
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/stats error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
