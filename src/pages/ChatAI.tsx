/**
 * Cuephoria AI — tenant-themed, immersive, multi-model assistant.
 *
 * High-level architecture:
 * - Data: `fetchBusinessSnapshot()` (Supabase-backed, compact)
 * - Streaming: `streamChatCompletion()` → OpenRouter (server-proxy by default)
 * - Per-tenant persistence:
 *     · `useChatThreads(orgId, userId)` — saved conversations
 *     · `useAIUsage(orgId, userId)`   — token + cost tracker
 * - Theming: reads tenant tokens through `useTenantBrandingOptional()` and
 *   CSS vars (`--primary`, `--brand-*-hex`) so re-branding is instant.
 * - Layout:
 *     · Desktop / tablet → this component (sidebar + main column + ambient
 *       3D backdrop).
 *     · Mobile (or `?m=1`) → delegates to `<ChatAIMobile />` so the
 *       pop-out experience is properly thumb-friendly.
 *
 * Animation language uses framer-motion exclusively. `prefers-reduced-motion`
 * is respected by the backdrop and typing indicator.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUp,
  BarChart3,
  Calendar,
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
import { AmbientBackdrop } from "@/components/ai/AmbientBackdrop";
import { ChatBubble, type ChatBubbleMessage } from "@/components/ai/ChatBubble";
import { ThreadSidebar } from "@/components/ai/ThreadSidebar";
import { UsagePill } from "@/components/ai/UsageWidget";
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
import {
  makeMessageId,
  useChatThreads,
  type ThreadMessage,
} from "@/services/aiChatHistory";
import { useAIUsage } from "@/services/aiUsageTracker";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationOptional } from "@/context/OrganizationContext";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatAIMobile from "@/pages/ChatAIMobile";

interface SuggestionCard {
  title: string;
  prompt: string;
  icon: React.ReactNode;
  accent: "primary" | "accent" | "emerald" | "amber" | "rose" | "cyan";
}

const SUGGESTIONS: SuggestionCard[] = [
  {
    title: "Today's snapshot",
    prompt:
      "Give me today's performance snapshot — total revenue, sales count, payment-mix, and how it compares with the 7-day average.",
    icon: <TrendingUp className="h-4 w-4" />,
    accent: "emerald",
  },
  {
    title: "Peak hour",
    prompt:
      "Which hour today has generated the most revenue so far? Show the top three hours with their revenue.",
    icon: <BarChart3 className="h-4 w-4" />,
    accent: "primary",
  },
  {
    title: "Upcoming bookings",
    prompt:
      "What bookings are coming up next? Include the date, time and status for the next few.",
    icon: <Calendar className="h-4 w-4" />,
    accent: "accent",
  },
  {
    title: "Top customers",
    prompt:
      "Who are my top spending customers right now, and how many new customers did I get this week?",
    icon: <Users className="h-4 w-4" />,
    accent: "cyan",
  },
  {
    title: "Inventory alerts",
    prompt:
      "Which products are low on stock or completely out? Suggest what to reorder first.",
    icon: <Package className="h-4 w-4" />,
    accent: "rose",
  },
  {
    title: "Revenue vs. expenses",
    prompt:
      "Give me a 30-day summary of revenue vs. expenses (by category) and estimate my net position.",
    icon: <DollarSign className="h-4 w-4" />,
    accent: "amber",
  },
];

const ACCENT_STYLE: Record<SuggestionCard["accent"], { from: string; to: string; glow: string }> = {
  primary: {
    from: "hsl(var(--primary))",
    to: "hsl(var(--primary) / 0.55)",
    glow: "hsl(var(--primary) / 0.4)",
  },
  accent: {
    from: "hsl(var(--accent))",
    to: "hsl(var(--accent) / 0.55)",
    glow: "hsl(var(--accent) / 0.4)",
  },
  emerald: { from: "#10b981", to: "#059669", glow: "rgba(16,185,129,0.35)" },
  amber: { from: "#f59e0b", to: "#d97706", glow: "rgba(245,158,11,0.35)" },
  rose: { from: "#f43f5e", to: "#e11d48", glow: "rgba(244,63,94,0.35)" },
  cyan: { from: "#06b6d4", to: "#0891b2", glow: "rgba(6,182,212,0.35)" },
};

/**
 * Build the system prompt: rules + tenant-scoped snapshot. Optimised for
 * token accuracy — numbers must not be hallucinated.
 */
