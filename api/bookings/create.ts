/**
 * POST /api/bookings/create
 *
 * Thin entry — handler logic lives in src/server/handlers/bookings/create.ts.
 * Dynamic import keeps the heavy dependency graph out of cold-start for other
 * /api/bookings/* routes and surfaces load errors as JSON.
 */

export const config = {
  maxDuration: 30,
};

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  end: () => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { default: createHandler } = await import("../../src/server/handlers/bookings/create.js");
    return await createHandler(req, res);
  } catch (error: unknown) {
    console.error("[api/bookings/create] handler load failed:", error);
    return res.status(500).json({
      ok: false,
      error: "Booking service unavailable",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
