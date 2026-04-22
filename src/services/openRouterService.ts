/**
 * OpenRouter client for the Cuephoria AI assistant.
 *
 * - Talks directly to https://openrouter.ai/api/v1/chat/completions
 * - Supports server-sent-event (SSE) streaming so the UI can render tokens
 *   as they arrive (dramatically better perceived latency than awaiting the
 *   full response)
 * - Lets callers pass an override API key (from user settings) or fall back
 *   to `VITE_OPENROUTER_API_KEY` from the build environment
 *
 * Token-optimisation principles used by the callers:
 * - We send a *compact* business snapshot (key:value pipe-delimited) instead
 *   of raw rows. Most questions can be answered from that single payload.
 * - A single `system` turn carries the instructions + snapshot, so the
 *   conversation history only has short user/assistant turns.
 * - Smaller default `max_tokens` (800) prevents runaway replies.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/**
 * The curated model catalogue the user can pick from. Kept intentionally
 * short — these are the sweet spots on price/quality/latency for a
 * business-analytics chat.
 */
export interface AIModelOption {
  id: string;
  label: string;
  provider: string;
  /** Short tagline shown in the picker to help users choose. */
  blurb: string;
  /** Approx input $/1M tokens — purely informational for the picker. */
  inputPer1M: number;
  /** Approx output $/1M tokens. */
  outputPer1M: number;
  /** Rough "speed" indicator: lower is faster. */
  speed: "fast" | "balanced" | "thorough";
  /** Rough "intelligence" tier. */
  tier: "light" | "standard" | "frontier";
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: "anthropic/claude-3.5-haiku",
    label: "Claude 3.5 Haiku",
    provider: "Anthropic",
    blurb: "Fast & cheap. Great default for quick business Q&A.",
    inputPer1M: 1.0,
    outputPer1M: 5.0,
    speed: "fast",
    tier: "light",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    blurb: "Balanced reasoning + numeric accuracy. Recommended for deeper analysis.",
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    speed: "balanced",
    tier: "standard",
  },
  {
    id: "anthropic/claude-3-opus",
    label: "Claude 3 Opus",
    provider: "Anthropic",
    blurb: "Most capable Claude. Best for nuanced forecasting + long reports.",
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    speed: "thorough",
    tier: "frontier",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "OpenAI",
    blurb: "Very fast and cheap OpenAI option.",
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    speed: "fast",
    tier: "light",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    blurb: "Strong generalist with good tabular reasoning.",
    inputPer1M: 2.5,
    outputPer1M: 10.0,
    speed: "balanced",
    tier: "standard",
  },
  {
    id: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    provider: "Google",
    blurb: "Blazing fast, cheap. Good for simple lookups.",
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    speed: "fast",
    tier: "light",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    blurb: "Strong reasoning, large context, competitive on price.",
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    speed: "balanced",
    tier: "standard",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "Meta",
    blurb: "Open-source, good price/quality for general chat.",
    inputPer1M: 0.6,
    outputPer1M: 0.6,
    speed: "balanced",
    tier: "standard",
  },
];

export const DEFAULT_MODEL_ID = "anthropic/claude-3.5-haiku";

export function getModelById(id: string): AIModelOption {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0];
}

/** Resolve the OpenRouter key in priority order: user-supplied > env. */
function resolveApiKey(override?: string | null): string | null {
  if (override && override.trim().length > 0) return override.trim();
  const envKey = (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined) ?? "";
  return envKey.trim().length > 0 ? envKey.trim() : null;
}

export interface StreamChatOptions {
  /** Full conversation turns (system + user/assistant). */
  messages: ChatTurn[];
  /** Model id from `AI_MODELS` (or any OpenRouter model id). */
  model?: string;
  /** User-supplied key override. Falls back to VITE_OPENROUTER_API_KEY. */
  apiKeyOverride?: string | null;
  /** Cap on reply length. Keep modest for cost control. */
  maxTokens?: number;
  temperature?: number;
  /** Called once for every streamed content delta. */
  onDelta?: (delta: string) => void;
  /** Abort signal so the UI can cancel in-flight replies. */
  signal?: AbortSignal;
}

export interface StreamChatResult {
  /** The final full assistant message (concatenation of all deltas). */
  content: string;
  /** Token usage if OpenRouter reports it in the final SSE frame. */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  /** The model OpenRouter actually served (may differ slightly). */
  modelUsed?: string;
}

/**
 * Stream a chat completion from OpenRouter. Returns the final assembled
 * content; while in flight, `onDelta` fires for every token fragment.
 *
 * Throws an Error with a user-facing message on any failure so callers can
 * display it directly.
 */
export async function streamChatCompletion(
  opts: StreamChatOptions,
): Promise<StreamChatResult> {
  const apiKey = resolveApiKey(opts.apiKeyOverride);
  if (!apiKey) {
    throw new Error(
      "No OpenRouter API key configured. Open settings and paste your key, or set VITE_OPENROUTER_API_KEY.",
    );
  }

  const model = opts.model ?? DEFAULT_MODEL_ID;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter uses these for attribution + rate limiting tiers.
      "HTTP-Referer":
        typeof window !== "undefined" ? window.location.origin : "https://cuephoria.app",
      "X-Title": "Cuephoria AI",
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 800,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    // Try to decode a structured error from OpenRouter for a better message.
    let detail = "";
    try {
      const txt = await res.text();
      try {
        const parsed = JSON.parse(txt);
        detail = parsed?.error?.message || parsed?.message || txt;
      } catch {
        detail = txt;
      }
    } catch {
      /* ignore */
    }
    throw new Error(
      `OpenRouter error ${res.status}: ${detail || res.statusText || "unknown"}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffered = "";
  let content = "";
  let usage: StreamChatResult["usage"] | undefined;
  let modelUsed: string | undefined;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });

      // SSE frames are separated by blank lines. Each event starts with
      // `data: ` followed by a JSON payload — or the literal string `[DONE]`.
      let idx: number;
      while ((idx = buffered.indexOf("\n")) !== -1) {
        const line = buffered.slice(0, idx).trim();
        buffered = buffered.slice(idx + 1);
        if (!line || !line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          if (json.model && !modelUsed) modelUsed = json.model;

          const choice = json.choices?.[0];
          const delta: string | undefined = choice?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            content += delta;
            opts.onDelta?.(delta);
          }

          if (json.usage) {
            usage = {
              prompt_tokens: json.usage.prompt_tokens,
              completion_tokens: json.usage.completion_tokens,
              total_tokens: json.usage.total_tokens,
            };
          }
        } catch {
          // Ignore malformed SSE frames — OpenRouter occasionally sends
          // keep-alive pings that aren't JSON.
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* no-op */
    }
  }

  return { content, usage, modelUsed };
}
