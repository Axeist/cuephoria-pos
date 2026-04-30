/**
 * Catch-all dispatcher for /api/bookings/* routes.
 *
 * Each concrete handler lives in src/server/handlers/bookings/; this file
 * only maps URL path → module.
 *
 *   POST /api/bookings/create         → handlers/bookings/create (Node runtime)
 *   POST /api/bookings/cleanup-blocks → handlers/bookings/cleanup-blocks (Edge style)
 *   POST /api/bookings/materialize    → handlers/bookings/materialize (Node runtime)
 *
 * The dispatcher runs in Node.js runtime (to support the Supabase client used
 * in `create.ts`); the Edge-style `cleanup-blocks` handler is called via the
 * Node↔Edge adapter in `src/server/lib/node-dispatcher`.
 *
 * IMPORTANT: All handler imports are STATIC so Vercel's Node File Trace
 * actually bundles them. Dynamic `await import("...")` is NOT reliably
 * traced by Vercel's serverless build pipeline — modules can be missing
 * at runtime.
 */

import {
  callEdgeHandler,
  getAction,
  type EdgeHandler,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher.js";

import cleanupBlocksHandler from "../../src/server/handlers/bookings/cleanup-blocks";
import createHandler from "../../src/server/handlers/bookings/create";
import materializeHandler from "../../src/server/handlers/bookings/materialize";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

const ROUTES: Record<string, DispatchEntry> = {
  "cleanup-blocks": { kind: "edge", handler: cleanupBlocksHandler as unknown as EdgeHandler },
  create:           { kind: "node", handler: createHandler as unknown as NodeHandler },
  materialize:      { kind: "node", handler: materializeHandler as unknown as NodeHandler },
};

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  try {
    const action = getAction(req);
    const entry = ROUTES[action];
    if (!entry) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(404).json({ ok: false, error: `Unknown bookings action: ${action}` });
    }

    if (entry.kind === "node") {
      return await entry.handler(req, res);
    }
    return await callEdgeHandler(entry.handler, req, res);
  } catch (err) {
    console.error("[bookings dispatcher] unhandled error:", err);
    try {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // response already committed
    }
  }
}
