import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MOBILE_BREAKPOINT } from "@/context/ViewModeContext";

const positions = new Map<string, number>();

function getScrollContainer(): HTMLElement | null {
  if (typeof window === "undefined") return null;
  if (window.innerWidth >= MOBILE_BREAKPOINT) return null;
  return (
    document.getElementById("app-main") ??
    document.getElementById("cafe-main")
  );
}

/**
 * Restores scroll position when navigating back within the app shell.
 * On mobile, scrolls the main pane; on desktop, uses window scroll.
 */
export function useScrollRestoration(enabled = true) {
  const location = useLocation();
  const prevKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const key = `${location.pathname}${location.search}`;
    const prev = prevKey.current;
    const container = getScrollContainer();

    if (prev) {
      const top = container ? container.scrollTop : window.scrollY;
      positions.set(prev, top);
    }

    const saved = positions.get(key);
    const top = saved ?? 0;

    if (container) {
      container.scrollTop = top;
    } else {
      window.scrollTo({ top, left: 0 });
    }

    prevKey.current = key;
  }, [location.pathname, location.search, enabled]);
}
