/**
 * POST /api/tenant/signup-google — complete signup using a Google identity.
 *
 * Flow:
 *   - User completed OAuth in /api/auth/google/callback, which set the
 *     cookie `cuetronix_oauth_ticket` (signed, 10-min TTL) carrying their
 *     verified Google profile.
 *   - The frontend at /signup/google collects workspace name + slug only,
 *     then POSTs here. We trust the cookie for email / sub / name; the
 *     client cannot forge it.
 *   - We create the workspace identical to /api/tenant/signup but without
 *     a password (Google is the auth method). `password_hash` is NULL and
 *     `google_sub` is set.
 *
 * On success we issue the admin session cookie and return 201, same shape
 * as the normal signup endpoint so the frontend can reuse the redirect path.
 */

import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  cookieSerialize,
  getEnv,
  j,
  parseCookies,
  signAdminSession,
} from "../../adminApiUtils";
import { verifyOauthState } from "../../googleOauth";
import { appBaseUrl, sendEmail } from "../../email";

export const config = { runtime: "edge" };

const TICKET_COOKIE = "cuetronix_oauth_ticket";
const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/i;
const TRIAL_DAYS = 14;

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function slugifyCandidate(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function usernameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "user").toLowerCase();
  return local.replace(/[^a-z0-9._-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "owner";
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const cookies = parseCookies(req.headers.get("cookie"));
  const ticketRaw = cookies[TICKET_COOKIE] || "";
  const ticket = ticketRaw ? await verifyOauthState(ticketRaw) : null;
  if (!ticket) {
    return j(
      {
        ok: false,
        error: "Your Google sign-in session expired. Please click 'Continue with Google' again.",
      },
      401,
    );
  }

  let identity: { sub: string; email: string; name?: string; picture?: string };
  try {
    identity = JSON.parse(ticket.next) as typeof identity;
  } catch {
    return j({ ok: false, error: "Malformed Google session." }, 400);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const organizationName = String(body.organizationName ?? "").trim();
  const requestedSlug = String(body.slug ?? body.organizationSlug ?? "").trim();
  const requestedUsername = String(body.username ?? "").trim();
  const timezone = String(body.timezone ?? "Asia/Kolkata").trim() || "Asia/Kolkata";
  const acceptedTerms = Boolean(body.acceptedTerms);

  if (organizationName.length < 2 || organizationName.length > 120) {
    return j({ ok: false, error: "Workspace name must be 2–120 characters." }, 400);
  }
  if (!acceptedTerms) {
    return j({ ok: false, error: "You must accept the Terms to continue." }, 400);
  }

  let slug = requestedSlug ? slugifyCandidate(requestedSlug) : slugifyCandidate(organizationName);
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

  let username = requestedUsername || usernameFromEmail(identity.email);
  if (!USERNAME_RE.test(username)) username = usernameFromEmail(identity.email);

  try {
    const supabase = createClient(
      getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || need("SUPABASE_URL"),
      need("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { "x-application-name": "cuetronix-signup-google" } },
      },
    );

    // Refuse if this email already has an account (force them back to login
    // where callback.ts will link the sub).
    const { data: existingEmail } = await supabase
      .from("admin_users")
      .select("id")
      .ilike("email", identity.email)
      .maybeSingle();
    if (existingEmail) {
      return j(
        {
          ok: false,
          error:
            "An account with this email already exists. Please log in — your Google account will link automatically.",
        },
        409,
      );
    }

    // Slug + username uniqueness.
    const [{ data: slugTaken }, { data: usernameTaken }] = await Promise.all([
      supabase.from("organizations").select("id").eq("slug", slug).maybeSingle(),
      supabase.from("admin_users").select("id").eq("username", username).maybeSingle(),
    ]);
    if (slugTaken) {
      return j(
        { ok: false, error: `The URL "${slug}" is already taken.`, field: "slug" },
        409,
      );
    }
    if (usernameTaken) {
      // Auto-suffix.
      username = `${username}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: starterPlan } = await supabase
      .from("plans")
      .select("id")
      .eq("code", "starter")
      .maybeSingle();

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

    const shortCodeSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data: defaultLocation } = await supabase
      .from("locations")
      .insert({
        organization_id: newOrg.id,
        name: "Main",
        slug: `${newOrg.slug}-main`.slice(0, 40),
        short_code: `${newOrg.slug.slice(0, 4).toUpperCase()}${shortCodeSuffix}`.slice(0, 10),
        is_active: true,
        sort_order: 0,
      })
      .select("id")
      .maybeSingle();

    const { data: newUser, error: userErr } = await supabase
      .from("admin_users")
      .insert({
        username,
        is_admin: true,
        is_super_admin: false,
        password_hash: null, // Google is the auth
        password: null,
        must_change_password: false,
        email: identity.email.toLowerCase(),
        email_verified_at: new Date().toISOString(),
        google_sub: identity.sub,
        display_name: identity.name || null,
        avatar_url: identity.picture || null,
      })
      .select("id, username, email")
      .single();
    if (userErr || !newUser) {
      await supabase.from("organizations").delete().eq("id", newOrg.id);
      return j({ ok: false, error: userErr?.message || "Could not create owner account." }, 500);
    }

    await supabase.from("org_memberships").insert({
      organization_id: newOrg.id,
      admin_user_id: newUser.id,
      role: "owner",
    });
    if (defaultLocation?.id) {
      await supabase.from("admin_user_locations").insert({
        admin_user_id: newUser.id,
        location_id: defaultLocation.id,
      });
    }
    if (starterPlan?.id) {
      await supabase.from("subscriptions").insert({
        organization_id: newOrg.id,
        plan_id: starterPlan.id,
        provider: "internal",
        status: "trialing",
        interval: "month",
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndsAt,
        trial_ends_at: trialEndsAt,
      });
    }

    await supabase.from("audit_log").insert({
      actor_type: "admin_user",
      actor_id: newUser.id,
      organization_id: newOrg.id,
      action: "organization.signup_google",
      target_type: "organization",
      target_id: newOrg.id,
      meta: { slug: newOrg.slug, email: identity.email },
    });

    // Send welcome email (email is already verified via Google — simple version).
    try {
      const base = appBaseUrl();
      await sendEmail({
        kind: "signup_welcome",
        to: identity.email,
        vars: {
          appBaseUrl: base,
          displayName: identity.name || username,
          organizationName,
          verifyUrl: `${base}/dashboard`,
          dashboardUrl: `${base}/onboarding`,
          trialEndsAt: new Date(trialEndsAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        },
        organizationId: newOrg.id,
        adminUserId: newUser.id,
        supabase,
      });
    } catch (mailErr) {
      console.warn("signup-google: welcome email failed", (mailErr as Error).message);
    }

    const maxAge = 8 * 60 * 60;
    const sessionToken = await signAdminSession(
      {
        id: newUser.id,
        username: newUser.username,
        isAdmin: true,
        isSuperAdmin: false,
        passwordVersion: 1,
      },
      maxAge,
    );

    const sessionCookie = cookieSerialize(ADMIN_SESSION_COOKIE, sessionToken, {
      maxAgeSeconds: maxAge,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
    });
    // Clear the ticket cookie.
    const clearTicket = cookieSerialize(TICKET_COOKIE, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
    });

    const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
    headers.append("set-cookie", sessionCookie);
    headers.append("set-cookie", clearTicket);
    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          isAdmin: true,
          isSuperAdmin: false,
          mustChangePassword: false,
        },
        organization: {
          id: newOrg.id,
          slug: newOrg.slug,
          isInternal: false,
          role: "owner",
          onboardingCompletedAt: null,
          trialEndsAt,
          status: "trialing",
        },
      }),
      { status: 201, headers },
    );
  } catch (err) {
    console.error("tenant signup-google error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
