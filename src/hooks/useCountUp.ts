import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  /** Target value to count to. */
  to: number;
  /** Duration in ms. */
  duration?: number;
  /** Decimal places to keep. */
  decimals?: number;
  /** Start the count only when true (e.g. on scroll into view). */
  start?: boolean;
}

/**
 * Animated number count-up driven by requestAnimationFrame.
 * Respects prefers-reduced-motion (jumps straight to the target).
 */
export function useCountUp({
  to,
  duration = 1600,
  decimals = 0,
  start = true,
}: UseCountUpOptions): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!start) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }

    const startTime = performance.now();
    const factor = Math.pow(10, decimals);

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(to * eased * factor) / factor);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to, duration, decimals, start]);

  return value;
}
