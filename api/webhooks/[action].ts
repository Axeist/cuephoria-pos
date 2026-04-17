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

import availableStations from "../../src/server/handlers/webhooks/available-stations";
import checkAvailability from "../../src/server/handlers/webhooks/check-availability";
import elevenlabsBooking from "../../src/server/handlers/webhooks/elevenlabs-booking";
import getCustomer from "../../src/server/handlers/webhooks/get-customer";

// Razorpay SDK / Supabase client require Node.js runtime. Give the heavier
// handlers (elevenlabs-booking, check-availability) the same 30s timeout that
// the original per-file handlers had.
export const config = {
  maxDuration: 30,
};

type VercelRequest = {
  method?: string;
  url?: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  end: () => void;
  send?: (body: unknown) => void;
};

type NodeHandler = (req: VercelRequest, res: VercelResponse) => unknown;

const routes: Record<string, NodeHandler> = {
  "available-stations": availableStations as unknown as NodeHandler,
  "check-availability": checkAvailability as unknown as NodeHandler,
  "elevenlabs-booking": elevenlabsBooking as unknown as NodeHandler,
  "get-customer": getCustomer as unknown as NodeHandler,
};

function getAction(req: VercelRequest): string {
  // Prefer the dynamic segment Vercel already parsed for us
  const fromQuery = req.query?.action;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery;

  const url = req.url || "";
  const pathname = url.split("?")[0] || "";
  return pathname.split("/").filter(Boolean).pop() ?? "";
}

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  try {
    const action = getAction(req);
    const handler = routes[action];
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
