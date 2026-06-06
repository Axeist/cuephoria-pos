import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HowToSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

const HowToSearch: React.FC<HowToSearchProps> = ({ value, onChange, resultCount }) => (
  <div className="relative mb-6">
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search modules, steps, FAQ… (e.g. Razorpay, live session, payroll)"
      className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pl-11 pr-24 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-violet-500/40"
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white"
      >
        <X className="h-3 w-3" />
        Clear
      </button>
    ) : (
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500">
        {resultCount} topics
      </span>
    )}
  </div>
);

export default HowToSearch;
