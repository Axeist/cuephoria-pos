import React from 'react';
import { motion } from 'framer-motion';
import { useTournamentMotion } from './TournamentMotionProvider';

export function AmbientTournamentBg() {
  const { reduced } = useTournamentMotion();

  if (reduced) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-primary/5" />
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--brand-primary-hex, #9b87f5)' }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-24 h-80 w-80 rounded-full blur-3xl opacity-25"
        style={{ background: 'var(--brand-accent-hex, #7c3aed)' }}
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
