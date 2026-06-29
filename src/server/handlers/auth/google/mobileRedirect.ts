/**
 * Android OAuth callback helpers — redirect to /auth/app-complete with signed ticket.
 */

import { cookieSerialize } from "../../../adminApiUtils";
import {
  signMobileTicket,
  type MobileTicketErrorData,
  type MobileTicketLoginData,
  type MobileTicketSignupData,
  type MobileTicketTotpData,
} from "../../../mobileAuthTicket";
import type { OauthStatePayload } from "../../../googleOauth";

const STATE_COOKIE = "cuetronix_oauth_state";

export function isAndroidOauth(state: OauthStatePayload): boolean {
  return state.platform === "android";
}

export function androidLoginPath(): string {
  return "/app/login";
}

export function androidSignupPath(): string {
  return "/app/signup/google";
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

function mobileRedirect(base: string, mt: string): Response {
  const headers = new Headers({
    location: `${base}/auth/app-complete?mt=${encodeURIComponent(mt)}&handoff=1`,
  });
  headers.append("set-cookie", clearStateCookie());
  return new Response(null, { status: 302, headers });
}

export async function redirectMobileError(
  base: string,
  code: string,
  email?: string,
): Promise<Response> {
  const data: MobileTicketErrorData = { code, email };
  const mt = await signMobileTicket("error", data);
  return mobileRedirect(base, mt);
}

export async function redirectMobileLoginSuccess(
  base: string,
  sessionToken: string,
  csrfToken: string,
  maxAge: number,
  redirect: string,
): Promise<Response> {
  const data: MobileTicketLoginData = { sessionToken, csrfToken, maxAge, redirect };
  const mt = await signMobileTicket("login_success", data);
  return mobileRedirect(base, mt);
}

export async function redirectMobileTotp(base: string, totpToken: string): Promise<Response> {
  const data: MobileTicketTotpData = { totpToken };
  const mt = await signMobileTicket("oauth_totp", data);
  return mobileRedirect(base, mt);
}

export async function redirectMobileSignup(base: string, signupTicket: string): Promise<Response> {
  const data: MobileTicketSignupData = { signupTicket };
  const mt = await signMobileTicket("signup", data);
  return mobileRedirect(base, mt);
}
