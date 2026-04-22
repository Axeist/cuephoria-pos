/**
 * POST /api/tenant/signup — self-service tenant provisioning.
 *
 * Creates a fresh Cuetronix workspace in one shot:
 *   1. organizations row (trialing, 14-day trial, is_internal=false,
 *      onboarding_completed_at=NULL so the wizard gates them).
 *   2. locations row (a default "Main" branch so the existing multi-location
 *      plumbing in the app never sees an org with zero branches).
 *   3. admin_users row (is_admin=true, password_hash, must_change_password
 *      stays false — the signup form already captured a strong password).
 *   4. org_memberships row (role=owner).
 *   5. subscriptions row (plan=starter, status=trialing, interval=month,
 *      trial_ends_at=now()+14d).
 *   6. audit_log entry.
 *
 * Returns success without issuing a session cookie. New owners must verify
 * their email before first login.
 *
 * Runs on Vercel Edge.
 */

import { createClient } from "@supabase/supabase-js";
import {
  getEnv,
  j,
} from "../../adminApiUtils";
import { hashPassword } from "../../passwordUtils";
import { usernameFromEmail } from "../../lib/tenantUsername";
import { appBaseUrl, sendEmail } from "../../email";
import { issueEmailToken } from "../../emailTokens";

export const config = { runtime: "edge" };

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
const TRIAL_DAYS = 14;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function slugifyCandidate(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function passwordFeedback(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/\d/.test(pw)) return "Password must include a digit.";
  return null;
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return j({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const organizationName = String(payload.organizationName ?? "").trim();
  const requestedSlugRaw = String(payload.slug ?? payload.organizationSlug ?? "").trim();
  const ownerPassword = String(payload.password ?? "");
  const ownerEmail = String(payload.email ?? "").trim().toLowerCase();
  const ownerDisplayName = String(payload.displayName ?? payload.ownerName ?? "").trim();
  const timezone = String(payload.timezone ?? "Asia/Kolkata").trim() || "Asia/Kolkata";
  const acceptedTerms = Boolean(payload.acceptedTerms);

  // ── Input validation ────────────────────────────────────────────────────
  if (organizationName.length < 2 || organizationName.length > 120) {
    return j({ ok: false, error: "Workspace name must be 2–120 characters." }, 400);
  }
  if (!isValidEmail(ownerEmail)) {
    return j({ ok: false, error: "Enter a valid email address.", field: "email" }, 400);
  }
  if (ownerDisplayName.length > 0 && (ownerDisplayName.length < 2 || ownerDisplayName.length > 120)) {
    return j(
      { ok: false, error: "Your name must be 2–120 characters, or leave it blank.", field: "displayName" },
      400,
    );
  }
  const pwErr = passwordFeedback(ownerPassword);
  if (pwErr) return j({ ok: false, error: pwErr }, 400);
  if (!acceptedTerms) {
    return j(
      { ok: false, error: "You must accept the Terms of Service and Privacy Policy to continue." },
      400,
    );
  }

  // Derive a slug. Accept whatever the client submitted if valid; otherwise
  // fall back to slugify(organizationName).
  const slug = requestedSlugRaw ? slugifyCandidate(requestedSlugRaw) : slugifyCandidate(organizationName);
  if (!SLUG_RE.test(slug)) {
    return j(
      {
        ok: false,
        error:
          "Workspace URL must be 3–40 characters, lowercase letters / digits / dashes, starting with a letter.",
      },
      400,
    );
  }

  try {
    const supabase = createClient(
      getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || need("SUPABASE_URL"),
      need("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { "x-application-name": "cuetronix-signup" } },
      },
    );

    let ownerUsername = usernameFromEmail(ownerEmail);
    const { data: emailTaken } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", ownerEmail)
      .maybeSingle();
    if (emailTaken) {
      return j(
        {
          ok: false,
          error: "An account with this email already exists. Sign in instead.",
          field: "email",
        },
        409,
      );
    }

    // ── Uniqueness pre-check: slug + derived username handle ─────────────
    const { data: usernameTaken } = await supabase
      .from("admin_users")
      .select("id")
      .eq("username", ownerUsername)
      .maybeSingle();
    if (usernameTaken) {
      ownerUsername = `${ownerUsername}-${Math.random().toString(36).slice(2, 6)}`;
      const again = await supabase.from("admin_users").select("id").eq("username", ownerUsername).maybeSingle();
      if (again.data) {
        ownerUsername = `${usernameFromEmail(ownerEmail)}-${Math.random().toString(36).slice(2, 8)}`;
      }
    }

    const { data: slugTaken } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle();

    if (slugTaken) {
      return j(
        { ok: false, error: `The URL "${slug}" is already taken. Try a different one.`, field: "slug" },
        409,
      );
    }

    // ── Look up the starter plan ──────────────────────────────────────────
    const { data: starterPlan, error: planErr } = await supabase
      .from("plans")
      .select("id")
      .eq("code", "starter")
      .maybeSingle();
    if (planErr || !starterPlan) {
      return j(
        { ok: false, error: "Starter plan unavailable. Contact support at hello@cuetronix.com." },
        500,
      );
    }

    // ── Create the organization (no branding yet — wizard sets it) ────────
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: newOrg, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        slug,
        name: organizationName,
        country: "IN",
        currency: "INR",
        timezone,
        status: "trialing",
        is_internal: false,
        trial_ends_at: trialEndsAt,
        onboarding_completed_at: null,
      })
      .select("id, slug")
      .single();

    if (orgErr || !newOrg) {
      return j({ ok: false, error: orgErr?.message || "Could not create workspace." }, 500);
    }

    // ── Default location so the existing multi-location plumbing works.
    //    `locations.slug` and `short_code` are GLOBALLY unique (they predate
    //    multi-tenancy), so we namespace both by the org slug + a short
    //    random tail to avoid collisions across tenants.
    const shortCodeSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const locationSlugCandidate = `${newOrg.slug}-main`.slice(0, 40);
    const shortCodeCandidate = `${newOrg.slug.slice(0, 4).toUpperCase()}${shortCodeSuffix}`.slice(0, 10);
    const { data: defaultLocation, error: locErr } = await supabase
      .from("locations")
      .insert({
        organization_id: newOrg.id,
        name: "Main",
        slug: locationSlugCandidate,
        short_code: shortCodeCandidate,
        is_active: true,
        sort_order: 0,
      })
      .select("id")
      .maybeSingle();
    if (locErr) {
      console.warn("signup: default location insert failed", locErr.message);
    }

    // ── Create the owner admin_user ──────────────────────────────────────
    const hash = await hashPassword(ownerPassword);
    const { data: newUser, error: userErr } = await supabase
      .from("admin_users")
      .insert({
        username: ownerUsername,
        is_admin: true,
        is_super_admin: false,
        password_hash: hash,
        password_updated_at: new Date().toISOString(),
        must_change_password: false,
        email: ownerEmail,
        display_name: ownerDisplayName || null,
      })
      .select("id, username, is_admin, is_super_admin, email")
      .single();

    if (userErr || !newUser) {
      // Best-effort rollback of the org + location so the slug is released.
      await supabase.from("organizations").delete().eq("id", newOrg.id);
      return j({ ok: false, error: userErr?.message || "Could not create owner account." }, 500);
    }

    // ── Membership (owner) ───────────────────────────────────────────────
    const { error: memErr } = await supabase.from("org_memberships").insert({
      organization_id: newOrg.id,
      admin_user_id: newUser.id,
      role: "owner",
    });
    if (memErr) {
      await supabase.from("admin_users").delete().eq("id", newUser.id);
      await supabase.from("organizations").delete().eq("id", newOrg.id);
      return j({ ok: false, error: memErr.message }, 500);
    }

    // ── Location RBAC: give the new owner access to the default location.
    //    Required so LocationSwitcher / LocationProvider have at least one
    //    branch to pick. Best-effort — if the location insert failed above,
    //    we silently skip and the owner can provision manually later.
    if (defaultLocation?.id) {
      const { error: rbacErr } = await supabase.from("admin_user_locations").insert({
        admin_user_id: newUser.id,
        location_id: defaultLocation.id,
      });
      if (rbacErr) {
        console.warn("signup: admin_user_locations insert failed", rbacErr.message);
      }
    }

    // ── Trial subscription row ───────────────────────────────────────────
    const { error: subErr } = await supabase.from("subscriptions").insert({
      organization_id: newOrg.id,
      plan_id: starterPlan.id,
      provider: "internal",
      status: "trialing",
      interval: "month",
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndsAt,
      trial_ends_at: trialEndsAt,
    });
    if (subErr) {
      // Non-fatal — the billing page will surface a friendly banner, but we
      // still let the user in.
      console.warn("signup: subscription insert failed", subErr.message);
    }

    // ── Welcome + verification email (best-effort, never blocks signup)
    let verificationEmailDispatched = false;
    if (newUser.email) {
      try {
        const base = appBaseUrl();
        const token = await issueEmailToken({
          supabase,
          adminUserId: newUser.id,
          email: newUser.email,
          purpose: "verify_email",
          ttlMinutes: 60 * 24,
          requestedIp: req.headers.get("x-forwarded-for") || null,
          requestedUa: req.headers.get("user-agent") || null,
        });
        const verifyUrl = `${base}/account/verify-email?token=${encodeURIComponent(token.token)}`;
        const dashboardUrl = `${base}/onboarding`;
        const trialEndsDisplay = new Date(trialEndsAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        await sendEmail({
          kind: "signup_welcome",
          to: newUser.email,
          vars: {
            appBaseUrl: base,
            displayName: ownerDisplayName || ownerEmail.split("@")[0] || ownerUsername,
            organizationName,
            verifyUrl,
            dashboardUrl,
            trialEndsAt: trialEndsDisplay,
          },
          organizationId: newOrg.id,
          adminUserId: newUser.id,
          supabase,
        });
        verificationEmailDispatched = true;
      } catch (mailErr) {
        console.warn("signup: welcome email failed", (mailErr as Error).message);
      }
    }
    // ── Audit log ────────────────────────────────────────────────────────
    await supabase.from("audit_log").insert({
      actor_type: "admin_user",
      actor_id: newUser.id,
      actor_label: newUser.username,
      organization_id: newOrg.id,
      action: "organization.signup",
      target_type: "organization",
      target_id: newOrg.id,
      meta: {
        slug: newOrg.slug,
        timezone,
        email: ownerEmail || null,
        ip: req.headers.get("x-forwarded-for") || null,
      },
    });

    return j(
      {
        ok: true,
        verificationRequired: true,
        email: newUser.email,
        verificationEmailDispatched,
        organization: {
          id: newOrg.id,
          slug: newOrg.slug,
          isInternal: false,
          role: "owner",
          onboardingCompletedAt: null,
          trialEndsAt,
          status: "trialing",
        },
      },
      201,
    );
  } catch (err) {
    console.error("tenant signup error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
