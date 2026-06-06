import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, Tag } from 'lucide-react';
import { GUIDE_FAQS } from '@/data/howToGuide';

interface HowToFAQProps {
  query?: string;
}

const HowToFAQ: React.FC<HowToFAQProps> = ({ query = '' }) => {
  const [open, setOpen] = useState<string | undefined>(undefined);
  const q = query.trim().toLowerCase();

  const faqs = useMemo(() => {
    if (!q) return GUIDE_FAQS;
    return GUIDE_FAQS.filter(
      (faq) =>
        faq.q.toLowerCase().includes(q) ||
        faq.a.toLowerCase().includes(q) ||
        faq.tags.some((t) => t.includes(q))
    );
  }, [q]);

  return (
    <section className="mt-10">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#140a24]/80 via-[#0c0618] to-black/60 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-fuchsia-300" />
          <h3 className="text-xl font-bold text-white">Frequently asked questions</h3>
          <span className="ml-auto text-xs text-zinc-500">{faqs.length} answers</span>
        </div>

        {faqs.length === 0 ? (
          <p className="text-sm text-zinc-400">No FAQ matches — browse modules above.</p>
        ) : (
          <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
            {faqs.map((faq, idx) => (
              <AccordionItem
                key={faq.q}
                value={`faq-${idx}`}
                className="border-white/10"
              >
                <AccordionTrigger className="py-3 text-left text-sm font-semibold text-zinc-100 hover:text-white">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-sm leading-relaxed text-zinc-300">
                  {faq.a}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {faq.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
};

export default HowToFAQ;
