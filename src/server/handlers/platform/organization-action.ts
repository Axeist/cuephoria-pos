/**
 * POST /api/platform/organization-action?id=<uuid>&op=<name>
 *
 * Operations (op=):
 *   suspend      — force status='suspended'. Internal orgs are refused.
 *   reactivate   — bring back to 'active' or the appropriate state.
 *   change-plan  — swap the active subscription's plan. Body: { planCode, confirm?: true }
 *                  Returns 409 with { warnings } when the new plan's limits
 *                  would be below current usage; pass `confirm: true` to force.
 *   end-trial    — fast-forward a trialing subscription to active.
 *   extend-trial — push trial_ends_at further into the future. Body: { days }
 *                  (1..365). Works on trialing subscriptions only.
 *   approve-signup — approve a pending_approval self-service signup; starts trial.
 *   reject-signup  — hard-delete a pending signup (frees email + slug).
 *
 * NOTE: The operation is read from `op`, not `action`. Vercel's
 * `api/platform/[action].ts` catch-all dispatcher overwrites any `action`
 * query parameter with the matched path segment, so the operation has to
 * travel under a different name.
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";
import { appBaseUrl, sendEmail } from "../../email";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRIAL_DAYS = 14;

const SUPPORTED_OPS = new Set([
  "suspend",
  "reactivate",
  "change-plan",
  "end-trial",
  "extend-trial",
  "approve-signup",
  "reject-signup",
]);

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  // Read from `op`, not `action`: see the file header for the reason.
  const action = (url.searchParams.get("op") || "").trim();

  if (!UUID_RE.test(id)) return j({ ok: false, error: "Invalid organization id." }, 400);
  if (!SUPPORTED_OPS.has(action)) return j({ ok: false, error: `Unsupported action "${action}".` }, 400);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { planCode?: string; confirm?: boolean; days?: number } = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-org-action");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, slug, name, status, is_internal")
      .eq("id", id)
      .maybeSingle();
    if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
    if (!org) return j({ ok: false, error: "Organization not found." }, 404);

    const pendingBlock = rejectIfPendingApproval(org.status, action);
    if (pendingBlock) return pendingBlock;

    if (action === "approve-signup") {
      return approveSignup(supabase, session, org);
    }

    if (action === "reject-signup") {
      return rejectSignup(supabase, session, org);
    }

    if (action === "suspend") {
      if (org.is_internal) {
        return j({ ok: false, error: "Internal organizations cannot be suspended." }, 409);
      }
      if (org.status === "suspended") {
        return j({ ok: true, organization: org, noop: true }, 200);
      }
      const { data: updated, error } = await supabase
        .from("organizations")
        .update({ status: "suspended" })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return j({ ok: false, error: error.message }, 500);
      await audit(supabase, session, id, "organization.suspended", { previousStatus: org.status });
      return j({ ok: true, organization: updated }, 200);
    }

    if (action === "reactivate") {
      if (org.status === "active") return j({ ok: true, organization: org, noop: true }, 200);
      const nextStatus = resolveReactivationStatus(supabase, id).then((s) => s);
      const status = await nextStatus;
      const { data: updated, error } = await supabase
        .from("organizations")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return j({ ok: false, error: error.message }, 500);
      await audit(supabase, session, id, "organization.reactivated", {
        previousStatus: org.status,
        nextStatus: status,
      });

      try {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("organization_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (subRow?.id) {
          await supabase
            .from("subscriptions")
            .update({ access_suspended: false, access_suspended_at: null })
            .eq("id", subRow.id);
        }
      } catch (billingClearErr) {
        console.warn("reactivate: non-fatal subscription billing flags clear", billingClearErr);
      }

      return j({ ok: true, organization: updated }, 200);
    }

    if (action === "extend-trial") {
      const days = Number(body.days);
      if (!Number.isFinite(days) || days < 1 || days > 365) {
        return j({ ok: false, error: "days must be an integer between 1 and 365." }, 400);
      }

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, status, trial_ends_at")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) return j({ ok: false, error: subErr.message }, 500);
      if (!sub) return j({ ok: false, error: "No subscription exists for this organization." }, 404);
      if (sub.status !== "trialing") {
        return j(
          { ok: false, error: `Cannot extend trial on a subscription in status "${sub.status}".` },
          409,
        );
      }

      // Anchor extensions to the later of (now, current trial_ends_at) so
      // extending a trial that already passed actually gives the tenant fresh
      // runway instead of landing in the past.
      const base = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
      const anchor = Math.max(base, Date.now());
      const newEnd = new Date(anchor + days * 24 * 60 * 60 * 1000).toISOString();

      const { data: subUpd, error: subUpdErr } = await supabase
        .from("subscriptions")
        .update({ trial_ends_at: newEnd })
        .eq("id", sub.id)
        .select("*")
        .single();
      if (subUpdErr) return j({ ok: false, error: subUpdErr.message }, 500);

      await supabase
        .from("organizations")
        .update({ trial_ends_at: newEnd, status: "trialing" })
        .eq("id", id);

      await audit(supabase, session, id, "subscription.trial_extended", {
        days,
        previousTrialEndsAt: sub.trial_ends_at,
        newTrialEndsAt: newEnd,
      });
      return j({ ok: true, subscription: subUpd }, 200);
    }

    if (action === "end-trial") {
      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) return j({ ok: false, error: subErr.message }, 500);
      if (!sub) return j({ ok: false, error: "No subscription exists for this organization." }, 404);
      if (sub.status !== "trialing") {
        return j({ ok: true, subscription: sub, noop: true }, 200);
      }
      // Mark subscription as canceled + access_suspended with no anchor timestamp
      // so the gate immediately blocks (no grace window) and shows "Subscription
      // suspended — retry payment" rather than granting access as if they paid.
      const { data: subUpd, error: subUpdErr } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          trial_ends_at: null,
          access_suspended: true,
          access_suspended_at: null,
        })
        .eq("id", sub.id)
        .select("*")
        .single();
      if (subUpdErr) return j({ ok: false, error: subUpdErr.message }, 500);
      // Move org out of 'trialing' so the trial bypass in SubscriptionGate no
      // longer fires. 'past_due' signals billing needs attention without
      // platform-suspending the workspace (which would block /subscription too).
      await supabase
        .from("organizations")
        .update({ status: "past_due", trial_ends_at: null })
        .eq("id", id);
      await audit(supabase, session, id, "subscription.trial_ended_manually", {});
      return j({ ok: true, subscription: subUpd }, 200);
    }

    if (action === "change-plan") {
      const targetCode = (body.planCode || "").trim().toLowerCase();
      if (!targetCode) return j({ ok: false, error: "planCode is required." }, 400);

      const { data: plan, error: planErr } = await supabase
        .from("plans")
        .select("id, code, name, is_active")
        .eq("code", targetCode)
        .maybeSingle();
      if (planErr) return j({ ok: false, error: planErr.message }, 500);
      if (!plan || !plan.is_active) return j({ ok: false, error: `Plan "${targetCode}" is not available.` }, 404);

      // Load limits for the target plan.
      const { data: featureRows, error: featErr } = await supabase
        .from("plan_features")
        .select("key, value")
        .eq("plan_id", plan.id);
      if (featErr) return j({ ok: false, error: featErr.message }, 500);
      const limits: Record<string, unknown> = Object.fromEntries(
        (featureRows ?? []).map((r) => [r.key, r.value]),
      );

      // Load current usage.
      const [{ count: stationCount }, { count: memberCount }, { count: branchCount }] = await Promise.all([
        supabase
          .from("stations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id),
        supabase
          .from("org_memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id),
        supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id)
          .eq("is_active", true),
      ]);

      const warnings: string[] = [];
      const maxBranches = Number(limits.max_branches ?? 0);
      const maxStations = Number(limits.max_stations ?? 0);
      const maxAdminSeats = Number(limits.max_admin_seats ?? 0);

      if (maxBranches && (branchCount ?? 0) > maxBranches) {
        warnings.push(`Current active branches (${branchCount}) exceed new limit (${maxBranches}).`);
      }
      if (maxStations && (stationCount ?? 0) > maxStations) {
        warnings.push(`Current stations (${stationCount}) exceed new limit (${maxStations}).`);
      }
      if (maxAdminSeats && (memberCount ?? 0) > maxAdminSeats) {
        warnings.push(`Current members (${memberCount}) exceed new limit (${maxAdminSeats}).`);
      }

      if (warnings.length > 0 && body.confirm !== true) {
        return j({ ok: false, error: "Plan downgrade exceeds current usage.", warnings }, 409);
      }

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) return j({ ok: false, error: subErr.message }, 500);

      if (!sub) {
        // No subscription yet — insert one.
        const { data: newSub, error: insErr } = await supabase
          .from("subscriptions")
          .insert({
            organization_id: id,
            plan_id: plan.id,
            provider: "manual",
            status: "active",
            interval: "month",
          })
          .select("*")
          .single();
        if (insErr) return j({ ok: false, error: insErr.message }, 500);
        await audit(supabase, session, id, "subscription.plan_changed", {
          fromPlan: null,
          toPlan: targetCode,
          warnings,
        });
        return j({ ok: true, subscription: newSub, warnings }, 200);
      }

      const { data: updated, error: updErr } = await supabase
        .from("subscriptions")
        .update({ plan_id: plan.id })
        .eq("id", sub.id)
        .select("*")
        .single();
      if (updErr) return j({ ok: false, error: updErr.message }, 500);
      await audit(supabase, session, id, "subscription.plan_changed", {
        fromPlanId: sub.plan_id,
        toPlan: targetCode,
        warnings,
      });
      return j({ ok: true, subscription: updated, warnings }, 200);
    }

    return j({ ok: false, error: "Unhandled action." }, 500);
  } catch (err: unknown) {
    console.error("platform/organization-action error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

function rejectIfPendingApproval(status: string, action: string): Response | null {
  if (status !== "pending_approval") return null;
  if (action === "approve-signup" || action === "reject-signup") return null;
  return j(
    {
      ok: false,
      error: "Organization is awaiting signup approval. Use Approve or Reject signup instead.",
    },
    409,
  );
}

async function approveSignup(
  supabase: ReturnType<typeof supabaseServiceClient>,
  session: { id: string; email: string },
  org: { id: string; slug: string; name: string; status: string },
): Promise<Response> {
  if (org.status !== "pending_approval") {
    if (org.status === "trialing") {
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, trial_ends_at, status")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingSub) {
        return j({ ok: true, organization: org, subscription: existingSub, noop: true }, 200);
      }
    }
    return j(
      { ok: false, error: `Cannot approve signup — organization status is "${org.status}".` },
      409,
    );
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id, trial_ends_at, status")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existingSub) {
    const { data: trialPlan } = await supabase
      .from("plans")
      .select("id")
      .eq("code", "pro")
      .maybeSingle();
    if (!trialPlan?.id) {
      return j({ ok: false, error: "Trial plan (pro) is not configured." }, 500);
    }
    const { error: subErr } = await supabase.from("subscriptions").insert({
      organization_id: org.id,
      plan_id: trialPlan.id,
      provider: "internal",
      status: "trialing",
      interval: "month",
      current_period_start: nowIso,
      current_period_end: trialEndsAt,
      trial_ends_at: trialEndsAt,
    });
    if (subErr) {
      return j({ ok: false, error: subErr.message || "Could not create trial subscription." }, 500);
    }
  }

  const { data: updated, error: orgUpdErr } = await supabase
    .from("organizations")
    .update({ status: "trialing", trial_ends_at: trialEndsAt })
    .eq("id", org.id)
    .eq("status", "pending_approval")
    .select("*")
    .maybeSingle();
  if (orgUpdErr) return j({ ok: false, error: orgUpdErr.message }, 500);
  if (!updated) {
    return j({ ok: false, error: "Organization is no longer pending approval." }, 409);
  }

  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("id, trial_ends_at, status")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await audit(supabase, session, org.id, "organization.signup_approved", {
    slug: org.slug,
    trialEndsAt,
  });

  try {
    const { data: ownerMem } = await supabase
      .from("org_memberships")
      .select("admin_users:admin_user_id ( email, display_name )")
      .eq("organization_id", org.id)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    type OwnerEmbed = { email: string | null; display_name: string | null };
    const raw = ownerMem?.admin_users as OwnerEmbed | OwnerEmbed[] | null;
    const owner = Array.isArray(raw) ? raw[0] : raw;
    if (owner?.email) {
      const base = appBaseUrl();
      await sendEmail({
        kind: "signup_approved",
        to: owner.email,
        vars: {
          appBaseUrl: base,
          displayName: owner.display_name || undefined,
          organizationName: org.name,
          onboardingUrl: `${base}/onboarding`,
          trialEndsAt: new Date(trialEndsAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        },
        organizationId: org.id,
        supabase,
      });
    }
  } catch (mailErr) {
    console.warn("approve-signup: approval email failed", mailErr);
  }

  return j({ ok: true, organization: updated, subscription: subRow }, 200);
}

async function rejectSignup(
  supabase: ReturnType<typeof supabaseServiceClient>,
  session: { id: string; email: string },
  org: { id: string; slug: string; name: string; status: string; is_internal?: boolean },
): Promise<Response> {
  if (org.status !== "pending_approval") {
    return j(
      { ok: false, error: `Cannot reject signup — organization status is "${org.status}".` },
      409,
    );
  }
  if (org.is_internal) {
    return j({ ok: false, error: "Internal organizations cannot be deleted." }, 409);
  }

  await audit(supabase, session, org.id, "organization.signup_rejected", { slug: org.slug });

  const snapshot = { id: org.id, slug: org.slug, name: org.name };
  const { data, error: rpcErr } = await supabase.rpc("platform_delete_organization", {
    org_id: org.id,
    confirm_slug: org.slug,
  });
  if (rpcErr) {
    return j(
      { ok: false, error: rpcErr.message || "Delete failed.", code: rpcErr.code },
      500,
    );
  }

  try {
    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      action: "organization.deleted",
      target_type: "organization",
      target_id: snapshot.id,
      meta: {
        deleted_organization: snapshot,
        reason: "signup_rejected",
        counts: (data as { counts?: unknown } | null)?.counts ?? null,
      },
    });
  } catch (err) {
    console.warn("audit write for signup reject delete failed:", err);
  }

  return j({ ok: true, deleted: snapshot, counts: (data as { counts?: unknown } | null)?.counts ?? null }, 200);
}

// Prefer trialing when a trial end date is still in the future, otherwise active.
async function resolveReactivationStatus(
  supabase: ReturnType<typeof supabaseServiceClient>,
  orgId: string,
): Promise<"trialing" | "active"> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sub?.trial_ends_at && new Date(sub.trial_ends_at).getTime() > Date.now()) {
    return "trialing";
  }
  return "active";
}

async function audit(
  supabase: ReturnType<typeof supabaseServiceClient>,
  session: { id: string; email: string },
  orgId: string,
  action: string,
  meta: Record<string, unknown>,
) {
  try {
    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: orgId,
      action,
      target_type: "organization",
      target_id: orgId,
      meta,
    });
  } catch (err) {
    console.warn(`audit write failed for ${action}:`, err);
  }
}
