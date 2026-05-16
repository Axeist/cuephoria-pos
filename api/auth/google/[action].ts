/**
 * Catch-all dispatcher for /api/auth/google/* routes.
 *
 * Collapses the two Google OAuth endpoints (start, callback) behind a single
 * Vercel Serverless Function to stay under the Hobby-tier 12-function cap.
 */

import { runDispatcher } from "../../../src/server/dispatcherUtils";

import callback from "../../../src/server/handlers/auth/google/callback";
import start from "../../../src/server/handlers/auth/google/start";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "callback": callback,
  "start": start,
};

export default async function dispatcher(req: Request): Promise<Response> {
  return runDispatcher(req, routes, "google auth");
}
