import React from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowUpRight, Lightbulb, ShieldAlert, Sparkles, Crown } from 'lucide-react';
import type { GuideCallout, GuideSection } from '@/data/howToGuide';
import { getGuideIcon } from '@/components/howto/guideIcons';
import { cn } from '@/lib/utils';

const CALLOUT_STYLES: Record<
  GuideCallout['type'],
  { className: string; icon: React.ReactNode; label: string }
> = {
  tip: {
    className: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
    icon: <Lightbulb className="h-3.5 w-3.5 shrink-0 text-cyan-300" />,
    label: 'Tip',
  },
  warning: {
    className: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
    icon: <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-300" />,
    label: 'Warning',
  },
  pro: {
    className: 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100',
    icon: <Sparkles className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" />,
    label: 'Pro',
  },
  admin: {
    className: 'border-violet-400/30 bg-violet-500/10 text-violet-100',
    icon: <Crown className="h-3.5 w-3.5 shrink-0 text-violet-300" />,
    label: 'Admin',
  },
};

interface HowToGuideSectionsProps {
  sections: GuideSection[];
  openSections: string[];
  onOpenChange: (values: string[]) => void;
}

const HowToGuideSections: React.FC<HowToGuideSectionsProps> = ({
  sections,
  openSections,
  onOpenChange,
}) => {
  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-sm text-zinc-400">
        No modules match your search — try “POS”, “booking”, or “staff”.
      </div>
    );
  }

  return (
    <section id="guide-modules">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Complete operator manual</h2>
        <span className="text-xs text-zinc-500">{sections.length} modules</span>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={onOpenChange}
        className="space-y-3"
      >
        {sections.map((section) => {
          const Icon = getGuideIcon(section.icon);
          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              id={`guide-${section.id}`}
              className="scroll-mt-28 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] data-[state=open]:border-violet-400/25 data-[state=open]:bg-gradient-to-br data-[state=open]:from-violet-950/40 data-[state=open]:to-black/40 data-[state=open]:shadow-[0_24px_60px_-40px_rgba(139,92,246,0.5)]"
            >
              <AccordionTrigger className="px-4 py-4 hover:no-underline sm:px-5 [&[data-state=open]>div]:text-white">
                <div className="flex flex-1 items-start gap-3 text-left">
                  <div className="mt-0.5 rounded-xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 p-2.5 ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-violet-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-zinc-100">{section.title}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          section.audience === 'admin'
                            ? 'bg-amber-500/15 text-amber-200'
                            : 'bg-emerald-500/10 text-emerald-200'
                        )}
                      >
                        {section.audience === 'admin' ? 'Admin' : 'All staff'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">{section.subtitle}</p>
                  </div>
                  {section.path && (
                    <Link
                      to={section.path}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 hover:bg-white/10 sm:inline-flex"
                    >
                      Open app
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-5 sm:px-5">
                <div className="space-y-4 border-t border-white/8 pt-4">
                  <ol className="space-y-3">
                    {section.steps.map((step, idx) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-bold tabular-nums text-violet-200 ring-1 ring-violet-400/25">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{step.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-zinc-300">{step.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="rounded-xl border border-white/8 bg-black/25 px-4 py-3 text-sm text-zinc-300">
                      {section.bullets.map((b) => (
                        <li key={b} className="flex gap-2 py-0.5">
                          <span className="text-violet-400">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.callouts?.map((callout) => {
                    const style = CALLOUT_STYLES[callout.type];
                    return (
                      <div
                        key={callout.text}
                        className={cn(
                          'flex gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed',
                          style.className
                        )}
                      >
                        {style.icon}
                        <div>
                          <span className="font-bold uppercase tracking-wide opacity-80">
                            {style.label}
                          </span>
                          <p className="mt-0.5">{callout.text}</p>
                        </div>
                      </div>
                    );
                  })}

                  {section.links && section.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {section.links.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
};

export default HowToGuideSections;
