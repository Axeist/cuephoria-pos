/**
 * Catch-all dispatcher for /api/razorpay/* routes that DON'T have a
 * concrete sibling file in this directory.
 *
 * Vercel resolves concrete files before dynamic segments, so the existing
 * concrete handlers continue to serve their own routes:
 *
 *   /api/razorpay/callback        → api/razorpay/callback.ts
 *   /api/razorpay/create-order    → api/razorpay/create-order.ts
 *   /api/razorpay/get-key-id      → api/razorpay/get-key-id.ts
 *   /api/razorpay/verify-payment  → api/razorpay/verify-payment.ts
 *   /api/razorpay/webhook         → api/razorpay/webhook.ts
 *
 * This dispatcher is responsible only for actions WITHOUT a concrete file:
 *
 *   GET      /api/razorpay/test-credentials  → handlers/razorpay/test-credentials (Edge)
 *   GET/POST /api/razorpay/reconcile         → handlers/razorpay/reconcile (Node, cron)
 *
 * IMPORTANT:
 *   1. All handler imports are STATIC so Vercel's Node File Trace bundles
 *      them. Dynamic `await import("...")` is NOT reliably traced.
 *   2. Relative imports must use `.js` extension because the deployment
 *      runs as Node ESM (`"type": "module"` in package.json).
 *   3. We do NOT import handlers that have a concrete sibling file
 *      (e.g. create-order, verify-payment). Those modules are duplicate
 *      stale copies under src/server/handlers/razorpay/ that are not
 *      maintained and import broken relative paths; loading them here
 *      would crash the dispatcher at module-init time.
 */

import {
  callEdgeHandler,
  getAction,
  type EdgeHandler,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher.js";

import reconcileHandler from "../../src/server/handlers/razorpay/reconcile.js";
import testCredentialsHandler from "../../src/server/handlers/razorpay/test-credentials.js";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

const ROUTES: Record<string, DispatchEntry> = {
  reconcile:          { kind: "node", handler: reconcileHandler as unknown as NodeHandler },
  "test-credentials": { kind: "edge", handler: testCredentialsHandler as unknown as EdgeHandler },
};

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  try {
    const action = getAction(req);
    const entry = ROUTES[action];
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
