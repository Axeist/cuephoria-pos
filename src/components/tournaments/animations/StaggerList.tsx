import React from 'react';
import { motion } from 'framer-motion';
import { useTournamentMotion } from './TournamentMotionProvider';

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { stagger, duration, reduced } = useTournamentMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduced ? 0 : stagger },
        },
      }}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: reduced ? 0 : 12 },
              visible: { opacity: 1, y: 0, transition: { duration } },
            }}
          >
            {child}
          </motion.div>
        ) : (
          child
        ),
      )}
    </motion.div>
  );
}
