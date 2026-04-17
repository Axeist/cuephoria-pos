/**
 * GET /api/auth/google/start?intent=login|signup&next=/dashboard
 *
 * Redirects the browser to Google's OAuth consent screen, using a signed
 * state cookie to protect against CSRF / replay. On return to
 * /api/auth/google/callback we verify the cookie matches the state param.
 *
 * Scopes: openid + email + profile. That gives us `sub`, `email`,
 *         `email_verified`, `name`, `picture`.
 *
 * Env required:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_REDIRECT_URI   (must match console setting exactly)
 *   ADMIN_SESSION_SECRET        (reused to sign the state cookie)
 */

import {
  cookieSerialize,
  getEnv,
  j,
} from "../../../adminApiUtils";
import { signOauthState } from "../../../googleOauth";

export const config = { runtime: "edge" };

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_COOKIE = "cuetronix_oauth_state";
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const clientId = getEnv("GOOGLE_OAUTH_CLIENT_ID");
  const redirectUri = getEnv("GOOGLE_OAUTH_REDIRECT_URI");
  if (!clientId || !redirectUri) {
    return j(
      {
        ok: false,
        error:
          "Google sign-in isn't configured yet. Ask the workspace owner to set GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_REDIRECT_URI.",
      },
      503,
    );
  }

  const url = new URL(req.url);
  const intent = (url.searchParams.get("intent") || "login").toLowerCase();
  const next = url.searchParams.get("next") || "";
  const safeIntent = intent === "signup" ? "signup" : "login";

  // Generate a random nonce + CSRF token, embed intent + next, sign it.
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  let nonce = "";
  for (let i = 0; i < nonceBytes.length; i++) nonce += nonceBytes[i].toString(16).padStart(2, "0");

  const state = await signOauthState({
    nonce,
    intent: safeIntent,
    next,
    iat: Math.floor(Date.now() / 1000),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
    include_granted_scopes: "true",
  });

  const headers = new Headers({
    location: `${GOOGLE_AUTH_URL}?${params.toString()}`,
  });
  headers.append(
    "set-cookie",
    cookieSerialize(STATE_COOKIE, state, {
      maxAgeSeconds: STATE_TTL_SECONDS,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    }),
  );

  return new Response(null, { status: 302, headers });
}
