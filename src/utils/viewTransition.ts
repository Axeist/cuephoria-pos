/** Warm the lazy chunk for a route before the user navigates. */
export function prefetchRoute(importFn: () => Promise<unknown>): void {
  void importFn();
}

export const prefetchPOS = () => prefetchRoute(() => import('@/pages/POS'));
export const prefetchStations = () => prefetchRoute(() => import('@/pages/Stations'));
