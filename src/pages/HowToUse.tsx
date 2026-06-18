
import React from "react";
import HowToBanner from "../components/howto/HowToBanner";
import HowToAccordion from "../components/howto/HowToAccordion";
import HowToFAQ from "../components/howto/HowToFAQ";
import SupportBanner from "../components/howto/SupportBanner";

const HowToUse: React.FC = () => (
  <div className="min-h-screen w-full px-3 py-8 text-base text-zinc-100 md:px-5">
    <div className="mx-auto w-full max-w-5xl">
      <HowToBanner />
      <SupportBanner />
      <HowToAccordion />
      <HowToFAQ />
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-zinc-400">
        For security, inactive sessions are automatically signed out after 5 hours. Save in-progress
        work regularly, especially when running long billing or reporting shifts.
      </div>
    </div>
  </div>
);

export default HowToUse;
