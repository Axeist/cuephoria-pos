/**
 * GET /api/auth/google/callback
 *
 * Google redirects here after consent with `?code=...&state=...`. We:
 *   1. Verify the signed state cookie matches the state param (CSRF).
 *   2. Exchange the code for an id_token and verify it against Google's JWKs.
 *   3. Find-or-create an admin_user row:
 *        a) Match by google_sub                    → login.
 *        b) Else match by lower(email) with       → link google_sub, login.
 *           email_verified_at NOT NULL (or any,    (existing account links)
 *           depending on intent).
 *        c) Else if intent=signup → redirect to
 *           /signup/google?g=<signed-ticket> so
 *           the user can pick a workspace.
 *        d) Else redirect back to /login with an
 *           informational error.
 *   4. On login success, issue the admin session cookie and redirect to
 *      /dashboard (or /onboarding when appropriate).
 */

import {
  ADMIN_SESSION_COOKIE,
  cookieSerialize,
  parseCookies,
  signAdminSession,
} from "../../../adminApiUtils";
import {
  exchangeCode,
  signOauthState,
  verifyIdToken,
  verifyOauthState,
  type GoogleIdentity,
} from "../../../googleOauth";
import { supabaseServiceClient } from "../../../supabaseServer";

export const config = { runtime: "edge" };

const STATE_COOKIE = "cuetronix_oauth_state";
const SIGNUP_TICKET_TTL = 10 * 60; // seconds

/**
 * OAuth redirects must return the user to the same host they started from.
 * (A global APP_BASE_URL like https://cuetronix.com would otherwise strand
 * users who signed in on cuetronix.app or a preview URL.)
 */
function baseUrl(req: Request): string {
  const u = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = (forwardedProto || u.protocol.replace(":", "")).split(",")[0].trim();
    return `${proto}://${host}`;
  }
  return `${u.protocol}//${u.host}`;
}

function redirect(location: string, extraCookies: string[] = []): Response {
  const headers = new Headers({ location });
  for (const c of extraCookies) headers.append("set-cookie", c);
  return new Response(null, { status: 302, headers });
}

function clearStateCookie(): string {
  return cookieSerialize(STATE_COOKIE, "", {
    maxAgeSeconds: 0,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const base = baseUrl(req);

  if (errorParam) {
    return redirect(`${base}/login?oauth_error=${encodeURIComponent(errorParam)}`, [
      clearStateCookie(),
    ]);
  }

  const cookies = parseCookies(req.headers.get("cookie"));
  const stateCookie = cookies[STATE_COOKIE] || "";

  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    return redirect(`${base}/login?oauth_error=invalid_state`, [clearStateCookie()]);
  }

  const state = await verifyOauthState(stateParam);
  if (!state) {
    return redirect(`${base}/login?oauth_error=expired_state`, [clearStateCookie()]);
  }

  let identity: GoogleIdentity;
  try {
    const tokens = await exchangeCode(code);
    identity = await verifyIdToken(tokens.id_token);
  } catch (err) {
    console.warn("[oauth] verify failed:", (err as Error).message);
    return redirect(
      `${base}/login?oauth_error=${encodeURIComponent((err as Error).message)}`,
      [clearStateCookie()],
    );
  }

  const supabase = supabaseServiceClient("cuetronix-google-callback");

  // 1) Try by google_sub.
  const { data: bySub } = await supabase
    .from("admin_users")
    .select("id, username, is_admin, is_super_admin, password_version, email, email_verified_at")
    .eq("google_sub", identity.sub)
    .maybeSingle();

  let user = bySub;

  // 2) Try by email (link this Google identity to the existing row).
  if (!user && identity.email) {
    const { data: byEmail } = await supabase
      .from("admin_users")
      .select("id, username, is_admin, is_super_admin, password_version, email, email_verified_at, google_sub")
      .ilike("email", identity.email)
      .maybeSingle();

    if (byEmail) {
      if (byEmail.google_sub && byEmail.google_sub !== identity.sub) {
        // Different Google identity already linked — refuse silently.
        return redirect(`${base}/login?oauth_error=account_conflict`, [clearStateCookie()]);
      }
      await supabase
        .from("admin_users")
        .update({
          google_sub: identity.sub,
          email_verified_at: byEmail.email_verified_at ?? new Date().toISOString(),
          display_name: byEmail["display_name" as keyof typeof byEmail] ?? identity.name ?? null,
        })
        .eq("id", byEmail.id);
      user = byEmail;
    }
  }

  // 3) Still no user.
  if (!user) {
    if (state.intent !== "signup") {
      // Login intent but no matching account.
      return redirect(
        `${base}/login?oauth_error=no_account&email=${encodeURIComponent(identity.email)}`,
        [clearStateCookie()],
      );
    }
    // Signup intent — issue a short-lived signed ticket carrying the Google
    // identity and hand off to /signup/google for workspace selection.
    const ticket = await signOauthState({
      nonce: `signup:${identity.sub}`,
      intent: "signup",
      next: JSON.stringify({
        sub: identity.sub,
        email: identity.email,
        name: identity.name || "",
        picture: identity.picture || "",
      }),
      iat: Math.floor(Date.now() / 1000),
    });
    const ticketCookie = cookieSerialize("cuetronix_oauth_ticket", ticket, {
      maxAgeSeconds: SIGNUP_TICKET_TTL,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
    return redirect(`${base}/signup/google`, [clearStateCookie(), ticketCookie]);
  }

  // 4) Existing user → issue session cookie.
  const { data: memberships, error: membershipsErr } = await supabase
    .from("org_memberships")
    .select("organization_id")
    .eq("admin_user_id", user.id)
    .limit(1);
  if (membershipsErr) {
    console.warn("[oauth] membership check failed:", membershipsErr.message);
    return redirect(`${base}/login?oauth_error=workspace_check_failed`, [clearStateCookie()]);
  }
  if (!memberships || memberships.length === 0) {
    return redirect(`${base}/login?oauth_error=no_workspace`, [clearStateCookie()]);
  }

  // 5) Existing user with active workspace → issue session cookie.
  const maxAge = 60 * 60 * 8; // 8h, same as normal login
  const token = await signAdminSession(
    {
      id: user.id,
      username: user.username,
      isAdmin: !!user.is_admin,
      isSuperAdmin: !!user.is_super_admin,
      passwordVersion: typeof user.password_version === "number" ? user.password_version : 1,
    },
    maxAge,
  );
  const sessionCookie = cookieSerialize(ADMIN_SESSION_COOKIE, token, {
    maxAgeSeconds: maxAge,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: user.id,
    action: "admin_user.google_login",
    meta: { email: identity.email },
  });

  // Prefer the `next` from state if it looks like a safe path.
  const next = typeof state.next === "string" && state.next.startsWith("/") ? state.next : "/dashboard";
  return redirect(`${base}${next}`, [clearStateCookie(), sessionCookie]);
}
