/**
 * Cuephoria AI — the in-app business assistant.
 *
 * Talks to OpenRouter (any model the user picks: Haiku, Sonnet, Opus, GPT,
 * Gemini, Llama, …) and feeds it a compact Supabase-backed snapshot of the
 * whole business. Token usage is minimised by:
 *  - a single small system turn carrying the snapshot
 *  - short conversational turns on top of that system turn
 *  - a modest default `max_tokens` cap
 *
 * The page supports a "standalone" layout (for the pop-out window) and a
 * regular in-shell layout, driven by the `standalone` prop.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowUp,
  BarChart3,
  Bot,
  Calendar,
  Check,
  Copy,
  DatabaseZap,
  DollarSign,
  ExternalLink,
  Package,
  RefreshCw,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ModelPicker } from "@/components/ai/ModelPicker";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { MessageContent } from "@/components/ai/MessageContent";
import { useAISettings } from "@/services/aiSettings";
import {
  getModelById,
  streamChatCompletion,
  type ChatTurn,
} from "@/services/openRouterService";
import {
  fetchBusinessSnapshot,
  type BusinessSnapshot,
} from "@/services/chatDataService";
import { useAuth } from "@/context/AuthContext";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
  error?: boolean;
}

interface SuggestionCard {
  title: string;
  prompt: string;
  icon: React.ReactNode;
  tint: string;
}

const SUGGESTIONS: SuggestionCard[] = [
  {
    title: "Today's snapshot",
    prompt:
      "Give me today's performance snapshot — total revenue, sales count, payment-mix, and how it compares with the 7-day average.",
    icon: <TrendingUp className="h-4 w-4" />,
    tint: "from-emerald-500 to-green-600",
  },
  {
    title: "Peak hour",
    prompt:
      "Which hour today has generated the most revenue so far? Show the top three hours with their revenue.",
    icon: <BarChart3 className="h-4 w-4" />,
    tint: "from-violet-500 to-purple-600",
  },
  {
    title: "Upcoming bookings",
    prompt:
      "What bookings are coming up next? Include the date, time and status for the next few.",
    icon: <Calendar className="h-4 w-4" />,
    tint: "from-indigo-500 to-blue-600",
  },
  {
    title: "Top customers",
    prompt:
      "Who are my top spending customers right now, and how many new customers did I get this week?",
    icon: <Users className="h-4 w-4" />,
    tint: "from-cyan-500 to-blue-600",
  },
  {
    title: "Inventory alerts",
    prompt:
      "Which products are low on stock or completely out? Suggest what to reorder first.",
    icon: <Package className="h-4 w-4" />,
    tint: "from-rose-500 to-red-600",
  },
  {
    title: "Revenue vs. expenses",
    prompt:
      "Give me a 30-day summary of revenue vs. expenses (by category) and estimate my net position.",
    icon: <DollarSign className="h-4 w-4" />,
    tint: "from-amber-500 to-orange-600",
  },
];

/**
 * Builds the system prompt. Rules focus on token-accuracy over style so
 * numbers don't get approximated away. The snapshot follows it as a clearly
 * delimited "DATA" block.
 */
