/**
 * Catch-all dispatcher for /api/razorpay/* routes (except /api/razorpay/webhook,
 * which stays as a standalone function because it ships a long handler with
 * subscription-webhook bookkeeping).
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * Razorpay checkout endpoints are collapsed behind one dynamic route. Each
 * concrete handler still lives in src/server/handlers/razorpay/; this file
 * only maps URL path → module.
 *
 *   GET  /api/razorpay/get-key-id        → handlers/razorpay/get-key-id (Edge)
 *   GET  /api/razorpay/test-credentials  → handlers/razorpay/test-credentials (Edge)
 *   POST /api/razorpay/create-order      → handlers/razorpay/create-order (Node)
 *   POST /api/razorpay/verify-payment    → handlers/razorpay/verify-payment (Node)
 *   *    /api/razorpay/callback          → handlers/razorpay/callback (Edge, HTML)
 *
 * The dispatcher runs in Node.js runtime so the Razorpay SDK (required by
 * create-order / verify-payment) loads correctly. Edge-style handlers are
 * called through the Node↔Edge adapter in `src/server/lib/node-dispatcher`.
 *
 * NOTE: Vercel resolves concrete files before dynamic segments, so the
 * existing `api/razorpay/webhook.ts` continues to serve `/api/razorpay/webhook`
 * without being intercepted here.
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
    case "callback": {
      const mod = await import("../../src/server/handlers/razorpay/callback.js")
        .catch(() => import("../../src/server/handlers/razorpay/callback"));
      return { kind: "edge", handler: mod.default as unknown as EdgeHandler };
    }
    case "create-order": {
      const mod = await import("../../src/server/handlers/razorpay/create-order.js")
        .catch(() => import("../../src/server/handlers/razorpay/create-order"));
      return { kind: "node", handler: mod.default as unknown as NodeHandler };
    }
    case "get-key-id": {
      const mod = await import("../../src/server/handlers/razorpay/get-key-id.js")
        .catch(() => import("../../src/server/handlers/razorpay/get-key-id"));
      return { kind: "edge", handler: mod.default as unknown as EdgeHandler };
    }
    case "test-credentials": {
      const mod = await import("../../src/server/handlers/razorpay/test-credentials.js")
        .catch(() => import("../../src/server/handlers/razorpay/test-credentials"));
      return { kind: "edge", handler: mod.default as unknown as EdgeHandler };
    }
    case "verify-payment": {
      const mod = await import("../../src/server/handlers/razorpay/verify-payment.js")
        .catch(() => import("../../src/server/handlers/razorpay/verify-payment"));
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
      return res.status(404).json({ ok: false, error: `Unknown razorpay action: ${action}` });
    }

    if (entry.kind === "node") {
      return await entry.handler(req, res);
    }
    return await callEdgeHandler(entry.handler, req, res);
  } catch (err) {
    console.error("[razorpay dispatcher] unhandled error:", err);
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
