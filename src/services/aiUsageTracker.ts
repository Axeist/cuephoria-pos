/**
 * AI usage + spend tracker (per-tenant, per-user).
 *
 * Every successful chat completion feeds us a `usage` payload (prompt /
 * completion / total tokens). We multiply those against the model's published
 * $/1M price to get a running spend estimate that the user can see in-app.
 *
 * Storage: localStorage, keyed by `orgId:userId` so different tenants and
 * different operators see only their own numbers. We keep:
 *   - a rolling 90-day window of per-day totals (for charts)
 *   - per-model totals (for the "biggest spenders" widget)
 *   - an all-time grand total
 *
 * USD prices are converted to INR at a fixed rate the user can override
 * via `VITE_AI_INR_PER_USD` (defaults to 83). No backend call — this is a
 * best-effort cost estimate, not a billing ledger.
 */
import { useCallback, useEffect, useState } from "react";
import { AI_MODELS, getModelById } from "./openRouterService";

const STORAGE_PREFIX = "cuephoria.ai.usage.v1";
const UPDATE_EVENT = "cuephoria:ai-usage";
const MAX_DAYS = 90;

const INR_PER_USD = (() => {
  const raw = (import.meta.env.VITE_AI_INR_PER_USD as string | undefined) ?? "";
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 83;
})();

/** Stats for a single day (YYYY-MM-DD). */
export interface DayBucket {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
  costUsd: number;
}

/** Stats for a specific model. */
export interface ModelBucket {
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
  costUsd: number;
}

export interface UsageSnapshot {
  /** Grand total across all history this tenant+user has retained. */
  total: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requests: number;
    costUsd: number;
  };
  /** Per-day history (oldest → newest, max 90 days). */
  byDay: DayBucket[];
  /** Per-model totals. */
  byModel: ModelBucket[];
  /** ISO timestamp when this store was first created (for "since" labels). */
  createdAt: string;
  /** ISO timestamp of the most recent increment. */
  updatedAt: string;
}

