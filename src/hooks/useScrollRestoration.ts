import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const positions = new Map<string, number>();

/**
 * Restores window scroll position when navigating back within the app shell.
 * Forward navigations start at the top for a native-app feel.
 */
export function useScrollRestoration(enabled = true) {
  const location = useLocation();
  const prevKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const key = `${location.pathname}${location.search}`;
    const prev = prevKey.current;

    if (prev) {
      positions.set(prev, window.scrollY);
    }

    const saved = positions.get(key);
    if (saved !== undefined) {
      window.scrollTo({ top: saved, left: 0 });
    } else {
      window.scrollTo({ top: 0, left: 0 });
    }

    prevKey.current = key;
  }, [location.pathname, location.search, enabled]);
}
