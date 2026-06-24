import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeSlideUp } from '@/components/memberships/membershipMotion';

type Accent = 'violet' | 'cyan' | 'emerald' | 'amber';

const ACCENT: Record<
  Accent,
  { border: string; bg: string; icon: string; shadow: string; glow: string }
> = {
  violet: {
    border: 'border-violet-500/25',
    bg: 'from-violet-950/50 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-violet-500/15 border-violet-400/25 text-violet-300',
    shadow: 'shadow-violet-950/40',
    glow: 'bg-violet-500/20',
  },
  cyan: {
    border: 'border-cyan-500/25',
    bg: 'from-cyan-950/40 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-cyan-500/15 border-cyan-400/25 text-cyan-300',
    shadow: 'shadow-cyan-950/35',
    glow: 'bg-cyan-500/20',
  },
  emerald: {
    border: 'border-emerald-500/25',
    bg: 'from-emerald-950/35 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300',
    shadow: 'shadow-emerald-950/30',
    glow: 'bg-emerald-500/20',
  },
  amber: {
    border: 'border-amber-500/25',
    bg: 'from-amber-950/30 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-amber-500/15 border-amber-400/25 text-amber-300',
    shadow: 'shadow-amber-950/30',
    glow: 'bg-amber-500/20',
  },
};

type MembershipPanelShellProps = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  accent?: Accent;
  children: React.ReactNode;
  className?: string;
  step?: number;
  layoutKey?: string;
};

export default function MembershipPanelShell({
  title,
  description,
  icon,
  accent = 'violet',
  children,
  className,
  step,
  layoutKey,
}: MembershipPanelShellProps) {
  const a = ACCENT[accent];

  return (
    <motion.div
      key={layoutKey}
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-6 space-y-5 shadow-lg transition-shadow duration-500 hover:shadow-xl',
        a.border,
        a.bg,
        a.shadow,
        className,
      )}
    >
      <motion.div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl opacity-60',
          a.glow,
        )}
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-white/[0.03] to-transparent"
      />
      <div className="relative flex items-start gap-3">
        <motion.div
          className={cn('rounded-xl border p-2.5 shrink-0', a.icon)}
          whileHover={{ scale: 1.05, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {icon}
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {step != null && (
              <motion.span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/90 ring-1 ring-white/15"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.1 }}
              >
                {step}
              </motion.span>
            )}
            <h3 className="font-semibold text-white text-lg">{title}</h3>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
