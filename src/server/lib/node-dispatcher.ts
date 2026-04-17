/**
 * Small runtime adapter for the Node.js serverless dispatchers that sit in
 * front of mixed Node-style and Edge-style handlers.
 *
 * Why this exists: after the "consolidate api/ into catch-all dispatchers"
 * refactor, several route families (bookings/, razorpay/, …) contain a mix of:
 *   - Node-style handlers:  (req, res) => void        (uses res.status/.json)
 *   - Edge-style handlers:  (req: Request) => Response (uses global Request/Response)
 *
 * The dispatchers run in Node.js runtime (so they can host Razorpay SDK and
 * Supabase clients), so we need a helper that can call an Edge-style handler
 * from inside a Node-style dispatcher and pipe the Response back to `res`.
 *
 * Relies on the global `Request`/`Response` objects that Node 18+ exposes via
 * Undici, which matches the runtime Vercel already ships for /api functions.
 */

export type VercelRequest = {
  method?: string;
  url?: string;
  body?: unknown;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string | string[] | undefined>;
};

export type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  send?: (body: unknown) => void;
  end: (body?: unknown) => void;
};

export type NodeHandler = (req: VercelRequest, res: VercelResponse) => unknown;
export type EdgeHandler = (req: Request) => Promise<Response> | Response;

/** Pull the dynamic `[action]` segment out of the request. */
export function getAction(req: VercelRequest): string {
  const fromQuery = req.query?.action;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery;
  if (Array.isArray(fromQuery) && fromQuery.length > 0) return fromQuery[fromQuery.length - 1];

  const url = req.url || "";
  const pathname = url.split("?")[0] || "";
  return pathname.split("/").filter(Boolean).pop() ?? "";
}

/** Build a whatwg `Request` object that mirrors the incoming Node request. */
function toFetchRequest(req: VercelRequest): Request {
  const method = (req.method || "GET").toUpperCase();

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) headers.append(k, String(item));
    } else {
      headers.set(k, String(v));
    }
  }

  const host = (req.headers?.host as string) || "localhost";
  const proto =
    (req.headers?.["x-forwarded-proto"] as string) ||
    (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}${req.url || "/"}`;

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD" && req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      body = req.body;
    } else if (req.body instanceof Uint8Array) {
      body = req.body as unknown as BodyInit;
    } else {
      body = JSON.stringify(req.body);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
  }

  return new Request(url, { method, headers, body });
}

/** Pipe a whatwg `Response` back through the Node `res` object. */
async function pipeFetchResponse(fetchRes: Response, res: VercelResponse): Promise<void> {
  res.status(fetchRes.status);
  fetchRes.headers.forEach((value, key) => {
    // `content-length` will be recalculated by the runtime; skip to avoid mismatch.
    if (key.toLowerCase() === "content-length") return;
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await fetchRes.arrayBuffer());
  if (typeof res.send === "function") {
    res.send(buffer);
  } else {
    res.end(buffer);
  }
}

/** Call an Edge-style handler from inside a Node-style dispatcher. */
export async function callEdgeHandler(
  handler: EdgeHandler,
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const fetchReq = toFetchRequest(req);
  const fetchRes = await handler(fetchReq);
  await pipeFetchResponse(fetchRes, res);
}
