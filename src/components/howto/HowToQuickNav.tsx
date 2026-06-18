import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GuideSection } from '@/data/howToGuide';
import { getGuideIcon } from '@/components/howto/guideIcons';
import { cn } from '@/lib/utils';

interface HowToQuickNavProps {
  sections: GuideSection[];
  onJump: (id: string) => void;
}

const HowToQuickNav: React.FC<HowToQuickNavProps> = ({ sections, onJump }) => (
  <section className="mb-8">
    <h2 className="mb-4 text-lg font-bold text-white">Jump to module</h2>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {sections.map((section) => {
        const Icon = getGuideIcon(section.icon);
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onJump(section.id)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all hover:border-violet-400/35 hover:bg-violet-500/10"
          >
            <div className="flex w-full items-center justify-between">
              <div className="rounded-lg bg-violet-500/15 p-1.5 ring-1 ring-violet-400/20">
                <Icon className="h-3.5 w-3.5 text-violet-200" />
              </div>
              {section.path && (
                <Link
                  to={section.path}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md p-1 text-zinc-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                  title={`Open ${section.title}`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-100">
              {section.title}
            </span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                section.audience === 'admin'
                  ? 'bg-amber-500/15 text-amber-200'
                  : 'bg-emerald-500/10 text-emerald-200/90'
              )}
            >
              {section.audience === 'admin' ? 'Admin' : 'All staff'}
            </span>
          </button>
        );
      })}
    </div>
  </section>
);

export default HowToQuickNav;
