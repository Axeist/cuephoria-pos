import {
  ADMIN_SESSION_COOKIE,
  isSessionRevoked,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { supabaseServiceClient } from "../../supabaseServer";

export const config = { runtime: "edge" };

/**
 * Session-probe endpoint.
 *
 * Response shape is backwards-compatible:
 *   { ok: true, user: AdminSessionUser | null }
 *
 * Slice 0 addition: when the session is valid AND the user has a membership,
 * we also surface an `organization` object for the frontend to boot into
 * org-scoped UI. Failure to resolve the org is never fatal here — the
 * endpoint keeps returning `{ ok: true, user }` exactly as before.
 */
export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    if (!token) return j({ ok: true, user: null }, 200);

    const user = await verifyAdminSession(token);
    if (!user) return j({ ok: true, user: null }, 200);

    // Slice 5: kill this session if the user's password has been rotated
    // since the cookie was issued. Fail-open on infra errors (see helper).
    try {
      const revokeSupabase = supabaseServiceClient("cuephoria-admin-me-revoke");
      if (await isSessionRevoked(user, revokeSupabase)) {
        return j({ ok: true, user: null }, 200);
      }
    } catch (revokeErr) {
      console.warn("me.ts: non-fatal revocation check error", revokeErr);
    }

    let organization: {
      id: string;
      slug: string;
      name: string | null;
      isInternal: boolean;
      role: string;
      onboardingCompletedAt: string | null;
      businessType: string | null;
      branding: Record<string, unknown>;
      trialEndsAt: string | null;
      status: string | null;
    } | null = null;

    /**
     * Slice 16: lightweight subscription snapshot consumed by the
     * SubscriptionGate on the client. We only need the fields required to
     * decide whether the current tenant gets access — verbatim Razorpay
     * status, the access_suspended flag, current period end (for
     * "grace-until" UX), and the plan tier label.
     *
     * This is intentionally a best-effort lookup. If the table is missing
     * the lifecycle columns yet (migration 20260616130000 not yet applied),
     * we still return the row but with nulls, and the gate degrades to
     * "no subscription" so the user is redirected to /subscription rather
     * than getting an opaque error.
     */
    let subscription: {
      hasSubscription: boolean;
      razorpayStatus: string | null;
      accessSuspended: boolean;
      accessSuspendedAt: string | null;
      planTier: string | null;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    } | null = null;

    try {
      const ctx = await resolveOrgContext(req);
      if ("code" in ctx) {
        if (ctx.code === "unauthorized" || ctx.code === "no_org") {
          return j({ ok: true, user: null, organization: null }, 200);
        }
      } else {
        // Slice 13: hydrate the rest of the tenant-facing fields the UI needs
        // for the onboarding wizard + branding provider. Best-effort — if the
        // lookup fails, we still surface the core id/slug/role.
        let extras: {
          name: string | null;
          onboardingCompletedAt: string | null;
          businessType: string | null;
          branding: Record<string, unknown>;
          trialEndsAt: string | null;
          status: string | null;
        } = {
          name: null,
          onboardingCompletedAt: null,
          businessType: null,
          branding: {},
          trialEndsAt: null,
          status: null,
        };
        try {
          const { data: orgRow } = await ctx.supabase
            .from("organizations")
            .select("name, onboarding_completed_at, business_type, branding, trial_ends_at, status")
            .eq("id", ctx.organizationId)
            .maybeSingle();
          if (orgRow) {
            extras = {
              name: orgRow.name ?? null,
              onboardingCompletedAt: orgRow.onboarding_completed_at ?? null,
              businessType: orgRow.business_type ?? null,
              branding: (orgRow.branding as Record<string, unknown>) ?? {},
              trialEndsAt: orgRow.trial_ends_at ?? null,
              status: orgRow.status ?? null,
            };
          }
        } catch (extraErr) {
          console.warn("me.ts: non-fatal org extras lookup", extraErr);
        }

        organization = {
          id: ctx.organizationId,
          slug: ctx.organizationSlug,
          isInternal: ctx.isInternal,
          role: ctx.role,
          ...extras,
        };

        // Subscription snapshot — used by the client-side SubscriptionGate.
        // SELECT * so missing lifecycle columns (razorpay_status,
        // access_suspended, cancel_at_period_end) don't fail the query.
        try {
          const { data: subRow } = await ctx.supabase
            .from("subscriptions")
            .select("*")
            .eq("organization_id", ctx.organizationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (subRow) {
            const row = subRow as Record<string, unknown>;
            subscription = {
              hasSubscription: true,
              razorpayStatus:
                typeof row.razorpay_status === "string" ? row.razorpay_status : null,
              accessSuspended:
                typeof row.access_suspended === "boolean" ? row.access_suspended : false,
              accessSuspendedAt:
                typeof row.access_suspended_at === "string" ? row.access_suspended_at : null,
              planTier: typeof row.plan_tier === "string" ? row.plan_tier : null,
              currentPeriodEnd:
                typeof row.current_period_end === "string" ? row.current_period_end : null,
              cancelAtPeriodEnd:
                typeof row.cancel_at_period_end === "boolean"
                  ? row.cancel_at_period_end
                  : false,
            };
          } else {
            subscription = {
              hasSubscription: false,
              razorpayStatus: null,
              accessSuspended: false,
              accessSuspendedAt: null,
              planTier: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            };
          }
        } catch (subErr) {
          console.warn("me.ts: non-fatal subscription lookup error", subErr);
        }
      }
    } catch (orgErr) {
      console.warn("me.ts: non-fatal org resolution error", orgErr);
    }

    // Slice 4: surface the rotation flag so the UI can force a change
    // before rendering anything else. Best-effort; a DB hiccup falls back
    // to "no rotation required" rather than locking users out.
    let mustChangePassword = false;
    let profileRow: {
      must_change_password: boolean | null;
      display_name: string | null;
      designation: string | null;
      email: string | null;
    } | null = null;
    try {
      const supabase = supabaseServiceClient("cuephoria-admin-me");
      const { data } = await supabase
        .from("admin_users")
        .select("must_change_password, display_name, designation, email")
        .eq("id", user.id)
        .maybeSingle();
      profileRow = data;
      mustChangePassword = !!profileRow?.must_change_password;
    } catch (flagErr) {
      console.warn("me.ts: non-fatal must_change lookup error", flagErr);
    }

    return j(
      {
        ok: true,
        user: {
          ...user,
          mustChangePassword,
          displayName: profileRow?.display_name ?? null,
          designation: profileRow?.designation ?? null,
          email: profileRow?.email ?? null,
        },
        organization,
        subscription,
      },
      200,
    );
  } catch (err: unknown) {
    console.error("Admin session check error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
