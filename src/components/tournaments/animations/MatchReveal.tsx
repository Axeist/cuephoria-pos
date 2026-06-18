import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTournamentMotion } from './TournamentMotionProvider';

export function MatchReveal({
  live,
  children,
  className,
}: {
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { reduced, duration } = useTournamentMotion();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
      className={cn(
        'rounded-xl border bg-card/40 backdrop-blur-sm transition-shadow',
        live && 'border-primary/50 shadow-[0_0_24px_-4px_var(--brand-primary-hex)]',
        className,
      )}
    >
      {live && !reduced && (
        <motion.span
          className="absolute -inset-px rounded-xl border border-primary/30"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
