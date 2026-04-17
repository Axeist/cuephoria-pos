/**
 * POST /api/tenant/onboarding — save onboarding step + optionally complete.
 *
 * Body:
 *   {
 *     step?: "profile" | "brand" | "business" | "complete",
 *     displayName?: string,
 *     tagline?: string,
 *     primaryColor?: string,     // #rrggbb
 *     accentColor?: string,      // #rrggbb
 *     logoUrl?: string,          // https://...
 *     iconUrl?: string,          // https://...
 *     businessType?: "gaming_lounge" | "cafe" | "arcade" | "club" | "billiards" | "bowling" | "other",
 *     timezone?: string,
 *     complete?: boolean         // alternative to step==="complete"
 *   }
 *
 * The endpoint is additive: any field omitted is left untouched. Calling
 * with `complete: true` stamps `onboarding_completed_at = now()` so the
 * frontend ProtectedRoute stops gating them.
 *
 * Only owners and admins of the tenant may call this. Runs on Edge.
 */

import { j } from "../../src/server/adminApiUtils";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext";

export const config = { runtime: "edge" };

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const HTTPS_URL_RE = /^https:\/\//i;
const BUSINESS_TYPES = new Set([
  "gaming_lounge",
  "cafe",
  "arcade",
  "club",
  "billiards",
  "bowling",
  "other",
]);

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return j({ ok: false, error: "Only owners and admins can edit onboarding." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return j({ ok: false, error: "Invalid JSON body" }, 400);
  }

  // ── Fetch current org so we can merge branding + validate everything
  //    before any write hits the DB.
  const { data: orgRow, error: orgErr } = await ctx.supabase
    .from("organizations")
    .select("id, name, branding, timezone, business_type, onboarding_completed_at")
    .eq("id", ctx.organizationId)
    .maybeSingle();

  if (orgErr || !orgRow) {
    return j({ ok: false, error: orgErr?.message || "Organization not found" }, 500);
  }

  // ── Build the next branding JSONB. Keep everything previously set that
  //    the client didn't mention so partial updates work step-by-step.
  const currentBranding =
    (orgRow.branding as Record<string, unknown> | null) ?? {};
  const nextBranding: Record<string, unknown> = { ...currentBranding };

  const stringField = (key: string, value: unknown, maxLen: number): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLen) {
      throw new Error(`${key} exceeds ${maxLen} characters`);
    }
    return trimmed;
  };

  try {
    if ("displayName" in body) {
      const v = stringField("displayName", body.displayName, 120);
      if (v) nextBranding.display_name = v;
      else delete nextBranding.display_name;
    }
    if ("tagline" in body) {
      const v = stringField("tagline", body.tagline, 160);
      if (v) nextBranding.tagline = v;
      else delete nextBranding.tagline;
    }
    if ("primaryColor" in body) {
      const raw = typeof body.primaryColor === "string" ? body.primaryColor.trim() : "";
      if (raw === "") {
        delete nextBranding.primary_color;
      } else if (!HEX_COLOR_RE.test(raw)) {
        return j({ ok: false, error: "primaryColor must look like #rrggbb." }, 400);
      } else {
        nextBranding.primary_color = raw.toLowerCase();
      }
    }
    if ("accentColor" in body) {
      const raw = typeof body.accentColor === "string" ? body.accentColor.trim() : "";
      if (raw === "") {
        delete nextBranding.accent_color;
      } else if (!HEX_COLOR_RE.test(raw)) {
        return j({ ok: false, error: "accentColor must look like #rrggbb." }, 400);
      } else {
        nextBranding.accent_color = raw.toLowerCase();
      }
    }
    if ("logoUrl" in body) {
      const raw = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
      if (raw === "") {
        delete nextBranding.logo_url;
      } else if (!HTTPS_URL_RE.test(raw) || raw.length > 512) {
        return j({ ok: false, error: "logoUrl must be an https:// URL (<=512 chars)." }, 400);
      } else {
        nextBranding.logo_url = raw;
      }
    }
    if ("iconUrl" in body) {
      const raw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : "";
      if (raw === "") {
        delete nextBranding.icon_url;
      } else if (!HTTPS_URL_RE.test(raw) || raw.length > 512) {
        return j({ ok: false, error: "iconUrl must be an https:// URL (<=512 chars)." }, 400);
      } else {
        nextBranding.icon_url = raw;
      }
    }
  } catch (err) {
    return j({ ok: false, error: (err as Error).message }, 400);
  }

  // ── Top-level org updates (business_type, timezone).
  const update: Record<string, unknown> = { branding: nextBranding };

  if ("businessType" in body) {
    const raw = typeof body.businessType === "string" ? body.businessType.trim() : "";
    if (raw === "") {
      update.business_type = null;
    } else if (!BUSINESS_TYPES.has(raw)) {
      return j({ ok: false, error: "Invalid businessType." }, 400);
    } else {
      update.business_type = raw;
    }
  }

  if ("timezone" in body) {
    const tz = typeof body.timezone === "string" ? body.timezone.trim() : "";
    if (tz && tz.length <= 64) update.timezone = tz;
  }

  // Optional display_name also lives on organizations.name when provided so
  // the dashboard header reads correctly even pre-branding-provider.
  if (typeof nextBranding.display_name === "string" && !orgRow.name) {
    update.name = nextBranding.display_name;
  }

  const complete =
    body.complete === true || body.step === "complete";
  if (complete) {
    update.onboarding_completed_at = new Date().toISOString();
  }

  const { data: updatedOrg, error: updErr } = await ctx.supabase
    .from("organizations")
    .update(update)
    .eq("id", ctx.organizationId)
    .select(
      "id, slug, name, branding, business_type, timezone, onboarding_completed_at, trial_ends_at, status",
    )
    .single();

  if (updErr || !updatedOrg) {
    return j({ ok: false, error: updErr?.message || "Update failed" }, 500);
  }

  // ── Audit log
  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: complete ? "organization.onboarding.completed" : "organization.onboarding.progress",
    target_type: "organization",
    target_id: ctx.organizationId,
    meta: {
      step: typeof body.step === "string" ? body.step : null,
      keys_updated: Object.keys(update),
    },
  });

  return j(
    {
      ok: true,
      organization: {
        id: updatedOrg.id,
        slug: updatedOrg.slug,
        name: updatedOrg.name,
        branding: updatedOrg.branding,
        businessType: updatedOrg.business_type,
        timezone: updatedOrg.timezone,
        onboardingCompletedAt: updatedOrg.onboarding_completed_at,
        trialEndsAt: updatedOrg.trial_ends_at,
        status: updatedOrg.status,
      },
    },
    200,
  );
}

export default withOrgContext(handler);
