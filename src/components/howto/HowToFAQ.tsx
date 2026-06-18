
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info } from "lucide-react";

const faqs = [
  {
    q: "How do I avoid an empty app after onboarding?",
    a: "Use onboarding to add at least one category, one station, 1-2 products, and a test customer. You can edit everything later.",
  },
  {
    q: "Can I customize categories and station setup later?",
    a: "Yes. Categories, stations, products, and rates can be fully updated from Products and Gaming Stations pages at any time.",
  },
  {
    q: "What should new staff learn first?",
    a: "Train in this order: POS billing, starting/ending station sessions, adding products, then daily reports and reconciliation.",
  },
  {
    q: "Where do I configure branding and workspace settings?",
    a: "Open Settings for branding, org profile, billing, and security. Admin access is required for critical changes.",
  },
  {
    q: "Where do I check historical sales and exports?",
    a: "Use Reports to filter by date/product/staff and export data as needed for accounts and audits.",
  },
];

const HowToFAQ: React.FC = () => (
  <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-fuchsia-200">
      <Info className="h-5 w-5" />
      Frequently Asked Questions
    </h3>
    <Accordion type="single" collapsible>
      {faqs.map((faq, idx) => (
        <AccordionItem key={faq.q} value={`faq-${idx}`}>
          <AccordionTrigger className="py-2 text-left text-base text-zinc-200">{faq.q}</AccordionTrigger>
          <AccordionContent className="px-1 text-sm text-zinc-300">{faq.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export default HowToFAQ;
