/**
 * Immersive animated backdrop for the AI page.
 *
 * Three soft-glow "orbs" drift slowly around the viewport, tinted with the
 * currently-active tenant brand variables (`--brand-primary-hex`,
 * `--brand-accent-hex`, `--brand-tertiary-hex`) so the chat inherits the
 * workspace's theme automatically. A fine grain layer and a radial
 * vignette on top sell the "depth" without costing a WebGL context.
 *
 * Performance: 100% CSS + framer-motion transforms → GPU-accelerated, no
 * re-renders on animation frames, and `prefers-reduced-motion` is honoured.
 */
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AmbientBackdropProps {
  /**
   * Opacity multiplier for the whole ambience. Bring it down when the
   * backdrop is sitting behind dense content.
   */
  intensity?: number;
}

export const AmbientBackdrop: React.FC<AmbientBackdropProps> = ({ intensity = 1 }) => {
  const reduce = useReducedMotion();

  // CSS variables let the orbs pick up whichever tenant brand is active.
  // We fall back to Cuephoria defaults when the tenant hasn't customised.
  const primary = "var(--brand-primary-hex, #a855f7)";
  const accent = "var(--brand-accent-hex, #3b82f6)";
  const tertiary = "var(--brand-tertiary-hex, #22d3ee)";

  const baseOrb: React.CSSProperties = {
    position: "absolute",
    borderRadius: "9999px",
    filter: "blur(80px)",
    mixBlendMode: "screen",
    pointerEvents: "none",
    opacity: 0.55 * intensity,
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: 1200 }}
    >
      {/* Deep base gradient — sits under everything */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)",
        }}
      />

      {/* Orb 1 — primary */}
      <motion.div
        style={{
          ...baseOrb,
          width: "52vmax",
          height: "52vmax",
          left: "-10%",
          top: "-20%",
          background: `radial-gradient(circle at 30% 30%, ${primary} 0%, transparent 65%)`,
        }}
        initial={{ x: 0, y: 0, scale: 1 }}
        animate={
          reduce
            ? { x: 0, y: 0 }
            : {
                x: [0, 60, -40, 0],
                y: [0, 40, -20, 0],
                scale: [1, 1.1, 0.95, 1],
              }
        }
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orb 2 — accent */}
      <motion.div
        style={{
          ...baseOrb,
          width: "44vmax",
          height: "44vmax",
          right: "-12%",
          top: "20%",
          background: `radial-gradient(circle at 60% 40%, ${accent} 0%, transparent 65%)`,
          opacity: 0.45 * intensity,
        }}
        initial={{ x: 0, y: 0, scale: 1 }}
        animate={
          reduce
            ? { x: 0, y: 0 }
            : {
                x: [0, -50, 30, 0],
                y: [0, 30, 50, 0],
                scale: [1, 0.95, 1.1, 1],
              }
        }
        transition={{
          duration: 34,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Orb 3 — tertiary / accent-2 */}
      <motion.div
        style={{
          ...baseOrb,
          width: "40vmax",
          height: "40vmax",
          left: "20%",
          bottom: "-20%",
          background: `radial-gradient(circle at 50% 50%, ${tertiary} 0%, transparent 65%)`,
          opacity: 0.35 * intensity,
        }}
        initial={{ x: 0, y: 0, scale: 1 }}
        animate={
          reduce
            ? { x: 0, y: 0 }
            : {
                x: [0, 30, -60, 0],
                y: [0, -40, 20, 0],
                scale: [1, 1.08, 0.92, 1],
              }
        }
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />

      {/* Grain overlay — adds a premium, film-like texture */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
        }}
      />

      {/* Vignette on top so chat text stays readable near the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, rgba(0,0,0,0.35) 0%, transparent 55%)",
        }}
      />
    </div>
  );
};

export default AmbientBackdrop;
