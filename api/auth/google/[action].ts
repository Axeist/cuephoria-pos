/**
 * Catch-all dispatcher for /api/auth/google/* routes.
 *
 * Collapses the two Google OAuth endpoints (start, callback) behind a single
 * Vercel Serverless Function to stay under the Hobby-tier 12-function cap.
 */

import { j } from "../../../src/server/adminApiUtils";

import callback from "../../../src/server/handlers/auth/google/callback";
import start from "../../../src/server/handlers/auth/google/start";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "callback": callback,
  "start": start,
};

export default async function dispatcher(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const action = pathname.split("/").filter(Boolean).pop() ?? "";
  const handler = routes[action];
  if (!handler) {
    return j({ ok: false, error: `Unknown google auth action: ${action}` }, 404);
  }
  return handler(req);
}
