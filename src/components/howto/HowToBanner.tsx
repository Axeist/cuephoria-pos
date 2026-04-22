
import React from "react";
import { BookOpenText, Sparkles } from "lucide-react";

const HowToBanner: React.FC = () => (
  <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b0d2f] via-[#120922] to-[#0b0616] p-6 shadow-[0_30px_80px_-35px_rgba(167,139,250,0.5)]">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2.5">
        <BookOpenText className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/80">Training Hub</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">How to run Cuetronix daily</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-300">
          Use this guide as your operator playbook: onboarding, billing flow, stations, inventory, reports, and
          staff actions. Share this page with new team members on day one.
        </p>
      </div>
    </div>
    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
      <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
      Pro tip: keep this page pinned for staff training and daily SOP checks.
    </div>
  </div>
);

export default HowToBanner;

