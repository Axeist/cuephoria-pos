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
 *   POST /api/bookings/materialize    → handlers/bookings/materialize (Node runtime)
 *
 * The dispatcher runs in Node.js runtime (to support the Supabase client used
 * in `create.ts`); the Edge-style `cleanup-blocks` handler is called via the
 * Node↔Edge adapter in `src/server/lib/node-dispatcher`.
 */

import {
  callEdgeHandler,
  getAction,
  type EdgeHandler,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher.js";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

async function loadEntry(action: string): Promise<DispatchEntry | null> {
  switch (action) {
    case "create": {
      const mod = await import("../../src/server/handlers/bookings/create.js")
        .catch(() => import("../../src/server/handlers/bookings/create"));
      return { kind: "node", handler: mod.default as unknown as NodeHandler };
    }
    case "cleanup-blocks": {
      const mod = await import("../../src/server/handlers/bookings/cleanup-blocks.js")
        .catch(() => import("../../src/server/handlers/bookings/cleanup-blocks"));
      return { kind: "edge", handler: mod.default as unknown as EdgeHandler };
    }
    case "materialize": {
      const mod = await import("../../src/server/handlers/bookings/materialize.js")
        .catch(() => import("../../src/server/handlers/bookings/materialize"));
      return { kind: "node", handler: mod.default as unknown as NodeHandler };
    }
    default:
      return null;
  }
}

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  try {
    const action = getAction(req);
    const entry = await loadEntry(action);
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
