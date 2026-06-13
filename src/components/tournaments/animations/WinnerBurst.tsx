import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useTournamentMotion } from './TournamentMotionProvider';

export function WinnerBurst({
  show,
  winnerName,
  subtitle,
  className,
}: {
  show: boolean;
  winnerName: string;
  subtitle?: string;
  className?: string;
}) {
  const { reduced, duration } = useTournamentMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 via-emerald-900/20 to-transparent p-6 text-center ${className ?? ''}`}
          initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration }}
        >
          {!reduced && (
            <div className="pointer-events-none absolute inset-0">
              {[...Array(12)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-emerald-300/80"
                  style={{ left: `${10 + (i * 7) % 80}%`, top: `${15 + (i * 11) % 60}%` }}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: [-20, -60] }}
                  transition={{ duration: 1.2, delay: i * 0.06, repeat: Infinity, repeatDelay: 2 }}
                />
              ))}
            </div>
          )}
          <motion.div
            initial={{ rotate: reduced ? 0 : -8, scale: reduced ? 1 : 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            <Trophy className="h-12 w-12 text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]" />
            <p className="text-2xl font-bold text-white">{winnerName}</p>
            {subtitle && <p className="text-sm text-emerald-200/80">{subtitle}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
