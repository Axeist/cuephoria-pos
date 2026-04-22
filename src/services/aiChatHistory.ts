/**
 * Per-tenant AI chat thread storage.
 *
 * Each (organization, user) pair gets its own list of threads, so a staff
 * member who works across multiple venues never sees someone else's
 * conversations. Storage is client-side only (localStorage) — chats rarely
 * matter after a few days and shipping them to the server would just be a
 * privacy liability.
 *
 * Storage key: `cuephoria.ai.threads.v1:<orgId>:<userId>`
 *
 * A thread holds:
 *   - id         — random local id
 *   - title      — auto-generated from the first user message (can be renamed)
 *   - messages   — full chat transcript (role + content + timestamp)
 *   - modelId    — model in use when the thread was last active
 *   - createdAt  — ISO
 *   - updatedAt  — ISO (drives sort order)
 *
 * We cap at 50 threads per (org,user) and evict the oldest updatedAt first.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "cuephoria.ai.threads.v1";
const LEGACY_ORPHAN_KEY_PREFIX = `${STORAGE_PREFIX}:_:`;
const MIGRATION_FLAG_PREFIX = "cuephoria.ai.threads.migrated.v1";
const UPDATE_EVENT = "cuephoria:ai-threads";
const MAX_THREADS = 50;

/**
 * Treat an id/slug as "present" only if it's a non-empty string. We
 * explicitly refuse to key storage on null/undefined/"" because that
 * silently collides across tenants inside the `_:_` bucket — which is
 * exactly the cross-tenant leakage this file is trying to prevent.
 */
function isScoped(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): orgId is string {
  return (
    typeof orgId === "string" &&
    orgId.length > 0 &&
    typeof userId === "string" &&
    userId.length > 0
  );
}

export type ThreadRole = "user" | "assistant";

export interface ThreadMessage {
  id: string;
  role: ThreadRole;
  content: string;
  /** ISO timestamp. */
  timestamp: string;
  /** True if generation errored out — kept so the UI can style it. */
  error?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: ThreadMessage[];
}

