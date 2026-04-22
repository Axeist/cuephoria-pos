
import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart2, BookOpen, ListCheck, ListOrdered, Settings, Users } from "lucide-react";

const sections = [
  {
    title: "Daily Launch Checklist",
    icon: ListCheck,
    points: [
      "Open Dashboard first and confirm alerts, active bookings, and station status.",
      "Verify at least one customer and one station are visible before shift starts.",
      "If app is fresh, add starter categories/products from Products immediately.",
    ],
  },
  {
    title: "POS Flow (Billing)",
    icon: ListOrdered,
    points: [
      "Select customer, add products/session charges, then apply discount if required.",
      "Use split payments when needed and verify totals before finalizing bill.",
      "Reprints and history checks are always available from Reports.",
    ],
  },
  {
    title: "Gaming Stations",
    icon: ListCheck,
    points: [
      "Keep station names clear (e.g. PS5 Bay 1, VR Bay 2) for faster operations.",
      "Start/end sessions from Stations and monitor occupied timers closely.",
      "Use event stations for temporary campaigns, tournaments, and special slots.",
    ],
  },
  {
    title: "Products and Categories",
    icon: BookOpen,
    points: [
      "Categories are fully customizable; rename/delete as your menu evolves.",
      "Keep stock values updated to avoid failed billing and low-stock surprises.",
      "Use consistent naming to make POS search and staff onboarding easier.",
    ],
  },
  {
    title: "Customers and Loyalty",
    icon: Users,
    points: [
      "Capture at least name + phone for every regular to build useful history.",
      "Use a test customer only for setup; switch to real customers during live shift.",
      "Review customer profiles for repeat visits, spending, and engagement patterns.",
    ],
  },
  {
    title: "Reports and Settings",
    icon: BarChart2,
    points: [
      "Use Reports for shift closure, exports, and exception review.",
      "Keep branding, organization details, and access controls updated in Settings.",
      "Admins should audit permissions monthly to reduce operational risk.",
    ],
  },
  {
    title: "Training and Governance",
    icon: Settings,
    points: [
      "Use this page as your SOP reference during staff training.",
      "After major app updates, revisit this guide to align process changes.",
      "Assign one admin owner for onboarding quality and data consistency.",
    ],
  },
];

const HowToAccordion: React.FC = () => (
  <Accordion type="multiple" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
    {sections.map((section, idx) => (
      <AccordionItem key={section.title} value={`item-${idx}`} className="border-white/10">
        <AccordionTrigger className="px-4 py-3 text-left text-base font-semibold text-zinc-100 hover:bg-white/[0.03]">
          <span className="flex items-center gap-2">
            <section.icon className="h-4.5 w-4.5 text-fuchsia-300" />
            {section.title}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4">
          <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-300">
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default HowToAccordion;

