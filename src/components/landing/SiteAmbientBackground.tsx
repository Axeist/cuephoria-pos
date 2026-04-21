import { lazy, Suspense } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const AmbientScene3D = lazy(() => import("@/components/landing/AmbientScene3D"));

interface SiteAmbientBackgroundProps {
  /** Apply subtle parallax + opacity response to page scroll. Used on landing. */
  parallax?: boolean;
}

/**
 * Shared site-wide animated background.
 *
 * Kept identical between the landing page and the auth pages (login / signup)
 * so the visual theme feels seamless across the whole public surface.
 *
 * Stack (back → front):
 *  1. Deep multi-stop radial + linear gradient base (violet / fuchsia / blue)
 *  2. Film-grain noise
 *  3. Lazy 3D galaxy field (AmbientScene3D)
 *  4. Vignette
 *
 * All layers are pointer-events:none and fixed to the viewport.
 */
const SiteAmbientBackground: React.FC<SiteAmbientBackgroundProps> = ({
  parallax = false,
}) => {
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll();

  const ambientY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const ambientOpacity = useTransform(
    scrollYProgress,
    [0, 0.05, 0.95, 1],
    [0, 0.9, 0.9, 0.75],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 10% 0%, rgba(124,58,237,0.22), transparent 60%)," +
            "radial-gradient(900px 700px at 90% 15%, rgba(236,72,153,0.14), transparent 60%)," +
            "radial-gradient(1200px 900px at 50% 100%, rgba(59,130,246,0.12), transparent 60%)," +
            "linear-gradient(180deg, #07030f 0%, #0a0414 55%, #07030f 100%)",
        }}
      />

      {/* Film-grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px",
        }}
      />

      {/* 3D galaxy field (parallax on landing) */}
      {parallax ? (
        <motion.div
          className="absolute inset-0"
          style={{ y: ambientY, opacity: ambientOpacity }}
        >
          <Suspense fallback={null}>
            <AmbientScene3D mobile={isMobile} />
          </Suspense>
        </motion.div>
      ) : (
        <div className="absolute inset-0 opacity-90">
          <Suspense fallback={null}>
            <AmbientScene3D mobile={isMobile} />
          </Suspense>
        </div>
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(7,3,15,0.5) 100%)",
        }}
      />
    </div>
  );
};

export default SiteAmbientBackground;
