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
      }
    } catch (orgErr) {
      console.warn("me.ts: non-fatal org resolution error", orgErr);
    }

    // Slice 4: surface the rotation flag so the UI can force a change
    // before rendering anything else. Best-effort; a DB hiccup falls back
    // to "no rotation required" rather than locking users out.
    let mustChangePassword = false;
    try {
      const supabase = supabaseServiceClient("cuephoria-admin-me");
      const { data: flagRow } = await supabase
        .from("admin_users")
        .select("must_change_password")
        .eq("id", user.id)
        .maybeSingle();
      mustChangePassword = !!flagRow?.must_change_password;
    } catch (flagErr) {
      console.warn("me.ts: non-fatal must_change lookup error", flagErr);
    }

    return j(
      {
        ok: true,
        user: { ...user, mustChangePassword },
        organization,
      },
      200,
    );
  } catch (err: unknown) {
    console.error("Admin session check error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
