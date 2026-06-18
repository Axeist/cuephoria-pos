/**
 * Catch-all dispatcher for /api/webhooks/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * public webhook endpoints (called by ElevenLabs and the PublicBooking UI)
 * are collapsed behind one dynamic route. Each concrete handler still lives
 * in src/server/handlers/webhooks/; this file only maps URL path → module.
 *
 *   POST /api/webhooks/get-customer       → handlers/webhooks/get-customer
 *   POST /api/webhooks/check-availability → handlers/webhooks/check-availability
 *   POST /api/webhooks/elevenlabs-booking → handlers/webhooks/elevenlabs-booking
 *   GET  /api/webhooks/available-stations → handlers/webhooks/available-stations
 *
 * All four handlers are Node.js-runtime (req, res) style, so the dispatcher
 * just forwards the call after matching the last path segment.
 */

import {
  getAction,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher.js";

// Razorpay SDK / Supabase client require Node.js runtime. Give the heavier
// handlers (elevenlabs-booking, check-availability) the same 30s timeout that
// the original per-file handlers had.
export const config = {
  maxDuration: 30,
};

async function loadHandler(action: string): Promise<NodeHandler | null> {
  switch (action) {
    case "available-stations": {
      const mod = await import("../../src/server/handlers/webhooks/available-stations.js")
        .catch(() => import("../../src/server/handlers/webhooks/available-stations"));
      return mod.default as unknown as NodeHandler;
    }
    case "check-availability": {
      const mod = await import("../../src/server/handlers/webhooks/check-availability.js")
        .catch(() => import("../../src/server/handlers/webhooks/check-availability"));
      return mod.default as unknown as NodeHandler;
    }
    case "elevenlabs-booking": {
      const mod = await import("../../src/server/handlers/webhooks/elevenlabs-booking.js")
        .catch(() => import("../../src/server/handlers/webhooks/elevenlabs-booking"));
      return mod.default as unknown as NodeHandler;
    }
    case "get-customer": {
      const mod = await import("../../src/server/handlers/webhooks/get-customer.js")
        .catch(() => import("../../src/server/handlers/webhooks/get-customer"));
      return mod.default as unknown as NodeHandler;
    }
    default:
      return null;
  }
}

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  try {
    const action = getAction(req);
    const handler = await loadHandler(action);
    if (!handler) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(404).json({ ok: false, error: `Unknown webhook action: ${action}` });
    }
    return await handler(req, res);
  } catch (err) {
    // Last-resort JSON error — prevents Vercel's HTML "FUNCTION_INVOCATION_FAILED"
    // from reaching the client, which would make res.json() explode.
    console.error("[webhooks dispatcher] unhandled error:", err);
    try {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // response already committed — nothing else we can do
    }
  }
}
