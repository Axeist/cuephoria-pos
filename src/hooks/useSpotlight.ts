import { useEffect, useRef } from "react";

/**
 * Cursor spotlight: writes the pointer position to `--lp-mx` / `--lp-my`
 * CSS variables on the element so the `.lp-spotlight` glow follows the cursor.
 * rAF-throttled and writes CSS vars only (no React state) for INP safety.
 */
export function useSpotlight<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let rafId = 0;
    let nextX = 50;
    let nextY = 50;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      nextX = ((e.clientX - r.left) / r.width) * 100;
      nextY = ((e.clientY - r.top) / r.height) * 100;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          el.style.setProperty("--lp-mx", `${nextX}%`);
          el.style.setProperty("--lp-my", `${nextY}%`);
          rafId = 0;
        });
      }
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      el.removeEventListener("mousemove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return ref;
}
