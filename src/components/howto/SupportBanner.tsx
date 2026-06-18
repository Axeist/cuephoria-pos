import React from "react";
import { LifeBuoy } from "lucide-react";

const SupportBanner: React.FC = () => (
  <div className="mb-6 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-cyan-100">
    <p className="flex items-start gap-2 text-sm">
      <LifeBuoy className="mt-0.5 h-4 w-4 flex-shrink-0" />
      If you are stuck during billing or setup, open this guide first, then reach out to your workspace admin or
      implementation partner. Include a screenshot and what you clicked last for faster help.
    </p>
  </div>
);

export default SupportBanner;
