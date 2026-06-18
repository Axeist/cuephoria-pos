/**
 * Three-dot "is typing" indicator. Uses framer-motion so each dot pulses
 * on its own beat and gets brand-tinted via the shadcn `--primary` var.
 */
import React from "react";
import { motion } from "framer-motion";

interface TypingIndicatorProps {
  /** Short label shown next to the dots ("Thinking", "Crunching numbers", …). */
  label?: string;
}

const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "9999px",
  background: "hsl(var(--primary))",
  boxShadow: "0 0 10px hsl(var(--primary) / 0.8)",
};

const dotVariants = {
  initial: { y: 0, opacity: 0.35, scale: 0.85 },
  animate: { y: [0, -4, 0], opacity: [0.35, 1, 0.35], scale: [0.85, 1, 0.85] },
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ label = "Thinking" }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={dot}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-white/55 tracking-wide">
        {label}
        <span className="inline-block w-4 text-left">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="inline-block"
          >
            …
          </motion.span>
        </span>
      </span>
    </div>
  );
};

export default TypingIndicator;
