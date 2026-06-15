import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms before the element reveals. */
  delay?: number;
  /** Render as a different element (default div). */
  as?: "div" | "li" | "section" | "span";
  className?: string;
  /** Reveal only once (default true). */
  once?: boolean;
}

/**
 * Scroll-reveal wrapper. Adds `data-shown` once the element scrolls into view;
 * the actual fade/slide/blur transition lives in the `.lp-reveal` CSS class
 * (and is fully disabled under prefers-reduced-motion).
 *
 * Uses a single IntersectionObserver per element — no scroll listeners, no
 * per-frame React state — to stay INP-friendly on the landing page.
 */
const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  as = "div",
  className = "",
  once = true,
}) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setShown(false);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const Tag = as as keyof JSX.IntrinsicElements;

  return (
    <Tag
      // @ts-expect-error — ref typing across polymorphic tag
      ref={ref}
      className={`lp-reveal ${className}`}
      data-shown={shown ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
