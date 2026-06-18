import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isChunkLoadError, tryChunkRecoveryReload } from "@/utils/chunkRecovery";

const RETRY_DELAY_MS = 450;

async function loadWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  attempt = 0,
): Promise<{ default: T }> {
  try {
    return await factory();
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;

    if (attempt < 1) {
      await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
      return loadWithRetry(factory, attempt + 1);
    }

    const msg = error instanceof Error ? error.message : String(error);
    if (tryChunkRecoveryReload(`lazy import: ${msg}`)) {
      // Reload in progress — never resolve (avoids flashing error UI).
      await new Promise<never>(() => {});
    }

    throw error;
  }
}

/**
 * Drop-in replacement for React.lazy that retries once, then triggers a
 * one-shot hard reload when a stale chunk 404s after deploy.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => loadWithRetry(factory));
}
