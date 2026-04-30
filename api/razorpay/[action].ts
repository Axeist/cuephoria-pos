/**
 * Catch-all dispatcher for /api/razorpay/* routes (except /api/razorpay/webhook,
 * which stays as a standalone function because it ships a long handler with
 * subscription-webhook bookkeeping).
 *
 * Each concrete handler lives in src/server/handlers/razorpay/; this file
 * only maps URL path → module.
 *
 *   GET  /api/razorpay/get-key-id        → handlers/razorpay/get-key-id (Edge)
 *   GET  /api/razorpay/test-credentials  → handlers/razorpay/test-credentials (Edge)
 *   POST /api/razorpay/create-order      → handlers/razorpay/create-order (Node)
 *   POST /api/razorpay/verify-payment    → handlers/razorpay/verify-payment (Node)
 *   *    /api/razorpay/callback          → handlers/razorpay/callback (Edge, HTML)
 *   GET/POST /api/razorpay/reconcile     → handlers/razorpay/reconcile (Node, cron)
 *
 * The dispatcher runs in Node.js runtime so the Razorpay SDK (required by
 * create-order / verify-payment / reconcile) loads correctly. Edge-style
 * handlers are called through the Node↔Edge adapter in
 * `src/server/lib/node-dispatcher`.
 *
 * IMPORTANT: All handler imports are STATIC so Vercel's Node File Trace
 * actually bundles them. Dynamic `await import("...")` is NOT reliably
 * traced by Vercel's serverless build pipeline — modules can be missing
 * at runtime.
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

import callbackHandler from "../../src/server/handlers/razorpay/callback.js";
import createOrderHandler from "../../src/server/handlers/razorpay/create-order.js";
import getKeyIdHandler from "../../src/server/handlers/razorpay/get-key-id.js";
import reconcileHandler from "../../src/server/handlers/razorpay/reconcile.js";
import testCredentialsHandler from "../../src/server/handlers/razorpay/test-credentials.js";
import verifyPaymentHandler from "../../src/server/handlers/razorpay/verify-payment.js";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

const ROUTES: Record<string, DispatchEntry> = {
  callback:           { kind: "edge", handler: callbackHandler as unknown as EdgeHandler },
  "create-order":     { kind: "node", handler: createOrderHandler as unknown as NodeHandler },
  "get-key-id":       { kind: "edge", handler: getKeyIdHandler as unknown as EdgeHandler },
  reconcile:          { kind: "node", handler: reconcileHandler as unknown as NodeHandler },
  "test-credentials": { kind: "edge", handler: testCredentialsHandler as unknown as EdgeHandler },
  "verify-payment":   { kind: "node", handler: verifyPaymentHandler as unknown as NodeHandler },
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