function buildSystemPrompt(
  snapshot: BusinessSnapshot,
  custom: string,
  userName: string | null,
  tenantName: string | null,
): string {
  const headline = `You are Cuephoria AI — an operational assistant for ${
    tenantName ?? "a gaming-cafe / arcade"
  }. You answer questions about the business using the DATA block below.`;

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

interface ChatAIProps {
  standalone?: boolean;
}

const ChatAI: React.FC<ChatAIProps> = ({ standalone: standaloneProp }) => {
  const { user } = useAuth();
  const org = useOrganizationOptional();
  const branding = useTenantBrandingOptional();
  const isMobile = useIsMobile();
  const { settings, update: updateSettings } = useAISettings();
  const [searchParams] = useSearchParams();

  // Pop-out mode + explicit "mobile view" override.
  const standalone = standaloneProp ?? searchParams.get("focus") === "1";
  const forceMobile = searchParams.get("m") === "1";

  // Route mobile devices (or explicit ?m=1) to the mobile layout. This
  // covers both "user is on a phone" and "user popped out to a mobile
  // view from desktop".
  if (isMobile || forceMobile) {
    return <ChatAIMobile />;
  }

  return <ChatAIDesktop standalone={standalone} user={user} org={org} branding={branding} settings={settings} updateSettings={updateSettings} />;
};

// ============================================================================
// Desktop / tablet shell
// ============================================================================

interface DesktopProps {
  standalone: boolean;
  user: ReturnType<typeof useAuth>["user"];
  org: ReturnType<typeof useOrganizationOptional>;
  branding: ReturnType<typeof useTenantBrandingOptional>;
  settings: ReturnType<typeof useAISettings>["settings"];
  updateSettings: ReturnType<typeof useAISettings>["update"];
}

const ChatAIDesktop: React.FC<DesktopProps> = ({
  standalone,
  user,
  org,
  branding,
  settings,
  updateSettings,
}) => {
  const orgId = org?.organization?.id ?? null;
  const userId = user?.id ?? null;
  const userInitial = user?.username?.[0]?.toUpperCase() ?? "U";
  const tenantName = branding?.brand?.name ?? org?.organization?.name ?? null;

  // ---- Business snapshot ----------------------------------------------------
  const [snapshot, setSnapshot] = useState<BusinessSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const snap = await fetchBusinessSnapshot();
      setSnapshot(snap);
    } catch (e: unknown) {
      setSnapshotError(e instanceof Error ? e.message : "Failed to load business data.");
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const id = window.setInterval(() => loadSnapshot({ silent: true }), 3 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loadSnapshot]);

  // ---- Threads --------------------------------------------------------------
  const { threads, create: createThread, save: saveThread, remove: removeThread, rename: renameThread } =
    useChatThreads(orgId, userId);
  const { record: recordUsage } = useAIUsage(orgId, userId);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ---- Streaming state ------------------------------------------------------
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When the active tenant changes (user switches between orgs, e.g.
  // Cuephoria Main → Cuephoria Lite) we MUST drop any in-flight
  // conversation state, because it references thread ids that only
  // exist in the previous tenant's storage bucket. Otherwise the old
  // thread keeps rendering and any new message gets saved under the
  // new tenant but linked to a thread id that doesn't exist there.
  useEffect(() => {
    abortRef.current?.abort();
    setActiveThreadId(null);
    setMessages([]);
  }, [orgId, userId]);

  // Load the most recent thread on first mount (and after a tenant
  // switch) — keeps "continuity" without surprising users by jumping
  // into an ancient chat from the wrong tenant.
  useEffect(() => {
    if (activeThreadId !== null) return;
    const latest = threads[0];
    if (!latest) return;
    setActiveThreadId(latest.id);
    setMessages(
      latest.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        error: m.error,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads.length, orgId, userId]);

  // Scroll on new messages only (not every delta) — streaming scroll is
  // handled inside the batched rAF flush below.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  const activeModel = useMemo(() => getModelById(settings.modelId), [settings.modelId]);

  // ---- Persistence helpers --------------------------------------------------
  const persist = useCallback(
    (threadId: string, msgs: ChatBubbleMessage[]) => {
      const toStore: ThreadMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        error: m.error,
      }));
      saveThread(threadId, toStore, settings.modelId);
    },
    [saveThread, settings.modelId],
  );

  // ---- Compose & send -------------------------------------------------------
  const buildHistoryTurns = useCallback((history: ChatBubbleMessage[]): ChatTurn[] => {
    return history
      .filter((m) => !m.error)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
  }, []);

  const sendMessage = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || isStreaming) return;
      if (!snapshot) {
        setSnapshotError("Business data not loaded yet — please wait a moment and retry.");
        return;
      }

      const userMsg: ChatBubbleMessage = {
        id: makeMessageId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      const assistantId = makeMessageId();
      const assistantPlaceholder: ChatBubbleMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };

      // Ensure a thread exists for this conversation so we persist as we go.
      let threadId = activeThreadId;
      if (!threadId) {
        const t = createThread({
          modelId: settings.modelId,
          firstMessage: {
            id: userMsg.id,
            role: userMsg.role,
            content: userMsg.content,
            timestamp: userMsg.timestamp.toISOString(),
          },
        });
        threadId = t.id;
        setActiveThreadId(threadId);
      }

      const nextHistory = [...messages, userMsg, assistantPlaceholder];
      setMessages(nextHistory);
      setIsStreaming(true);

      const system = buildSystemPrompt(
        snapshot,
        settings.customInstructions,
        user?.username ?? null,
        tenantName,
      );
      const turns: ChatTurn[] = [
        { role: "system", content: system },
        ...buildHistoryTurns([...messages, userMsg]),
      ];

      const controller = new AbortController();
      abortRef.current = controller;

      // ---- Streaming batcher ------------------------------------------------
      // Instead of calling setMessages on every SSE token (which re-renders
      // every bubble and re-parses markdown for each one), we accumulate
      // text in a ref and flush once per animation frame. That's ~10x fewer
      // React renders during typical responses and is the single biggest
      // INP win on this page.
      let pendingDelta = "";
      let rafId = 0;
      const flush = () => {
        rafId = 0;
        if (!pendingDelta) return;
        const chunk = pendingDelta;
        pendingDelta = "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        );
        // Use scrollTo with 'auto' for cheap, jank-free follow.
        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      };
      const scheduleFlush = () => {
        if (rafId) return;
        rafId = window.requestAnimationFrame(flush);
      };

      try {
        const result = await streamChatCompletion({
          messages: turns,
          model: settings.modelId,
          apiKeyOverride: settings.apiKey,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          signal: controller.signal,
          onDelta: (delta) => {
            pendingDelta += delta;
            scheduleFlush();
          },
        });

        // Drain any tail that hasn't flushed yet before we mark complete.
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        const tail = pendingDelta;
        pendingDelta = "";

        setMessages((prev) => {
          const finalMsgs = prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + tail, streaming: false }
              : m,
          );
          if (threadId) persist(threadId, finalMsgs);
          return finalMsgs;
        });

        if (result.usage) {
          recordUsage({
            modelId: settings.modelId,
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          });
        }
      } catch (err: unknown) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        const tail = pendingDelta;
        pendingDelta = "";
        const aborted = err instanceof DOMException && err.name === "AbortError";
        setMessages((prev) => {
          const finalMsgs = prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  error: !aborted,
                  content: aborted
                    ? (m.content + tail) || "_(stopped)_"
                    : `⚠ ${err instanceof Error ? err.message : "Unknown error"}`,
                }
              : m,
          );
          if (threadId) persist(threadId, finalMsgs);
          return finalMsgs;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [
      activeThreadId,
      buildHistoryTurns,
      createThread,
      isStreaming,
      messages,
      persist,
      recordUsage,
      settings.apiKey,
      settings.customInstructions,
      settings.maxTokens,
      settings.modelId,
      settings.temperature,
      snapshot,
      tenantName,
      user?.username,
    ],
  );

  const handleStop = useCallback(() => abortRef.current?.abort(), []);

  const handleNewThread = useCallback(() => {
    if (isStreaming) abortRef.current?.abort();
    setActiveThreadId(null);
    setMessages([]);
  }, [isStreaming]);

  const handleSelectThread = useCallback(
    (id: string) => {
      if (isStreaming) abortRef.current?.abort();
      const t = threads.find((x) => x.id === id);
      if (!t) return;
      setActiveThreadId(t.id);
      setMessages(
        t.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
          error: m.error,
        })),
      );
    },
    [isStreaming, threads],
  );

  const handleDeleteThread = useCallback(
    (id: string) => {
      removeThread(id);
      if (activeThreadId === id) {
        setActiveThreadId(null);
        setMessages([]);
      }
    },
    [activeThreadId, removeThread],
  );

  const handleClearCurrent = useCallback(() => {
    if (!activeThreadId) return;
    handleDeleteThread(activeThreadId);
  }, [activeThreadId, handleDeleteThread]);

  // Stable reference so ChatBubble's React.memo holds across renders and
  // only the currently-streaming bubble gets re-rendered.
  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      /* noop */
    }
  }, []);

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

  // ==========================================================================
  // Render
  // ==========================================================================

  const shellHeight = standalone
    ? "h-screen"
    : "h-[calc(100vh-var(--app-header-height,56px))]";

  return (
    <div
      className={`relative flex ${shellHeight} w-full overflow-hidden text-white`}
      style={{ background: "hsl(var(--background))" }}
    >
      <AmbientBackdrop />

      {/* Thread rail */}
      <div className="relative z-10 flex">
        <ThreadSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={setSidebarCollapsed}
          onNew={handleNewThread}
          onSelect={handleSelectThread}
          onRename={renameThread}
          onDelete={handleDeleteThread}
        />
      </div>

      {/* Main chat column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="relative flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--background) / 0.75) 0%, hsl(var(--background) / 0.45) 100%)",
            boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <BrandAvatar />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-bold leading-none">
                  {tenantName ? `${tenantName} AI` : "Cuephoria AI"}
                </h1>
                <Badge
                  variant="outline"
                  className="h-5 border-emerald-400/40 bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-300"
                >
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-white/50">
                <DatabaseZap className="h-3 w-3 text-[hsl(var(--primary))]" />
                {snapshot ? (
                  <span className="tabular-nums">
                    {snapshot.meta.approxTokens.toLocaleString()} ctx tokens ·{" "}
                    {activeModel.provider}
                  </span>
                ) : (
                  <span>Loading business data…</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <UsagePill orgId={orgId} userId={userId} />
            <ModelPicker
              value={settings.modelId}
              onChange={(id) => updateSettings({ modelId: id })}
              compact
            />
            <div className="mx-1 hidden h-5 w-px bg-white/10 md:block" />
            <IconBtn title="Refresh business data" onClick={() => loadSnapshot()} disabled={snapshotLoading}>
              <RefreshCw className={`h-4 w-4 ${snapshotLoading ? "animate-spin" : ""}`} />
            </IconBtn>
            <IconBtn title="AI settings" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </IconBtn>
            {!standalone ? (
              <IconBtn title="Pop out to a separate window" onClick={handlePopout}>
                <ExternalLink className="h-4 w-4" />
              </IconBtn>
            ) : (
              <IconBtn title="Close window" onClick={() => window.close()}>
                <X className="h-4 w-4" />
              </IconBtn>
            )}
            {messages.length > 0 && (
              <IconBtn title="Delete this chat" onClick={handleClearCurrent}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            )}
          </div>
        </header>

        {/* Snapshot error banner */}
        {snapshotError && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-3">
            <Alert
              variant="destructive"
              className="border-red-500/40 bg-red-500/10 text-red-200 backdrop-blur-md"
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
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Conversation / welcome */}
        <div className="relative flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <Welcome
              userName={user?.username ?? null}
              disabled={isStreaming || snapshotLoading}
              onPick={(prompt) => sendMessage(prompt)}
            />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4 px-3 py-5 sm:px-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    message={m}
                    userInitial={userInitial}
                    onCopy={handleCopy}
                    copied={copiedId === m.id}
                  />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <Composer
          onSubmit={sendMessage}
          onStop={handleStop}
          textareaRef={textareaRef}
          isStreaming={isStreaming}
          snapshotLoading={snapshotLoading}
          activeModelLabel={activeModel.label}
          temperature={settings.temperature}
          maxTokens={settings.maxTokens}
          snapshotGeneratedAt={snapshot?.meta.generatedAt}
        />
      </div>

      <AISettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

// ============================================================================
// Brand avatar — glowing, breathing "C" tile
// ============================================================================

const BrandAvatar: React.FC = React.memo(() => {
  const branding = useTenantBrandingOptional();
  const logo = branding?.brand?.assets?.logoLightUrl ?? null;

  // Breathing glow moved from animated box-shadow (forces a paint on the
  // whole header every frame) to a static CSS opacity pulse on a blurred
  // pseudo layer — GPU-only, no paint cost.
  return (
    <div
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl text-white"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 120%)",
        boxShadow:
          "0 10px 24px -8px hsl(var(--primary) / 0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-2xl animate-pulse"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 65%)",
          willChange: "opacity",
        }}
      />
      {logo ? (
        <img src={logo} alt="" className="relative h-6 w-6 object-contain" />
      ) : (
        <Sparkles className="relative h-5 w-5" />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.35) 0%, transparent 60%)",
        }}
      />
    </div>
  );
});
BrandAvatar.displayName = "BrandAvatar";

