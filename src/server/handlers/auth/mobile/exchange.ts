/**
 * POST /api/auth/mobile/exchange
 *
 * Android OAuth handoff: exchange a short-lived signed mobile ticket (from
 * Custom Tab) for session cookies in the main WebView.
 */

import {
  ADMIN_SESSION_COOKIE,
  cookieSerialize,
  j,
  jWithCookies,
} from "../../../adminApiUtils";
import { csrfCookieHeader } from "../../../lib/csrf";
import {
  parseMobileTicketData,
  verifyMobileTicket,
  type MobileTicketErrorData,
  type MobileTicketLoginData,
  type MobileTicketSignupData,
  type MobileTicketTotpData,
} from "../../../mobileAuthTicket";

export const config = { runtime: "edge" };

const OAUTH_TOTP_COOKIE = "cuetronix_oauth_totp";
const SIGNUP_TICKET_COOKIE = "cuetronix_oauth_ticket";
const SIGNUP_TICKET_TTL = 10 * 60;

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const body = (await req.json().catch(() => ({}))) as { mt?: string };
  const mt = typeof body.mt === "string" ? body.mt.trim() : "";
  if (!mt) return j({ ok: false, error: "Missing ticket." }, 400);

  const ticket = await verifyMobileTicket(mt);
  if (!ticket) return j({ ok: false, error: "Invalid or expired ticket." }, 401);

  const cookies: string[] = [];

  switch (ticket.kind) {
    case "error": {
      const data = parseMobileTicketData<MobileTicketErrorData>(ticket);
      if (!data?.code) return j({ ok: false, error: "Malformed ticket." }, 400);
      const params = new URLSearchParams({ oauth_error: data.code });
      if (data.email) params.set("email", data.email);
      return j({ ok: true, redirect: `/app/login?${params.toString()}` });
    }

    case "login_success": {
      const data = parseMobileTicketData<MobileTicketLoginData>(ticket);
      if (!data?.sessionToken || !data.csrfToken) {
        return j({ ok: false, error: "Malformed ticket." }, 400);
      }
      const maxAge = data.maxAge || 60 * 60 * 8;
      cookies.push(
        cookieSerialize(ADMIN_SESSION_COOKIE, data.sessionToken, {
          maxAgeSeconds: maxAge,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        }),
      );
      cookies.push(csrfCookieHeader(data.csrfToken, maxAge));
      return jWithCookies(
        { ok: true, redirect: data.redirect || "/dashboard" },
        200,
        cookies,
      );
    }

    case "oauth_totp": {
      const data = parseMobileTicketData<MobileTicketTotpData>(ticket);
      if (!data?.totpToken) return j({ ok: false, error: "Malformed ticket." }, 400);
      cookies.push(
        cookieSerialize(OAUTH_TOTP_COOKIE, data.totpToken, {
          maxAgeSeconds: 5 * 60,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        }),
      );
      return jWithCookies({ ok: true, redirect: "/app/login?oauth_totp=1" }, 200, cookies);
    }

    case "signup": {
      const data = parseMobileTicketData<MobileTicketSignupData>(ticket);
      if (!data?.signupTicket) return j({ ok: false, error: "Malformed ticket." }, 400);
      cookies.push(
        cookieSerialize(SIGNUP_TICKET_COOKIE, data.signupTicket, {
          maxAgeSeconds: SIGNUP_TICKET_TTL,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        }),
      );
      return jWithCookies({ ok: true, redirect: "/app/signup/google" }, 200, cookies);
    }

    default:
      return j({ ok: false, error: "Unknown ticket kind." }, 400);
  }
}
