import React from 'react';
import { cn } from '@/lib/utils';

type Accent = 'violet' | 'cyan' | 'emerald' | 'amber';

const ACCENT: Record<
  Accent,
  { border: string; bg: string; icon: string; shadow: string }
> = {
  violet: {
    border: 'border-violet-500/25',
    bg: 'from-violet-950/50 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-violet-500/15 border-violet-400/25 text-violet-300',
    shadow: 'shadow-violet-950/40',
  },
  cyan: {
    border: 'border-cyan-500/25',
    bg: 'from-cyan-950/40 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-cyan-500/15 border-cyan-400/25 text-cyan-300',
    shadow: 'shadow-cyan-950/35',
  },
  emerald: {
    border: 'border-emerald-500/25',
    bg: 'from-emerald-950/35 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300',
    shadow: 'shadow-emerald-950/30',
  },
  amber: {
    border: 'border-amber-500/25',
    bg: 'from-amber-950/30 via-[#0c0a14] to-[#08060f]',
    icon: 'bg-amber-500/15 border-amber-400/25 text-amber-300',
    shadow: 'shadow-amber-950/30',
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
};

export default function MembershipPanelShell({
  title,
  description,
  icon,
  accent = 'violet',
  children,
  className,
  step,
}: MembershipPanelShellProps) {
  const a = ACCENT[accent];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-6 space-y-5 shadow-lg',
        a.border,
        a.bg,
        a.shadow,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/[0.03] blur-2xl"
      />
      <div className="relative flex items-start gap-3">
        <div className={cn('rounded-xl border p-2.5 shrink-0', a.icon)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {step != null && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/90">
                {step}
              </span>
            )}
            <h3 className="font-semibold text-white text-lg">{title}</h3>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