/** Empty store factory — used for first-use and for reset. */
function emptySnapshot(): UsageSnapshot {
  const now = new Date().toISOString();
  return {
    total: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requests: 0,
      costUsd: 0,
    },
    byDay: [],
    byModel: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Treat an id/slug as "present" only if it's a non-empty string. We
 * refuse to key storage on null/undefined/"" because that silently
 * collides across tenants inside the `_:_` bucket — which is exactly
 * the cross-tenant leakage we're fixing here.
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

function keyFor(orgId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${orgId}:${userId}`;
}

function safeParse(raw: string | null): UsageSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Minimal shape check — fall back to fresh snapshot if anything is off.
    if (!parsed.total || !Array.isArray(parsed.byDay) || !Array.isArray(parsed.byModel)) {
      return null;
    }
    return parsed as UsageSnapshot;
  } catch {
    return null;
  }
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Compute USD cost for a completion using the model's published rate card.
 * Returns 0 for models we don't have pricing for.
 */
export function estimateCostUsd(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const m = getModelById(modelId);
  if (!m) return 0;
  const inCost = (promptTokens / 1_000_000) * m.inputPer1M;
  const outCost = (completionTokens / 1_000_000) * m.outputPer1M;
  return inCost + outCost;
}

export function usdToInr(usd: number): number {
  return usd * INR_PER_USD;
}

export function getInrPerUsd(): number {
  return INR_PER_USD;
}

/** Synchronous read — useful outside React. */
export function getUsage(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): UsageSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  if (!isScoped(orgId, userId)) return emptySnapshot();
  return safeParse(window.localStorage.getItem(keyFor(orgId, userId))) ?? emptySnapshot();
}

/**
 * Record one completion's usage. Called after each successful reply.
 * Silently no-ops if we're missing token counts (free-tier models sometimes
 * don't report them).
 */
export function recordUsage(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  args: {
    modelId: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  },
): UsageSnapshot | null {
  if (typeof window === "undefined") return null;
  if (!isScoped(orgId, userId)) return null;
  const prompt = Math.max(0, args.promptTokens ?? 0);
  const completion = Math.max(0, args.completionTokens ?? 0);
  const total = Math.max(0, args.totalTokens ?? prompt + completion);
  if (prompt === 0 && completion === 0 && total === 0) return null;

  const key = keyFor(orgId, userId);
  const current = safeParse(window.localStorage.getItem(key)) ?? emptySnapshot();

  const costUsd = estimateCostUsd(args.modelId, prompt, completion);
  const today = todayKey();

  // ---- Grand total ----
  current.total.promptTokens += prompt;
  current.total.completionTokens += completion;
  current.total.totalTokens += total;
  current.total.requests += 1;
  current.total.costUsd += costUsd;

  // ---- Per-day ----
  let day = current.byDay.find((d) => d.date === today);
  if (!day) {
    day = {
      date: today,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requests: 0,
      costUsd: 0,
    };
    current.byDay.push(day);
  }
  day.promptTokens += prompt;
  day.completionTokens += completion;
  day.totalTokens += total;
  day.requests += 1;
  day.costUsd += costUsd;

  // Trim to last N days to prevent unbounded growth.
  current.byDay.sort((a, b) => a.date.localeCompare(b.date));
  if (current.byDay.length > MAX_DAYS) {
    current.byDay = current.byDay.slice(-MAX_DAYS);
  }

  // ---- Per-model ----
  let modelBucket = current.byModel.find((m) => m.modelId === args.modelId);
  if (!modelBucket) {
    modelBucket = {
      modelId: args.modelId,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requests: 0,
      costUsd: 0,
    };
    current.byModel.push(modelBucket);
  }
  modelBucket.promptTokens += prompt;
  modelBucket.completionTokens += completion;
  modelBucket.totalTokens += total;
  modelBucket.requests += 1;
  modelBucket.costUsd += costUsd;

  current.updatedAt = new Date().toISOString();

  try {
    window.localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { key } }));
  } catch {
    /* quota or privacy mode — ignore */
  }

  return current;
}

export function resetUsage(
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
 * React hook. Returns the live usage snapshot plus helpers. Auto-refreshes
 * on cross-tab `storage` events and local `recordUsage` calls.
 */
export function useAIUsage(
  orgId: string | null | undefined,
  userId: string | null | undefined,
) {
  const [snapshot, setSnapshot] = useState<UsageSnapshot>(() => getUsage(orgId, userId));

  useEffect(() => {
    setSnapshot(getUsage(orgId, userId));
    if (!isScoped(orgId, userId)) return;
    const ourKey = keyFor(orgId, userId);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key?: string } | undefined;
      if (!detail || detail.key === ourKey) {
        setSnapshot(getUsage(orgId, userId));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === ourKey) setSnapshot(getUsage(orgId, userId));
    };
    window.addEventListener(UPDATE_EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UPDATE_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [orgId, userId]);

  const record = useCallback(
    (args: { modelId: string; promptTokens?: number; completionTokens?: number; totalTokens?: number }) => {
      const next = recordUsage(orgId, userId, args);
      if (next) setSnapshot(next);
    },
    [orgId, userId],
  );

  const reset = useCallback(() => {
    resetUsage(orgId, userId);
    setSnapshot(emptySnapshot());
  }, [orgId, userId]);

  return { snapshot, record, reset };
}

/**
 * Pre-compute a handful of derived stats that every widget needs. Keeps the
 * heavy work out of render loops.
 */
export interface UsageDerived {
  totalCostUsd: number;
  totalCostInr: number;
  totalTokens: number;
  totalRequests: number;
  /** Today's cost in USD. */
  todayCostUsd: number;
  todayTokens: number;
  todayRequests: number;
  /** 7-day rolling cost in USD. */
  weekCostUsd: number;
  weekTokens: number;
  weekRequests: number;
  /** Most used model (by requests). */
  topModelId: string | null;
  /** Sparkline data — last 14 days of costUsd, newest on the right. */
  costSparkline: { date: string; costUsd: number }[];
  /** For the model breakdown widget. */
  models: Array<ModelBucket & { label: string; provider: string; shareCost: number }>;
}

export function deriveUsage(snapshot: UsageSnapshot): UsageDerived {
  const today = todayKey();

  // Build a 14-day contiguous sparkline (so the chart doesn't collapse
  // over days with zero usage).
  const spark: { date: string; costUsd: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hit = snapshot.byDay.find((b) => b.date === key);
    spark.push({ date: key, costUsd: hit?.costUsd ?? 0 });
  }

  const todayBucket = snapshot.byDay.find((b) => b.date === today);

  // 7-day window
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
  const weekBuckets = snapshot.byDay.filter((b) => b.date >= weekKey);
  const weekCostUsd = weekBuckets.reduce((s, b) => s + b.costUsd, 0);
  const weekTokens = weekBuckets.reduce((s, b) => s + b.totalTokens, 0);
  const weekRequests = weekBuckets.reduce((s, b) => s + b.requests, 0);

  const sortedModels = [...snapshot.byModel].sort((a, b) => b.costUsd - a.costUsd);
  const totalCostForShare = sortedModels.reduce((s, m) => s + m.costUsd, 0);
  const decorated = sortedModels.map((m) => {
    const meta = AI_MODELS.find((x) => x.id === m.modelId);
    return {
      ...m,
      label: meta?.label ?? m.modelId,
      provider: meta?.provider ?? "Unknown",
      shareCost: totalCostForShare > 0 ? m.costUsd / totalCostForShare : 0,
    };
  });

  const topByRequests = [...snapshot.byModel].sort((a, b) => b.requests - a.requests)[0];

  return {
    totalCostUsd: snapshot.total.costUsd,
    totalCostInr: usdToInr(snapshot.total.costUsd),
    totalTokens: snapshot.total.totalTokens,
    totalRequests: snapshot.total.requests,
    todayCostUsd: todayBucket?.costUsd ?? 0,
    todayTokens: todayBucket?.totalTokens ?? 0,
    todayRequests: todayBucket?.requests ?? 0,
    weekCostUsd,
    weekTokens,
    weekRequests,
    topModelId: topByRequests?.modelId ?? null,
    costSparkline: spark,
    models: decorated,
  };
}
