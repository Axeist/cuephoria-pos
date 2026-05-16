/**
 * Shared utilities for the `api/<group>/[action].ts` catch-all dispatchers.
 *
 * Vercel's dynamic route segment named `[action]` is injected into the request
 * URL as an `action` query parameter (e.g. a request to
 * `/api/platform/organization-action?action=suspend` arrives at the function
 * with the effective URL `?action=organization-action&action=suspend`).
 *
 * That collides with handlers that legitimately use their own `action` query
 * parameter — `searchParams.get("action")` returns the path-segment value and
 * the real one is shadowed. Strip the Vercel-injected occurrence here, in one
 * place, so downstream handlers can keep using `action` naturally.
 */
import { j } from "./adminApiUtils";

export type Handler = (req: Request) => Promise<Response> | Response;

export async function runDispatcher(
  req: Request,
  routes: Record<string, Handler>,
  unknownLabel: string,
): Promise<Response> {
  const url = new URL(req.url);
  const segment = url.pathname.split("/").filter(Boolean).pop() ?? "";

  const handler = routes[segment];
  if (!handler) {
    return j({ ok: false, error: `Unknown ${unknownLabel} action: ${segment}` }, 404);
  }

  const actionValues = url.searchParams.getAll("action");
  if (actionValues.length === 0 || !actionValues.includes(segment)) {
    return handler(req);
  }

  // Rebuild the `action` parameter list without the value matching the path
  // segment Vercel injected. If multiple injected copies somehow appear, drop
  // only one to preserve any legitimate user-supplied value.
  url.searchParams.delete("action");
  let stripped = false;
  for (const value of actionValues) {
    if (!stripped && value === segment) {
      stripped = true;
      continue;
    }
    url.searchParams.append("action", value);
  }

  return handler(new Request(url.toString(), req));
}
