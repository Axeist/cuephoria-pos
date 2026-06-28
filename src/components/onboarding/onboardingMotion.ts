import type { Variants, Transition } from "framer-motion";

export const stepEnter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const stepTransition: Transition = { duration: 0.25, ease: "easeOut" };

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 26 },
  },
};

export const subStepSlide = (direction: 1 | -1) => ({
  initial: { opacity: 0, x: direction * 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: direction * -24 },
});

export const subStepTransition: Transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

export const scalePop: Variants = {
  hidden: { scale: 0.85, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 22 },
  },
};

export const pulseRing: Variants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.08, 1],
    opacity: [0.6, 0.3, 0.6],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};
