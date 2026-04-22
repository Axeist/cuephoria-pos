/**
 * Cuephoria AI — mobile-first chat surface.
 *
 * Rendered automatically when:
 *   - the viewport is < 768px, OR
 *   - the URL has `?m=1` (explicit "open mobile view" override)
 *
 * Also reachable as a chrome-less window via `?focus=1` — the route is the
 * same (`/chat-ai`), only the layout differs. This lets operators pop the
 * chat onto their phone by scanning a QR, or install the app to the home
 * screen and get a native-feeling AI console.
 *
 * UX choices:
 * - Full-bleed ambient backdrop (shared with desktop) keeps the visual
 *   language consistent while adapting to brand tokens.
 * - Top bar collapses brand + model picker + usage pill into ~52px.
 * - Bottom Sheets host threads, settings, and the expanded usage panel so
 *   there's always maximum screen real-estate for the conversation.
 * - Safe-area insets applied at the composer so the send button sits
 *   above the iOS home indicator.
 * - Big 44×44+ tap targets for all controls.
 * - Same per-tenant persistence (`useChatThreads`) and usage tracking
 *   (`useAIUsage`) as the desktop layout.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  BarChart3,
  Calendar,
  DatabaseZap,
  Gauge,
  History,
  MessageSquarePlus,
  Package,
  RefreshCw,
  Settings2,
  Sparkles,
  Square,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AmbientBackdrop } from "@/components/ai/AmbientBackdrop";
import { ChatBubble, type ChatBubbleMessage } from "@/components/ai/ChatBubble";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { ThreadListBody } from "@/components/ai/ThreadSidebar";
import { UsagePanel } from "@/components/ai/UsageWidget";
import { ModelPicker } from "@/components/ai/ModelPicker";
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
import { useAIUsage, deriveUsage, getInrPerUsd } from "@/services/aiUsageTracker";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationOptional } from "@/context/OrganizationContext";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";

interface QuickPrompt {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: "Today",
    prompt: "Give me today's revenue, sales count and payment-mix in a quick bullet list.",
  },
  {
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    label: "Peak hour",
    prompt: "Which hour today has the highest revenue? Show top 3 hours with amounts.",
  },
  {
    icon: <Calendar className="h-3.5 w-3.5" />,
    label: "Bookings",
    prompt: "What bookings are coming up next? Date, time and status.",
  },
  {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Top clients",
    prompt: "Top spending customers right now and new customers this week.",
  },
  {
    icon: <Package className="h-3.5 w-3.5" />,
    label: "Low stock",
    prompt: "Which products are low or out of stock? What should I reorder first?",
  },
];

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
    "Respond in crisp Markdown (phone-friendly: short bullets, no tables).",
    "All currency is INR — always prefix numbers with ₹ and use Indian comma grouping.",
    "Use only numbers present in the DATA block. Do not invent or extrapolate.",
    "When asked about 'today', use the section labelled `# TODAY`.",
    "Be tight (≤ 5 short lines). Offer to expand if needed.",
  ];

  return [
    headline,
    userName ? `The staff member asking is @${userName}.` : "",
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

const ChatAIMobile: React.FC = () => {
  const { user } = useAuth();
  const org = useOrganizationOptional();
  const branding = useTenantBrandingOptional();
  const { settings, update: updateSettings } = useAISettings();

  const orgId = org?.organization?.id ?? null;
  const userId = user?.id ?? null;
  const userInitial = user?.username?.[0]?.toUpperCase() ?? "U";
  const tenantName = branding?.brand?.name ?? org?.organization?.name ?? null;

  // ---- Snapshot ------------------------------------------------------------
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

  // ---- Threads + usage ----------------------------------------------------
  const { threads, create: createThread, save: saveThread, remove: removeThread, rename: renameThread } =
    useChatThreads(orgId, userId);
  const { snapshot: usageSnap, record: recordUsage } = useAIUsage(orgId, userId);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);

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
  }, [threads.length]);

  // ---- Composer + streaming -----------------------------------------------
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(140, ta.scrollHeight)}px`;
  }, [input]);

  const activeModel = useMemo(() => getModelById(settings.modelId), [settings.modelId]);
  const usageDerived = useMemo(() => deriveUsage(usageSnap), [usageSnap]);
  const inrRate = getInrPerUsd();

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

  const buildHistoryTurns = useCallback((history: ChatBubbleMessage[]): ChatTurn[] => {
    return history
      .filter((m) => !m.error)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
  }, []);

  const sendMessage = useCallback(
    async (prompt?: string) => {
      const text = (prompt ?? input).trim();
      if (!text || isStreaming) return;
      if (!snapshot) {
        setSnapshotError("Business data still loading — try again in a moment.");
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

      setMessages([...messages, userMsg, assistantPlaceholder]);
      setInput("");
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

      try {
        const result = await streamChatCompletion({
          messages: turns,
          model: settings.modelId,
          apiKeyOverride: settings.apiKey,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          signal: controller.signal,
          onDelta: (delta) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
            );
          },
        });

        setMessages((prev) => {
          const finalMsgs = prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
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
        const aborted = err instanceof DOMException && err.name === "AbortError";
        setMessages((prev) => {
          const finalMsgs = prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  error: !aborted,
                  content: aborted
                    ? m.content || "_(stopped)_"
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
      }
    },
    [
      activeThreadId,
      buildHistoryTurns,
      createThread,
      input,
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

  const handleStop = () => abortRef.current?.abort();

  const handleNew = () => {
    if (isStreaming) abortRef.current?.abort();
    setActiveThreadId(null);
    setMessages([]);
    setThreadsOpen(false);
    textareaRef.current?.focus();
  };

  const handleSelect = (id: string) => {
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
    setThreadsOpen(false);
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

  const todayInr = (usageDerived.todayCostUsd * inrRate);

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden text-white"
      style={{
        background: "hsl(var(--background))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <AmbientBackdrop intensity={0.9} />

      {/* Top bar */}
      <header className="relative z-10 flex h-14 items-center justify-between gap-2 px-3 border-b border-white/5 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background) / 0.8) 0%, hsl(var(--background) / 0.5) 100%)",
        }}
      >
        <button
          onClick={() => setThreadsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 active:scale-95 transition-transform"
          title="Chats"
        >
          <History className="h-4.5 w-4.5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <motion.div
            className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 120%)",
              boxShadow: "0 6px 18px -6px hsl(var(--primary) / 0.6)",
            }}
            animate={{
              boxShadow: [
                "0 6px 18px -6px hsl(var(--primary) / 0.45)",
                "0 10px 24px -4px hsl(var(--primary) / 0.75)",
                "0 6px 18px -6px hsl(var(--primary) / 0.45)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4" />
          </motion.div>
          <div className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="truncate text-[13.5px] font-bold leading-none">
                {tenantName ? `${tenantName} AI` : "Cuephoria AI"}
              </h1>
              <Badge
                variant="outline"
                className="h-4 border-emerald-400/40 bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-300"
              >
                Live
              </Badge>
            </div>
            <button
              onClick={() => setModelOpen(true)}
              className="mt-0.5 text-[10px] text-white/45 active:text-white"
            >
              {activeModel.label} · tap to switch
            </button>
          </div>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 active:scale-95 transition-transform"
          title="Settings"
        >
          <Settings2 className="h-4.5 w-4.5" />
        </button>
      </header>

      {/* Secondary bar: usage chip + new chat */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setUsageOpen(true)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white/80"
        >
          <Gauge className="h-3.5 w-3.5 text-amber-300" />
          <span className="tabular-nums">
            ₹{todayInr.toLocaleString("en-IN", {
              minimumFractionDigits: todayInr < 1 ? 3 : 2,
              maximumFractionDigits: todayInr < 1 ? 3 : 2,
            })}
          </span>
          <span className="text-white/40">today</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNew}
          disabled={isStreaming}
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-white disabled:opacity-40"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary) / 0.35) 0%, hsl(var(--accent) / 0.3) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New chat
        </motion.button>
      </div>

      {/* Conversation / welcome */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <MobileWelcome
            userName={user?.username ?? null}
            disabled={isStreaming || snapshotLoading}
            onPick={(p) => sendMessage(p)}
          />
        ) : (
          <div className="flex flex-col gap-3 px-3 py-4">
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

      {/* Snapshot error strip */}
      {snapshotError && (
        <div className="relative z-10 mx-3 mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{snapshotError}</span>
            <button
              onClick={() => loadSnapshot()}
              className="flex items-center gap-1 text-[11px] text-red-100 underline underline-offset-2"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <div
        className="relative z-10 border-t border-white/5 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(0deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.55) 100%)",
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
      >
        <div className="flex items-end gap-2 px-3 py-2.5">
          <motion.div
            animate={{
              boxShadow: isStreaming
                ? "0 0 0 3px hsl(var(--primary) / 0.22)"
                : "0 0 0 0px hsl(var(--primary) / 0)",
            }}
            className={`flex-1 rounded-2xl border transition-colors ${
              isStreaming
                ? "border-[hsl(var(--primary)/0.55)] bg-white/[0.05]"
                : "border-white/10 bg-white/[0.04] focus-within:border-[hsl(var(--primary)/0.55)]"
            }`}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={snapshotLoading ? "Loading data…" : "Ask me anything about the business…"}
              rows={1}
              disabled={snapshotLoading}
              className="min-h-[44px] max-h-[140px] resize-none border-0 bg-transparent px-3 py-2.5 text-[14px] text-white placeholder:text-white/35 focus-visible:ring-0"
            />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {isStreaming ? (
              <motion.div
                key="stop"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
              >
                <Button
                  onClick={handleStop}
                  size="icon"
                  className="h-11 w-11 rounded-2xl bg-white/10 text-white hover:bg-white/15"
                >
                  <Square className="h-4 w-4" fill="currentColor" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="send"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
              >
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || snapshotLoading}
                  size="icon"
                  className="h-11 w-11 rounded-2xl text-white disabled:opacity-40"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                    boxShadow: "0 10px 22px -6px hsl(var(--primary) / 0.6)",
                  }}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between px-4 pb-1 text-[9.5px] text-white/35">
          <span className="flex items-center gap-1">
            <DatabaseZap className="h-2.5 w-2.5" />
            {snapshot ? `${snapshot.meta.approxTokens.toLocaleString()} ctx tokens` : "…"}
          </span>
          <span>temp {settings.temperature.toFixed(2)} · max {settings.maxTokens}</span>
        </div>
      </div>

      {/* ------------- Sheets ------------- */}

      {/* Threads */}
      <Sheet open={threadsOpen} onOpenChange={setThreadsOpen}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[360px] border-white/10 bg-[hsl(var(--background)/0.92)] p-0 text-white backdrop-blur-xl"
        >
          <SheetHeader className="border-b border-white/10 p-3">
            <SheetTitle className="text-left text-[13px] font-semibold text-white">
              Conversations
            </SheetTitle>
          </SheetHeader>
          <ThreadListBody
            threads={threads}
            activeThreadId={activeThreadId}
            onNew={handleNew}
            onSelect={handleSelect}
            onRename={renameThread}
            onDelete={(id) => {
              removeThread(id);
              if (activeThreadId === id) {
                setActiveThreadId(null);
                setMessages([]);
              }
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Usage panel */}
      <Sheet open={usageOpen} onOpenChange={setUsageOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto border-white/10 bg-[hsl(var(--background)/0.94)] p-0 text-white backdrop-blur-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-white/20" />
          <UsagePanel orgId={orgId} userId={userId} />
        </SheetContent>
      </Sheet>

      {/* Model picker sheet — uses the same ModelPicker trigger list, but
          presented as a bottom sheet for fat-finger comfort. */}
      <Sheet open={modelOpen} onOpenChange={setModelOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[72vh] overflow-y-auto border-white/10 bg-[hsl(var(--background)/0.94)] p-0 text-white backdrop-blur-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span className="text-[13px] font-semibold">Model</span>
            </div>
            <button
              onClick={() => setModelOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 active:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pb-4">
            <ModelPicker
              value={settings.modelId}
              onChange={(id) => {
                updateSettings({ modelId: id });
                setModelOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AISettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

// ============================================================================
// Mobile welcome
// ============================================================================

interface MobileWelcomeProps {
  userName: string | null;
  disabled: boolean;
  onPick: (p: string) => void;
}

const MobileWelcome: React.FC<MobileWelcomeProps> = ({ userName, disabled, onPick }) => {
  return (
    <div className="flex flex-col items-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 120%)",
            boxShadow: "0 18px 36px -12px hsl(var(--primary) / 0.6)",
          }}
        >
          <Sparkles className="h-7 w-7" />
        </motion.div>
        <h2 className="text-[19px] font-bold tracking-tight">
          {userName ? (
            <>
              Hey @{userName.charAt(0).toUpperCase() + userName.slice(1)}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                }}
              >
                {" "}
                — ask anything
              </span>
            </>
          ) : (
            "Ask anything"
          )}
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] text-white/55">
          Live sales, bookings, stations, customers, inventory. Tap a starter
          or just type.
        </p>
      </motion.div>

      <div className="mt-5 grid w-full grid-cols-2 gap-2">
        {QUICK_PROMPTS.map((p, i) => (
          <motion.button
            key={p.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            whileTap={{ scale: 0.97 }}
            disabled={disabled}
            onClick={() => onPick(p.prompt)}
            className="relative flex flex-col items-start gap-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left backdrop-blur-md disabled:opacity-40"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-50 blur-2xl"
              style={{ background: "hsl(var(--primary) / 0.4)" }}
            />
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-white shadow"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 120%)",
              }}
            >
              {p.icon}
            </div>
            <div className="text-[12.5px] font-semibold text-white">{p.label}</div>
            <p className="line-clamp-2 text-[10.5px] leading-snug text-white/50">
              {p.prompt}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ChatAIMobile;
