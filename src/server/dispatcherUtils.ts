/**
 * Shared utility for the `api/<group>/[action].ts` catch-all dispatchers
 * (`platform`, `admin`, `tenant`, `auth/google`).
 *
 * Each dispatcher maps the final URL path segment to a concrete handler under
 * `src/server/handlers/<group>/`. We collapse all of these endpoints behind a
 * single Serverless Function to stay under Vercel's Hobby-tier 12-function cap.
 *
 * IMPORTANT — `action` is reserved.
 *
 * Vercel's dynamic route parameter is exposed to the function as a query
 * parameter with the same name as the segment. Because the segment here is
 * `[action]`, Vercel rewrites the request URL so that `?action=<segment>` is
 * always present, **overwriting any value the client supplied**. That means
 * handlers behind these dispatchers must NEVER read an `action` query
 * parameter — the client's value will not survive the routing layer. Pick a
 * different name (`op`, `actionPrefix`, etc.) when a handler needs its own
 * operation/filter param.
 */
import { j } from "./adminApiUtils";

export type Handler = (req: Request) => Promise<Response> | Response;

export async function runDispatcher(
  req: Request,
  routes: Record<string, Handler>,
  unknownLabel: string,
): Promise<Response> {
  const { pathname } = new URL(req.url);
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";

  const handler = routes[segment];
  if (!handler) {
    return j({ ok: false, error: `Unknown ${unknownLabel} action: ${segment}` }, 404);
  }

  return handler(req);
}