function keyFor(orgId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${orgId}:${userId}`;
}

/**
 * One-shot migration of legacy orphan-bucket threads.
 *
 * Prior versions of this module used `${STORAGE_PREFIX}:_:_` (or
 * `:_:<userId>`) as a fallback when the organization context hadn't
 * finished loading yet. That bucket is visible to every tenant the
 * user later opens — exactly the cross-tenant leak we're fixing here.
 *
 * Strategy: the first tenant a user visits after this fix lands adopts
 * any orphan threads (iff its own bucket is empty). A one-shot flag
 * prevents the same orphans from getting adopted twice. After this
 * runs once per (orgId, userId) pair the orphan bucket is wiped.
 */
function migrateOrphanBucketIfNeeded(orgId: string, userId: string): void {
  if (typeof window === "undefined") return;
  const flagKey = `${MIGRATION_FLAG_PREFIX}:${orgId}:${userId}`;
  try {
    if (window.localStorage.getItem(flagKey)) return;
    window.localStorage.setItem(flagKey, new Date().toISOString());

    const orphanUserKey = `${LEGACY_ORPHAN_KEY_PREFIX}${userId}`;
    const orphanBothKey = `${LEGACY_ORPHAN_KEY_PREFIX}_`;
    const orphanRaw =
      window.localStorage.getItem(orphanUserKey) ??
      window.localStorage.getItem(orphanBothKey);
    if (!orphanRaw) return;

    const orphans = safeParse(orphanRaw);
    if (orphans.length === 0) {
      window.localStorage.removeItem(orphanUserKey);
      window.localStorage.removeItem(orphanBothKey);
      return;
    }

    const ownKey = keyFor(orgId, userId);
    const own = safeParse(window.localStorage.getItem(ownKey));

    // Only adopt if the current tenant has no chats of its own — we
    // can't know which tenant the orphan chats really belong to, so
    // the safest heuristic is "first non-empty tenant wins". If the
    // target already has chats, leave it alone and just drop the
    // orphan bucket so it stops leaking.
    if (own.length === 0) {
      const merged = orphans.map((t) => ({ ...t }));
      merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      window.localStorage.setItem(
        ownKey,
        JSON.stringify(merged.slice(0, MAX_THREADS)),
      );
    }

    window.localStorage.removeItem(orphanUserKey);
    window.localStorage.removeItem(orphanBothKey);
  } catch {
    /* storage unavailable or quota — safe to ignore */
  }
}

function safeParse(raw: string | null): ChatThread[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Minimal validation: discard anything missing id/messages.
    return parsed.filter(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        Array.isArray(t.messages),
    ) as ChatThread[];
  } catch {
    return [];
  }
}

function writeThreads(key: string, threads: ChatThread[]) {
  // Enforce cap before writing. Newest first by updatedAt.
  threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const trimmed = threads.slice(0, MAX_THREADS);
  try {
    window.localStorage.setItem(key, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { key } }));
  } catch {
    /* ignore quota errors */
  }
}

export function getThreads(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): ChatThread[] {
  if (typeof window === "undefined") return [];
  if (!isScoped(orgId, userId)) return [];
  migrateOrphanBucketIfNeeded(orgId, userId);
  return safeParse(window.localStorage.getItem(keyFor(orgId, userId)));
}

export function getThread(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  threadId: string,
): ChatThread | null {
  return getThreads(orgId, userId).find((t) => t.id === threadId) ?? null;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Build a human-friendly title from a user prompt. */
function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return "New chat";
  // Keep first sentence or first ~55 chars, whichever is shorter.
  const firstStop = trimmed.search(/[.?!]\s/);
  const candidate =
    firstStop !== -1 && firstStop < 55 ? trimmed.slice(0, firstStop + 1) : trimmed;
  return candidate.length > 58 ? candidate.slice(0, 55).trimEnd() + "…" : candidate;
}

export function createThread(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  args: { modelId: string; firstMessage?: ThreadMessage },
): ChatThread {
  const now = new Date().toISOString();
  const thread: ChatThread = {
    id: makeId(),
    title: args.firstMessage ? deriveTitle(args.firstMessage.content) : "New chat",
    modelId: args.modelId,
    createdAt: now,
    updatedAt: now,
    messages: args.firstMessage ? [args.firstMessage] : [],
  };
  // Silently refuse to persist if we don't yet know which tenant this
  // belongs to — the caller is expected to retry once context loads.
  if (!isScoped(orgId, userId)) return thread;
  const key = keyFor(orgId, userId);
  const all = getThreads(orgId, userId);
  all.unshift(thread);
  writeThreads(key, all);
  return thread;
}

/** Upsert — creates the thread if it doesn't exist, else patches it. */
export function upsertThread(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  thread: ChatThread,
): void {
  if (typeof window === "undefined") return;
  if (!isScoped(orgId, userId)) return;
  const key = keyFor(orgId, userId);
  const all = getThreads(orgId, userId);
  const idx = all.findIndex((t) => t.id === thread.id);
  if (idx >= 0) {
    all[idx] = thread;
  } else {
    all.unshift(thread);
  }
  writeThreads(key, all);
}

/**
 * Replace the full message list on an existing thread and refresh
 * updatedAt. If the current title is still "New chat", we auto-title from
 * the first user message.
 */
export function saveThreadMessages(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  threadId: string,
  messages: ThreadMessage[],
  modelId?: string,
): void {
  if (typeof window === "undefined") return;
  if (!isScoped(orgId, userId)) return;
  const key = keyFor(orgId, userId);
  const all = getThreads(orgId, userId);
  const idx = all.findIndex((t) => t.id === threadId);
  if (idx < 0) return;

  const existing = all[idx];
  const firstUser = messages.find((m) => m.role === "user");
  const title =
    existing.title === "New chat" && firstUser ? deriveTitle(firstUser.content) : existing.title;

  all[idx] = {
    ...existing,
    title,
    modelId: modelId ?? existing.modelId,
    messages,
    updatedAt: new Date().toISOString(),
  };
  writeThreads(key, all);
}

export function renameThread(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  threadId: string,
  title: string,
): void {
  if (typeof window === "undefined") return;
  if (!isScoped(orgId, userId)) return;
  const key = keyFor(orgId, userId);
  const all = getThreads(orgId, userId);
  const idx = all.findIndex((t) => t.id === threadId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], title: title.trim() || "New chat" };
  writeThreads(key, all);
}

export function deleteThread(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  threadId: string,
): void {
  if (typeof window === "undefined") return;
  if (!isScoped(orgId, userId)) return;
  const key = keyFor(orgId, userId);
  const all = getThreads(orgId, userId).filter((t) => t.id !== threadId);
  writeThreads(key, all);
}

export function clearAllThreads(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): void {
  if (typeof window === "undefined") return;
  if (!isScoped(orgId, userId)) return;
  const key = keyFor(orgId, userId);
  window.localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { key } }));
}

/**
 * React hook. Owns the in-memory thread list + `activeThreadId` for the
 * currently-open conversation. The chat page calls `persist()` after every
 * streaming turn to keep storage in sync.
 */
export function useChatThreads(
  orgId: string | null | undefined,
  userId: string | null | undefined,
) {
  const [threads, setThreads] = useState<ChatThread[]>(() => getThreads(orgId, userId));

  useEffect(() => {
    setThreads(getThreads(orgId, userId));
    if (!isScoped(orgId, userId)) return;
    const ourKey = keyFor(orgId, userId);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key?: string } | undefined;
      if (!detail || detail.key === ourKey) setThreads(getThreads(orgId, userId));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === ourKey) setThreads(getThreads(orgId, userId));
    };
    window.addEventListener(UPDATE_EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UPDATE_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [orgId, userId]);

  const create = useCallback(
    (args: { modelId: string; firstMessage?: ThreadMessage }) => {
      const t = createThread(orgId, userId, args);
      setThreads(getThreads(orgId, userId));
      return t;
    },
    [orgId, userId],
  );

  const save = useCallback(
    (threadId: string, messages: ThreadMessage[], modelId?: string) => {
      saveThreadMessages(orgId, userId, threadId, messages, modelId);
      setThreads(getThreads(orgId, userId));
    },
    [orgId, userId],
  );

  const remove = useCallback(
    (threadId: string) => {
      deleteThread(orgId, userId, threadId);
      setThreads(getThreads(orgId, userId));
    },
    [orgId, userId],
  );

  const rename = useCallback(
    (threadId: string, title: string) => {
      renameThread(orgId, userId, threadId, title);
      setThreads(getThreads(orgId, userId));
    },
    [orgId, userId],
  );

  const clear = useCallback(() => {
    clearAllThreads(orgId, userId);
    setThreads([]);
  }, [orgId, userId]);

  const byUpdated = useMemo(
    () => [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [threads],
  );

  return { threads: byUpdated, create, save, remove, rename, clear };
}

export function makeMessageId(): string {
  return makeId();
}
