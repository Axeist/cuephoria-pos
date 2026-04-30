/**
 * Catch-all dispatcher for /api/bookings/* routes that DON'T have a
 * concrete sibling file in this directory.
 *
 * Vercel resolves concrete files before dynamic segments, so:
 *
 *   /api/bookings/create → api/bookings/create.ts
 *
 * This dispatcher is responsible only for actions WITHOUT a concrete file:
 *
 *   POST /api/bookings/cleanup-blocks → handlers/bookings/cleanup-blocks (Edge style)
 *   POST /api/bookings/materialize    → handlers/bookings/materialize (Node runtime)
 *
 * IMPORTANT:
 *   1. All handler imports are STATIC so Vercel's Node File Trace bundles
 *      them. Dynamic `await import("...")` is NOT reliably traced.
 *   2. Relative imports must use `.js` extension because the deployment
 *      runs as Node ESM (`"type": "module"` in package.json).
 */

import {
  callEdgeHandler,
  getAction,
  type EdgeHandler,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher.js";

import cleanupBlocksHandler from "../../src/server/handlers/bookings/cleanup-blocks.js";
import materializeHandler from "../../src/server/handlers/bookings/materialize.js";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

const ROUTES: Record<string, DispatchEntry> = {
  "cleanup-blocks": { kind: "edge", handler: cleanupBlocksHandler as unknown as EdgeHandler },
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
