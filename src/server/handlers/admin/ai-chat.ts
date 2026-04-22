/**
 * Server-side AI chat proxy.
 *
 * Why this exists:
 * - Keeps the OpenRouter key on the server (`OPENROUTER_API_KEY`) instead of
 *   shipping it to every browser via `VITE_OPENROUTER_API_KEY`.
 * - Requires a valid admin session cookie before forwarding the request, so
 *   only signed-in staff can spend tokens against the shared key.
 * - Sanitises user input: clamps `max_tokens`, enforces an allow-list of
 *   models, and always requests `stream: true` so the client gets live
 *   SSE back (perceived latency stays low).
 *
 * Response passes through as-is (content-type `text/event-stream`). If
 * OpenRouter returns an error we forward its status + message as JSON so
 * the client can display something actionable.
 */
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";

export const config = { runtime: "edge" };

/**
 * Models callers are allowed to target through the shared key. Kept in sync
 * with `AI_MODELS` on the client (src/services/openRouterService.ts). If
 * the client sends anything else we fall back to the safe default so we
 * never accidentally route to an unexpectedly-expensive model.
 */
const ALLOWED_MODELS = new Set<string>([
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "google/gemini-2.0-flash-001",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3.3-70b-instruct",
]);

const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";
const MAX_TOKENS_CEILING = 4096;
const MAX_MESSAGES = 24; // safety net — client already caps at ~10 turns + system

interface ClientPayload {
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

function badRequest(msg: string) {
  return j({ ok: false, error: msg }, 400);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  // --- 1. Auth -------------------------------------------------------------
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) {
    return j({ ok: false, error: "Not authenticated" }, 401);
  }
  const session = await verifyAdminSession(token);
  if (!session) {
    return j({ ok: false, error: "Session expired" }, 401);
  }

  // --- 2. Config -----------------------------------------------------------
  const apiKey = getEnv("OPENROUTER_API_KEY");
  if (!apiKey) {
    return j(
      {
        ok: false,
        error:
          "Server is missing OPENROUTER_API_KEY. Add it in Vercel → Settings → Environment Variables (server-only, no VITE_ prefix).",
      },
      503,
    );
  }

  // --- 3. Parse & validate input ------------------------------------------
  let body: ClientPayload;
  try {
    body = (await req.json()) as ClientPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return badRequest("`messages` must be a non-empty array");
  if (messages.length > MAX_MESSAGES) {
    return badRequest(`Too many messages (max ${MAX_MESSAGES})`);
  }
  for (const m of messages) {
    if (
      !m ||
      typeof m !== "object" ||
      typeof m.content !== "string" ||
      (m.role !== "system" && m.role !== "user" && m.role !== "assistant")
    ) {
      return badRequest("Each message must be { role: system|user|assistant, content: string }");
    }
  }

  const requestedModel = typeof body.model === "string" ? body.model : DEFAULT_MODEL;
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

  const temperature =
    typeof body.temperature === "number" && body.temperature >= 0 && body.temperature <= 2
      ? body.temperature
      : 0.3;

  const maxTokens =
    typeof body.maxTokens === "number" && body.maxTokens >= 64
      ? Math.min(body.maxTokens, MAX_TOKENS_CEILING)
      : 800;

  // --- 4. Upstream request -------------------------------------------------
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": new URL(req.url).origin,
      "X-Title": "Cuephoria AI",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      // Ensure OpenRouter emits a final chunk with `usage` populated so the
      // client can track token + cost per request.
      stream_options: { include_usage: true },
      temperature,
      max_tokens: maxTokens,
      // Attribute spend to the logged-in user for OpenRouter's usage dashboard.
      user: `cuephoria:${session.username}`,
    }),
  });

  // Non-2xx: buffer the error body so the client sees something useful.
  if (!upstream.ok || !upstream.body) {
    let detail = upstream.statusText || "upstream error";
    try {
      const text = await upstream.text();
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
        detail = parsed?.error?.message ?? parsed?.message ?? text;
      } catch {
        detail = text;
      }
    } catch {
      /* ignore */
    }
    return j(
      { ok: false, error: `OpenRouter ${upstream.status}: ${detail}` },
      upstream.status || 502,
    );
  }

  // --- 5. Stream the SSE body straight through -----------------------------
  // We intentionally don't re-parse or transform: the client's
  // `streamChatCompletion` already knows how to read OpenRouter SSE frames.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Disable Vercel's edge buffering so tokens reach the browser as
      // OpenRouter emits them.
      "x-accel-buffering": "no",
    },
  });
}
