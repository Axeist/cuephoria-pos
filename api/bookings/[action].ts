/**
 * Catch-all dispatcher for /api/bookings/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * booking endpoints are collapsed behind one dynamic route. Each concrete
 * handler still lives in src/server/handlers/bookings/; this file only maps
 * URL path → module.
 *
 *   POST /api/bookings/create         → handlers/bookings/create (Node runtime)
 *   POST /api/bookings/cleanup-blocks → handlers/bookings/cleanup-blocks (Edge style)
 *
 * The dispatcher runs in Node.js runtime (to support the Supabase client used
 * in `create.ts`); the Edge-style `cleanup-blocks` handler is called via the
 * Node↔Edge adapter in `src/server/lib/node-dispatcher`.
 */

import cleanupBlocks from "../../src/server/handlers/bookings/cleanup-blocks";
import create from "../../src/server/handlers/bookings/create";

import {
  callEdgeHandler,
  getAction,
  type EdgeHandler,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

const routes: Record<string, DispatchEntry> = {
  "create": { kind: "node", handler: create as unknown as NodeHandler },
  "cleanup-blocks": { kind: "edge", handler: cleanupBlocks as unknown as EdgeHandler },
};

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  const action = getAction(req);
  const entry = routes[action];
  if (!entry) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(404).json({ ok: false, error: `Unknown bookings action: ${action}` });
  }

  if (entry.kind === "node") {
    return entry.handler(req, res);
  }
  return callEdgeHandler(entry.handler, req, res);
}
