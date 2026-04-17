/**
 * Catch-all dispatcher for /api/cafe/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * cafe-session endpoints are collapsed behind one dynamic route. Each concrete
 * handler still lives in its own module under src/server/handlers/cafe/;
 * this file only maps URL path → module.
 *
 *   POST /api/cafe/login   → handlers/cafe/login
 *   POST /api/cafe/logout  → handlers/cafe/logout
 *   GET  /api/cafe/me      → handlers/cafe/me
 */

import { j } from "../../src/server/cafeApiUtils";

import login from "../../src/server/handlers/cafe/login";
import logout from "../../src/server/handlers/cafe/logout";
import me from "../../src/server/handlers/cafe/me";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "login": login,
  "logout": logout,
  "me": me,
};

export default async function dispatcher(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const action = pathname.split("/").filter(Boolean).pop() ?? "";
  const handler = routes[action];
  if (!handler) {
    return j({ ok: false, error: `Unknown cafe action: ${action}` }, 404);
  }
  return handler(req);
}
