import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useViewMode } from "@/context/ViewModeContext";

const positions = new Map<string, number>();

function getScrollContainer(isMobile: boolean): HTMLElement | null {
  if (typeof window === "undefined" || !isMobile) return null;
  return document.getElementById("app-main");
}

/**
 * Restores scroll position when navigating back within the staff app shell.
 * On mobile, scrolls #app-main; on desktop, uses window scroll.
 */
export function useScrollRestoration(enabled = true) {
  const location = useLocation();
  const { isMobile } = useViewMode();
  const prevKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const key = `${location.pathname}${location.search}`;
    const prev = prevKey.current;
    const container = getScrollContainer(isMobile);

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
  }, [location.pathname, location.search, enabled, isMobile]);
}
