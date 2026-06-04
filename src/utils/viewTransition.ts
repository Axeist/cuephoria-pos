import { isChunkLoadError, tryChunkRecoveryReload } from "@/utils/chunkRecovery";

/** Warm the lazy chunk for a route before the user navigates. */
export function prefetchRoute(importFn: () => Promise<unknown>): void {
  void importFn().catch((error) => {
    if (isChunkLoadError(error)) {
      tryChunkRecoveryReload(`prefetch: ${String(error)}`);
    }
  });
}

export const prefetchPOS = () => prefetchRoute(() => import('@/pages/POS'));
export const prefetchStations = () => prefetchRoute(() => import('@/pages/Stations'));

/** Minimum durations so card motion never feels cut off by fast API responses. */
export const SESSION_TRANSITION = {
  startMinMs: 540,
  endMinMs: 620,
  posHandoffMs: 90,
} as const;

export type POSNavigateState = {
  fromSessionEnd?: boolean;
  stationName?: string;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Run work in parallel with a minimum visible duration (for card phase animations). */
export async function runWithMinDuration<T>(work: Promise<T>, minMs: number): Promise<T> {
  const [result] = await Promise.all([work, sleep(minMs)]);
  return result;
}

type NavigateFn = (path: string, options?: { state?: POSNavigateState; replace?: boolean }) => void;

function supportsViewTransition(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/** Stations → POS with optional View Transitions API + scoped CSS handoff. */
export function navigateToPOS(navigate: NavigateFn, state?: POSNavigateState): void {
  prefetchPOS();
  document.body.classList.add('pos-handoff-active');

  const go = () => {
    navigate('/pos', {
      state: { fromSessionEnd: true, ...state },
    });
    window.setTimeout(() => {
      document.body.classList.remove('pos-handoff-active');
    }, 520);
  };

  if (supportsViewTransition()) {
    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(
      go
    );
  } else {
    go();
  }
}

export function isSessionEndNavigation(state: unknown): state is POSNavigateState {
  return Boolean(state && typeof state === 'object' && (state as POSNavigateState).fromSessionEnd);
}
