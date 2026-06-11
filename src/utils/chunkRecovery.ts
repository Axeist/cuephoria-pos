/**
 * Stale-deploy recovery for Vite code-split chunks.
 *
 * After a new deploy, hashed chunk filenames change. Browsers still running the
 * old index.html request chunks that no longer exist → 404 / dynamic import
 * failure → React error boundary.
 *
 * This module centralizes detection, reload attempts, and global listeners so
 * main.tsx, error boundaries, and lazy() wrappers share one guard (no races).
 */

declare const __APP_BUILD_ID__: string | undefined;

export const CHUNK_RECOVERY_GUARD_KEY = "__cuephoria_chunk_recovery_v2";

const MAX_RELOAD_ATTEMPTS = 3;
const RELOAD_WINDOW_MS = 60_000;
const MIN_RELOAD_INTERVAL_MS = 4_000;

type RecoveryGuard = {
  attempts: number;
  windowStart: number;
  lastReloadAt?: number;
};

function readGuard(): RecoveryGuard {
  try {
    const raw = sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY);
    if (!raw) return { attempts: 0, windowStart: 0 };
    const parsed = JSON.parse(raw) as Partial<RecoveryGuard>;
    return {
      attempts: typeof parsed.attempts === "number" ? parsed.attempts : 0,
      windowStart: typeof parsed.windowStart === "number" ? parsed.windowStart : 0,
    };
  } catch {
    return { attempts: 0, windowStart: 0 };
  }
}

function writeGuard(guard: RecoveryGuard): void {
  try {
    sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, JSON.stringify(guard));
  } catch {
    /* private mode / disabled */
  }
}

export function clearChunkRecoveryGuard(): void {
  try {
    sessionStorage.removeItem(CHUNK_RECOVERY_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

/** Call once after splash / initial boot completes so later chunk errors can reload again. */
export function markAppBootSuccessful(): void {
  clearChunkRecoveryGuard();
  stripRecoveryQueryParam();
}

/** Remove cache-bust query param after a successful boot. */
export function stripRecoveryQueryParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("_v")) return;
    url.searchParams.delete("_v");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next || url.pathname);
  } catch {
    /* ignore */
  }
}

export function getAppBuildId(): string {
  try {
    return typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "dev";
  } catch {
    return "dev";
  }
}

export function isChunkLoadError(reason: unknown): boolean {
  const parts: string[] = [];

  if (typeof reason === "string") {
    parts.push(reason);
  } else if (reason instanceof Error) {
    parts.push(reason.message, reason.name);
  } else if (reason && typeof reason === "object") {
    const r = reason as { message?: unknown; name?: unknown };
    if (typeof r.message === "string") parts.push(r.message);
    if (typeof r.name === "string") parts.push(r.name);
  }

  const m = parts.join(" ").toLowerCase();
  if (!m) return false;

  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("failed to load dynamic import module") ||
    m.includes("failed to load module script") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("chunkloaderror") ||
    m.includes("dynamically imported module") ||
    (m.includes("importing") && m.includes("failed")) ||
    m.includes("module script") ||
    (m.includes("mime type") && m.includes("module"))
  );
}

function isAssetChunkUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return false;
    return (
      parsed.pathname.startsWith("/assets/") &&
      /\.(js|mjs|css)$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Hard-reload with cache bust on the HTML document.
 * Returns true if a reload was initiated.
 */
export function tryChunkRecoveryReload(
  reason: string,
  options?: { force?: boolean },
): boolean {
  const now = Date.now();
  let guard = readGuard();

  if (now - guard.windowStart > RELOAD_WINDOW_MS) {
    guard = { attempts: 0, windowStart: now };
  }

  if (!options?.force && guard.attempts >= MAX_RELOAD_ATTEMPTS) {
    console.warn(
      `[chunk-recover] max reload attempts (${MAX_RELOAD_ATTEMPTS}) reached; ${reason}`,
    );
    return false;
  }

  if (
    !options?.force &&
    guard.lastReloadAt &&
    now - guard.lastReloadAt < MIN_RELOAD_INTERVAL_MS
  ) {
    console.warn(
      `[chunk-recover] suppressed rapid reload (${now - guard.lastReloadAt}ms): ${reason}`,
    );
    return false;
  }

  guard.attempts += 1;
  guard.lastReloadAt = now;
  guard.windowStart = guard.windowStart || now;
  writeGuard(guard);

  console.warn(
    `[chunk-recover] reloading (${guard.attempts}/${MAX_RELOAD_ATTEMPTS}): ${reason}`,
  );

  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(now));
  window.location.replace(url.toString());
  return true;
}

export function setupChunkRecoveryListeners(): void {
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLScriptElement | HTMLLinkElement | null;
      if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
        const src =
          "src" in target && typeof target.src === "string"
            ? target.src
            : "href" in target && typeof target.href === "string"
              ? target.href
              : "";
        if (src && isAssetChunkUrl(src)) {
          tryChunkRecoveryReload(`asset load error: ${src}`);
          return;
        }
      }
      if (event.message && isChunkLoadError(event.message)) {
        tryChunkRecoveryReload(`window error: ${event.message}`);
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (isChunkLoadError(reason)) {
      tryChunkRecoveryReload(`unhandled rejection: ${String(
        reason instanceof Error ? reason.message : reason,
      )}`);
    }
  });
}

/** Fetch latest build id from the server (uncached). */
export async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/build-meta.json?_=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return typeof data.buildId === "string" ? data.buildId : null;
  } catch {
    return null;
  }
}
