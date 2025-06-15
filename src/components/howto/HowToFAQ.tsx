
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
    q: "How long before I am logged out automatically?",
    a: "You will be logged out after 5 hours of inactivity for security. Always save your changes regularly!",
  },
  {
    q: "Can I restore deleted products or customers?",
    a: "Currently, deleted items cannot be restored. Please double-check before confirming deletions.",
  },
  {
    q: "How do I export reports?",
    a: "Go to the Reports or Expenses section, filter as needed, and use the 'Export' button for Excel or PDF.",
  },
  {
    q: "Who can access the Settings page?",
    a: "Only Admins can access and edit system settings and manage staff.",
  },
  {
    q: "What if I need more help?",
    a: "Contact your administrator, or reach out to the developer (RK). You can also revisit this guide any time from the sidebar.",
  },
];

const HowToFAQ: React.FC = () => (
  <div className="bg-cuephoria-dark/90 rounded-lg mt-8 border border-cuephoria-lightpurple/10 shadow-sm p-4">
    <h3 className="flex items-center gap-2 text-xl font-bold text-cuephoria-lightpurple mb-4">
      <Info className="h-5 w-5" />
      Frequently Asked Questions
    </h3>
    <Accordion type="single" collapsible>
      {faqs.map((faq, idx) => (
        <AccordionItem key={faq.q} value={`faq-${idx}`}>
          <AccordionTrigger className="text-lg text-cuephoria-lightpurple py-2 hover:underline">{faq.q}</AccordionTrigger>
          <AccordionContent className="text-base px-2 text-white/90">{faq.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export default HowToFAQ;
