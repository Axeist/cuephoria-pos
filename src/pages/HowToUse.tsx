import React, { useMemo, useState, useCallback } from 'react';
import HowToBanner from '@/components/howto/HowToBanner';
import HowToSearch from '@/components/howto/HowToSearch';
import HowToQuickNav from '@/components/howto/HowToQuickNav';
import HowToLearningPaths from '@/components/howto/HowToLearningPaths';
import HowToGuideSections from '@/components/howto/HowToGuideSections';
import HowToFAQ from '@/components/howto/HowToFAQ';
import SupportBanner from '@/components/howto/SupportBanner';
import { GUIDE_SECTIONS } from '@/data/howToGuide';

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

const HowToUse: React.FC = () => {
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>(['getting-started', 'daily-launch']);

  const q = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!q) return GUIDE_SECTIONS;
    return GUIDE_SECTIONS.filter((section) => {
      const haystack = [
        section.title,
        section.subtitle,
        ...section.tags,
        ...section.steps.map((s) => `${s.title} ${s.detail}`),
        ...(section.bullets ?? []),
        ...(section.callouts?.map((c) => c.text) ?? []),
      ].join(' ');
      return matchesQuery(haystack, q);
    });
  }, [q]);

  const jumpToModule = useCallback((id: string) => {
    setOpenSections((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  return (
    <div className="relative min-h-screen w-full min-w-0 max-w-full overflow-x-hidden px-3 py-8 text-base text-zinc-100 md:px-5">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#07030f]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14),transparent_65%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <HowToBanner />
        <SupportBanner />
        <HowToSearch
          value={query}
          onChange={setQuery}
          resultCount={filteredSections.length}
        />
        {!q && (
          <>
            <HowToLearningPaths />
            <HowToQuickNav sections={GUIDE_SECTIONS} onJump={jumpToModule} />
          </>
        )}
        <HowToGuideSections
          sections={filteredSections}
          openSections={openSections}
          onOpenChange={setOpenSections}
        />
        <HowToFAQ query={query} />

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-400">
          <p className="font-semibold text-zinc-300">Security note</p>
          <p className="mt-1">
            Inactive sessions auto sign-out after 5 hours. Save in-progress reports before long
            breaks. Admin PIN protects destructive actions — never share it on shift.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;
