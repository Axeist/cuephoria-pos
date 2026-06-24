import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/components/memberships/membershipMotion';

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white/[0.06] ${className ?? ''}`}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export default function MembershipLoadingShell() {
  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-24 lg:h-28" />
        ))}
      </motion.div>
      <motion.div variants={staggerItem} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Shimmer className="h-44" />
          <Shimmer className="h-32" />
          <Shimmer className="h-56" />
        </div>
        <Shimmer className="h-72 hidden lg:block" />
      </motion.div>
    </motion.div>
  );
}