// ============================================================================
// Icon button
// ============================================================================

const IconBtn: React.FC<
  React.ComponentProps<typeof Button> & { title: string; children: React.ReactNode }
> = ({ title, children, ...props }) => (
  <Button
    {...props}
    variant="ghost"
    size="icon"
    title={title}
    className="h-8 w-8 rounded-lg text-white/65 transition-all hover:bg-white/5 hover:text-white"
  >
    {children}
  </Button>
);

// ============================================================================
// Welcome screen (suggestion cards with 3D tilt)
// ============================================================================

interface WelcomeProps {
  userName: string | null;
  disabled: boolean;
  onPick: (prompt: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ userName, disabled, onPick }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="text-center"
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 120%)",
            boxShadow:
              "0 18px 40px -12px hsl(var(--primary) / 0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <Sparkles className="h-8 w-8" />
        </motion.div>

        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {userName ? (
            <>
              Hey{" "}
              <span className="text-white">
                @{userName.charAt(0).toUpperCase() + userName.slice(1)}
              </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                }}
              >
                {" "}
                — what should we look at?
              </span>
            </>
          ) : (
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
              }}
            >
              Welcome to Cuephoria AI
            </span>
          )}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
          I see live sales, bookings, stations, customers, inventory and expenses
          from your Supabase. Pick a quick start, or just ask anything.
        </p>
      </motion.div>

      <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map((s, i) => {
          const style = ACCENT_STYLE[s.accent];
          return (
            <motion.button
              key={s.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 22,
                delay: 0.08 + i * 0.04,
              }}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              disabled={disabled}
              onClick={() => onPick(s.prompt)}
              className="group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-md transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px -18px rgba(0,0,0,0.5)",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
                style={{ background: style.glow }}
              />
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${style.from} 0%, ${style.to} 100%)`,
                  boxShadow: `0 8px 16px -6px ${style.glow}`,
                }}
              >
                {s.icon}
              </div>
              <div className="font-semibold text-white transition-colors">
                {s.title}
              </div>
              <p className="line-clamp-2 text-[12.5px] leading-snug text-white/55">
                {s.prompt}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Composer
// ============================================================================

interface ComposerProps {
  onSubmit: (text: string) => void;
  onStop: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isStreaming: boolean;
  snapshotLoading: boolean;
  activeModelLabel: string;
  temperature: number;
  maxTokens: number;
  snapshotGeneratedAt: string | undefined;
}

/**
 * Self-contained composer. It owns its own input state so keystrokes do
 * NOT re-render the messages list, sidebar, or header — a big INP win
 * at the expense of a tiny amount of plumbing. We also wrap in
 * React.memo so the composer only re-renders when streaming state,
 * snapshot metadata, or model settings actually change.
 */
const ComposerInner: React.FC<ComposerProps> = ({
  onSubmit,
  onStop,
  textareaRef,
  isStreaming,
  snapshotLoading,
  activeModelLabel,
  temperature,
  maxTokens,
  snapshotGeneratedAt,
}) => {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !snapshotLoading;

  const handleSubmit = useCallback(() => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    setValue("");
  }, [value, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      const ta = textareaRef.current;
      if (ta) {
        ta.style.height = "auto";
        ta.style.height = `${Math.min(200, ta.scrollHeight)}px`;
      }
    },
    [textareaRef],
  );

  return (
    <div
      className="relative border-t border-white/5 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(0deg, hsl(var(--background) / 0.85) 0%, hsl(var(--background) / 0.45) 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-5">
        <div
          className={`group relative rounded-2xl border transition-colors ${
            isStreaming
              ? "border-[hsl(var(--primary)/0.45)] bg-white/[0.05] shadow-[0_0_0_3px_hsl(var(--primary)/0.18),0_18px_40px_-20px_hsl(var(--primary)/0.6)]"
              : "border-white/10 bg-white/[0.04] focus-within:border-[hsl(var(--primary)/0.55)] shadow-[0_10px_30px_-22px_rgba(0,0,0,0.8)]"
          }`}
        >
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              snapshotLoading
                ? "Loading business data…"
                : "Ask about sales, bookings, inventory, customers… (⇧+⏎ for newline)"
            }
            rows={1}
            disabled={snapshotLoading}
            className="min-h-[46px] resize-none border-0 bg-transparent px-4 py-3 pr-14 text-[14px] text-white placeholder:text-white/35 focus-visible:ring-0"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            {isStreaming ? (
              <Button
                onClick={onStop}
                size="icon"
                className="h-9 w-9 rounded-xl bg-white/10 text-white hover:bg-white/15"
                title="Stop"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSend}
                size="icon"
                className="h-9 w-9 rounded-xl text-white disabled:opacity-40"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                  boxShadow: "0 10px 22px -6px hsl(var(--primary) / 0.55)",
                }}
                title="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-white/35">
          <span>
            Model: <span className="text-white/60">{activeModelLabel}</span> · temp{" "}
            {temperature.toFixed(2)} · max {maxTokens}
          </span>
          {snapshotGeneratedAt && (
            <span className="tabular-nums">
              Context refreshed{" "}
              {new Date(snapshotGeneratedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const Composer = React.memo(ComposerInner);

export default ChatAI;
