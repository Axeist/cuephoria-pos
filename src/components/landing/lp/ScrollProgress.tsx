import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Thin holographic scroll-progress bar pinned to the very top of the page.
 * Purely decorative; sits above the floating header.
 */
const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, #7c3aed 0%, #d946ef 40%, #22d3ee 80%, #7c3aed 100%)",
        boxShadow: "0 0 12px rgba(168,85,247,0.7)",
      }}
    />
  );
};

export default ScrollProgress;