function buildSystemPrompt(snapshot: BusinessSnapshot, custom: string, userName: string | null): string {
  const headline = `You are Cuephoria AI — an operational assistant for a gaming-cafe and arcade POS. You answer questions about the business using the DATA block below.`;

  const rules = [
    "Respond in crisp, skimmable Markdown. Use headings and bullets when helpful.",
    "All currency is INR — always prefix numbers with ₹ and use Indian comma grouping.",
    "Use only numbers present in the DATA block. Do not invent or extrapolate beyond it.",
    "When asked about 'today', use the section labelled `# TODAY`.",
    "When asked about trends, compare TODAY to `WEEK.avg_daily` and `by_weekday_avg`.",
    "If the data genuinely does not answer the question, say so briefly and suggest the nearest thing we DO have.",
    "Be concise by default (≤ 6 short lines). Offer to expand if they want a deeper dive.",
  ];

  return [
    headline,
    userName ? `The staff member asking is @${userName}. Address them by name when natural.` : "",
    "",
    "# Rules",
    ...rules.map((r) => `- ${r}`),
    custom ? `\n# Operator extras\n${custom}` : "",
    "",
    "# DATA",
    snapshot.text,
  ]
    .filter(Boolean)
    .join("\n");
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface ChatAIProps {
  /** If true, the page renders without hosting the app shell's padding. */
  standalone?: boolean;
}

const ChatAI: React.FC<ChatAIProps> = ({ standalone: standaloneProp }) => {
  const { user } = useAuth();
  const { settings, update: updateSettings } = useAISettings();
  const [searchParams] = useSearchParams();

  // Standalone mode can be driven by prop OR `?focus=1` query (so
  // window.open to the same route with that param works transparently).
  const standalone = standaloneProp ?? searchParams.get("focus") === "1";

  const [snapshot, setSnapshot] = useState<BusinessSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSnapshot = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const snap = await fetchBusinessSnapshot();
      setSnapshot(snap);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load business data.";
      setSnapshotError(msg);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  // Load on mount + refresh every 3 minutes in the background so long chat
  // sessions don't go stale.
  useEffect(() => {
    loadSnapshot();
    const id = window.setInterval(() => loadSnapshot({ silent: true }), 3 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loadSnapshot]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Auto-grow the textarea as the user types.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(200, ta.scrollHeight)}px`;
  }, [input]);

  const activeModel = useMemo(() => getModelById(settings.modelId), [settings.modelId]);

  const buildHistoryTurns = useCallback(
    (history: DisplayMessage[]): ChatTurn[] => {
      // Keep the last 10 turns to cap prompt size. Business context lives in
      // the system message so we don't need long conversation history.
      return history
        .filter((m) => !m.error)
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
    },
    [],
  );

  const sendMessage = useCallback(
    async (prompt?: string) => {
      const text = (prompt ?? input).trim();
      if (!text || isStreaming) return;
      if (!snapshot) {
        setSnapshotError("Business data not loaded yet — please wait a moment and retry.");
        return;
      }

      const userMsg: DisplayMessage = {
        id: makeId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      const assistantId = makeId();
      const assistantPlaceholder: DisplayMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput("");
      setIsStreaming(true);

      const system = buildSystemPrompt(snapshot, settings.customInstructions, user?.username ?? null);
      const history = [...messages, userMsg];
      const turns: ChatTurn[] = [
        { role: "system", content: system },
        ...buildHistoryTurns(history),
      ];

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChatCompletion({
          messages: turns,
          model: settings.modelId,
          apiKeyOverride: settings.apiKey,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          signal: controller.signal,
          onDelta: (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + delta }
                  : m,
              ),
            );
          },
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
      } catch (err: unknown) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (aborted) {
          // Keep whatever was streamed so far but mark as done.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, content: m.content || "_(stopped)_" }
                : m,
            ),
          );
        } else {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, error: true, content: `⚠ ${msg}` }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [
      buildHistoryTurns,
      input,
      isStreaming,
      messages,
      settings.apiKey,
      settings.customInstructions,
      settings.maxTokens,
      settings.modelId,
      settings.temperature,
      snapshot,
      user?.username,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleClear = () => {
    if (isStreaming) abortRef.current?.abort();
    setMessages([]);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      /* noop */
    }
  };

  const handlePopout = () => {
    const w = 1080;
    const h = 820;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    window.open(
      `/chat-ai?focus=1`,
      "cuephoria-ai",
      `width=${w},height=${h},left=${left},top=${top},popup=yes`,
    );
  };

  // -------- Render helpers --------

  const header = (
    <div
      className="relative flex items-center justify-between gap-3 px-4 py-3 border-b"
      style={{
        background:
          "linear-gradient(180deg, rgba(13,7,30,0.85) 0%, rgba(13,7,30,0.5) 100%)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(90% 180% at 15% -60%, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0) 55%)",
        }}
      />
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-cuephoria-purple/40 blur-lg" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple shadow-lg shadow-cuephoria-purple/40">
            <Bot className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-white leading-none">
              Cuephoria <span className="gradient-text">AI</span>
            </h1>
            <Badge
              variant="outline"
              className="h-5 border-emerald-400/40 bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-300"
            >
              Live
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
            <DatabaseZap className="h-3 w-3 text-cuephoria-lightpurple" />
            {snapshot ? (
              <span className="tabular-nums">
                {snapshot.meta.approxTokens} ctx tokens · {activeModel.provider}
              </span>
            ) : (
              <span>Loading business data…</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ModelPicker
          value={settings.modelId}
          onChange={(id) => updateSettings({ modelId: id })}
          compact
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadSnapshot()}
          disabled={snapshotLoading}
          className="h-8 w-8 text-white/70 hover:bg-white/5 hover:text-white"
          title="Refresh business data"
        >
          <RefreshCw
            className={`h-4 w-4 ${snapshotLoading ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="h-8 w-8 text-white/70 hover:bg-white/5 hover:text-white"
          title="AI settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        {!standalone ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePopout}
            className="h-8 w-8 text-white/70 hover:bg-white/5 hover:text-white"
            title="Pop out to a separate window"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.close()}
            className="h-8 w-8 text-white/70 hover:bg-white/5 hover:text-white"
            title="Close window"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-8 w-8 text-white/70 hover:bg-white/5 hover:text-white"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const welcome = (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple shadow-xl shadow-cuephoria-purple/40">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          {user?.username
            ? `Hey @${user.username.charAt(0).toUpperCase() + user.username.slice(1)}`
            : "Welcome"}
          <span className="gradient-text"> — what should we look at?</span>
        </h2>
        <p className="mt-2 text-sm text-white/60 max-w-xl mx-auto">
          I can see live sales, bookings, stations, customers, inventory and
          expenses from your Supabase. Pick a quick start or just ask anything.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => sendMessage(s.prompt)}
            disabled={isStreaming || snapshotLoading}
            className="group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all duration-300 hover:border-cuephoria-purple/50 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-cuephoria-purple/10 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
              style={{
                background:
                  "radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)",
              }}
            />
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${s.tint} text-white shadow-md`}
            >
              {s.icon}
            </div>
            <div className="font-semibold text-white group-hover:text-cuephoria-lightpurple transition-colors">
              {s.title}
            </div>
            <p className="text-[12.5px] leading-snug text-white/55 line-clamp-2">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  const messagesList = (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 space-y-5">
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.id}
            className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
          >
            {!isUser && (
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple shadow-md shadow-cuephoria-purple/30">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}

            <div
              className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-lg transition-colors ${
                isUser
                  ? "bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple text-white shadow-cuephoria-purple/40"
                  : "border border-white/10 bg-white/[0.04] text-white/90 backdrop-blur-md"
              } ${m.error ? "border-red-500/50 bg-red-500/10" : ""}`}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                  {m.content}
                </p>
              ) : (
                <MessageContent content={m.content || "…"} streaming={m.streaming} />
              )}
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider opacity-60">
                <span>
                  {m.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {!isUser && m.content && !m.streaming && (
                  <button
                    onClick={() => handleCopy(m.id, m.content)}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="h-3 w-3" /> copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> copy
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {isUser && (
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cuephoria-blue to-cyan-500 text-white shadow-md">
                <span className="text-xs font-bold">
                  {user?.username?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );

  const inputBar = (
    <div
      className="relative border-t"
      style={{
        background:
          "linear-gradient(0deg, rgba(13,7,30,0.9) 0%, rgba(13,7,30,0.55) 100%)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3">
        <div
          className={`group relative rounded-2xl border bg-white/[0.04] transition-colors ${
            isStreaming
              ? "border-cuephoria-purple/40 shadow-[0_0_0_3px_rgba(168,85,247,0.12)]"
              : "border-white/10 focus-within:border-cuephoria-purple/50 focus-within:shadow-[0_0_0_3px_rgba(168,85,247,0.12)]"
          }`}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              snapshotLoading
                ? "Loading business data…"
                : `Ask about sales, bookings, inventory, customers… (⇧+⏎ for newline)`
            }
            rows={1}
            className="min-h-[46px] resize-none border-0 bg-transparent px-4 py-3 pr-14 text-[14px] text-white placeholder:text-white/35 focus-visible:ring-0"
            disabled={snapshotLoading}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            {isStreaming ? (
              <Button
                onClick={handleStop}
                size="icon"
                className="h-9 w-9 rounded-xl bg-white/10 text-white hover:bg-white/15"
                title="Stop"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </Button>
            ) : (
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || snapshotLoading}
                size="icon"
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple text-white shadow-md shadow-cuephoria-purple/40 hover:opacity-95 disabled:opacity-40"
                title="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-white/35">
          <span>
            Model: <span className="text-white/60">{activeModel.label}</span> ·
            temp {settings.temperature.toFixed(2)} · max {settings.maxTokens}
          </span>
          {snapshot && (
            <span className="tabular-nums">
              Context refreshed{" "}
              {new Date(snapshot.meta.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const outerClass = standalone
    ? "flex h-screen w-screen flex-col bg-gradient-to-br from-[#0A061A] via-[#0E0827] to-[#0A061A] text-white"
    : "flex h-[calc(100vh-var(--app-header-height,56px))] flex-col bg-gradient-to-br from-[#0A061A] via-[#0E0827] to-[#0A061A] text-white";

  return (
    <div className={outerClass}>
      {header}

      {snapshotError && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-3">
          <Alert
            variant="destructive"
            className="border-red-500/40 bg-red-500/10 text-red-200"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data load failed</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{snapshotError}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadSnapshot()}
                className="border-red-400/40 bg-transparent text-red-200 hover:bg-red-500/10"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto">
        {messages.length === 0 ? welcome : messagesList}
      </div>

      {inputBar}

      <AISettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default ChatAI;
