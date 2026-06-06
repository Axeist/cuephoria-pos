import React from 'react';
import { LifeBuoy, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SupportBanner: React.FC = () => (
  <div className="mb-6 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-950/50 via-cyan-900/20 to-transparent p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <p className="flex items-start gap-2.5 text-sm text-cyan-100">
        <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
        <span>
          Stuck during billing or setup? Search this page first, then ask{' '}
          <Link to="/chat-ai" className="font-semibold text-white underline-offset-2 hover:underline">
            Cuephoria AI
          </Link>
          . Still blocked? Contact your workspace admin with a screenshot and the last button you
          clicked.
        </span>
      </p>
      <Link
        to="/chat-ai"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Ask AI
      </Link>
    </div>
  </div>
);

export default SupportBanner;
