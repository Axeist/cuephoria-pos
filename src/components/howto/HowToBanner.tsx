import React from 'react';
import { BookOpenText, Pin, Sparkles } from 'lucide-react';
import { HOW_TO_STATS } from '@/data/howToGuide';

const HowToBanner: React.FC = () => (
  <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b0d2f] via-[#120922] to-[#0b0616] p-6 sm:p-8 shadow-[0_30px_80px_-35px_rgba(167,139,250,0.5)]">
    <div
      className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-fuchsia-600/15 blur-3xl"
      aria-hidden
    />

    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-3 shadow-lg shadow-fuchsia-600/30">
          <BookOpenText className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/90">
            Training Hub
          </p>
          <h1 className="mt-1 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-2xl font-extrabold text-transparent md:text-4xl">
            How to run Cuetronix daily
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            The complete operator playbook — every module, screen, and workflow in one place.
            Onboarding, POS, Station Command, bookings, staff, reports, and troubleshooting.
            Share with new hires on day one.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[280px]">
        {HOW_TO_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-center"
          >
            <p className="font-mono text-lg font-bold tabular-nums text-violet-200">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="relative mt-5 flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
        <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
        Pro tip: pin this page — sidebar → How to Use
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200">
        <Pin className="h-3.5 w-3.5 text-violet-300" />
        Official SOP — verify money actions manually
      </span>
    </div>
  </div>
);

export default HowToBanner;
