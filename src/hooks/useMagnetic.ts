import { useEffect, useRef } from "react";

/**
 * Magnetic hover: the element eases toward the cursor while hovered, then
 * springs back. Pure DOM transform mutation inside a rAF loop (no React state)
 * to avoid re-renders — INP-safe, matching the landing's TiltCard pattern.
 *
 * Returns a ref to attach to the target element.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(strength = 0.35) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let rafId = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let active = false;

    const onMove = (e: MouseEvent) => {
      active = true;
      const r = el.getBoundingClientRect();
      target.x = (e.clientX - (r.left + r.width / 2)) * strength;
      target.y = (e.clientY - (r.top + r.height / 2)) * strength;
    };
    const onLeave = () => {
      active = false;
      target.x = 0;
      target.y = 0;
    };

    const loop = () => {
      current.x += (target.x - current.x) * 0.15;
      current.y += (target.y - current.y) * 0.15;
      const atRest =
        !active && Math.abs(current.x) < 0.1 && Math.abs(current.y) < 0.1;
      if (!atRest) {
        el.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
      } else {
        el.style.transform = "";
      }
      rafId = requestAnimationFrame(loop);
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });
    rafId = requestAnimationFrame(loop);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [strength]);

  return ref;
}
