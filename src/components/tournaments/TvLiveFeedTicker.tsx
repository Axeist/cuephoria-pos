import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export function TvLiveFeedTicker({
  items,
  reduced,
  accent,
}: {
  items: { id: string; label: string; value: string }[];
  reduced: boolean;
  accent: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/55 overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-1 border-b border-white/10"
        style={{ backgroundColor: `${accent}18` }}
      >
        <Zap className="h-3 w-3" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/60">Live feed</span>
      </div>
      {!reduced ? (
        <motion.div
          className="flex whitespace-nowrap py-2 text-sm"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        >
          {[...items, ...items].map((item, i) => (
            <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 px-8 text-white/70">
              <span className="font-semibold text-white">{item.label}</span>
              <span className="font-mono" style={{ color: accent }}>
                {item.value}
              </span>
              <span className="text-white/20">•</span>
            </span>
          ))}
        </motion.div>
      ) : (
        <div className="py-2 px-4 text-sm text-white/60 truncate">
          {items[0].label} · {items[0].value}
        </div>
      )}
    </div>
  );
}
