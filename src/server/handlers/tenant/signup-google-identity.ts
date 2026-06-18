/**
 * GET /api/tenant/signup-google-identity
 *
 * Reveals the identity payload inside the short-lived `cuetronix_oauth_ticket`
 * cookie so the /signup/google page can pre-fill workspace name + slug
 * suggestions from the user's Google profile — without ever putting the
 * email address into a query string.
 */

import { j, parseCookies } from "../../adminApiUtils";
import { verifyOauthState } from "../../googleOauth";

export const config = { runtime: "edge" };

const TICKET_COOKIE = "cuetronix_oauth_ticket";

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const cookies = parseCookies(req.headers.get("cookie"));
  const raw = cookies[TICKET_COOKIE] || "";
  if (!raw) return j({ ok: false, error: "No Google sign-in session." }, 401);

  const state = await verifyOauthState(raw);
  if (!state) return j({ ok: false, error: "Session expired." }, 401);

  try {
    const identity = JSON.parse(state.next) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };
    return j(
      {
        ok: true,
        identity: {
          email: identity.email,
          name: identity.name || null,
          picture: identity.picture || null,
        },
      },
      200,
    );
  } catch {
    return j({ ok: false, error: "Malformed session." }, 400);
  }
}
