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

import callback from "../../src/server/handlers/razorpay/callback";
import createOrder from "../../src/server/handlers/razorpay/create-order";
import getKeyId from "../../src/server/handlers/razorpay/get-key-id";
import testCredentials from "../../src/server/handlers/razorpay/test-credentials";
import verifyPayment from "../../src/server/handlers/razorpay/verify-payment";

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
  "callback": { kind: "edge", handler: callback as unknown as EdgeHandler },
  "create-order": { kind: "node", handler: createOrder as unknown as NodeHandler },
  "get-key-id": { kind: "edge", handler: getKeyId as unknown as EdgeHandler },
  "test-credentials": { kind: "edge", handler: testCredentials as unknown as EdgeHandler },
  "verify-payment": { kind: "node", handler: verifyPayment as unknown as NodeHandler },
};

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  const action = getAction(req);
  const entry = routes[action];
  if (!entry) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(404).json({ ok: false, error: `Unknown razorpay action: ${action}` });
  }

  if (entry.kind === "node") {
    return entry.handler(req, res);
  }
  return callEdgeHandler(entry.handler, req, res);
}
