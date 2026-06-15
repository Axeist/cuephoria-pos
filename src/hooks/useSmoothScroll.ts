import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Landing-only buttery smooth / inertia scroll via Lenis.
 *
 * Mounted ONLY inside the public landing page, so it never affects the
 * authenticated app or dashboard routes (the instance is destroyed when the
 * landing page unmounts). Fully disabled under prefers-reduced-motion and on
 * coarse-pointer / touch devices, where native scrolling feels better.
 *
 * Lenis keeps `window.scrollY` in sync, so framer-motion `useScroll` and native
 * `scrollIntoView` hash deep-links continue to work unchanged.
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}
