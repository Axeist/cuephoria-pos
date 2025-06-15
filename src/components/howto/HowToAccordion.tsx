
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookText,
  ListTodo,
  Info,
  ListOrdered,
  ListCheck,
  ListVideo,
} from "lucide-react";

const steps = [
  {
    title: "Login as Admin or Staff",
    icon: BookText,
    detail: (
      <>
        <b>Admins</b> have full control (settings, staff, reports), while <b>Staff</b> focus on the POS and station management.<br />
        <span className="text-cuephoria-lightpurple">Tip:</span> Use secure passwords and log out each day for safety.
      </>
    ),
  },
  {
    title: "Check the Dashboard",
    icon: ListTodo,
    detail: (
      <>
        See <b>real-time sales</b>, <b>active stations</b>, and <b>recent activity</b>.<br />
        <span className="text-cuephoria-lightpurple">Did you know?</span> 
        Low-stock and top customer alerts appear here automatically.
      </>
    ),
  },
  {
    title: "Point of Sale (POS)",
    icon: ListOrdered,
    detail: (
      <>
        Easily record orders, handle <b>split payments</b>, give discounts, and print receipts.<br />
        <span className="text-cuephoria-lightpurple">Fast tip:</span> 
        Scan product barcodes for even quicker checkout!
      </>
    ),
  },
  {
    title: "Manage Gaming Stations",
    icon: ListCheck,
    detail: (
      <>
        Start/end sessions, see which tables are available and how long each game has run.<br />
        <span className="text-cuephoria-lightpurple">Efficiency:</span>
        Click a station to view details or make quick edits.
      </>
    ),
  },
  {
    title: "Inventory and Product Control",
    icon: Info,
    detail: (
      <>
        Add, edit or remove products. Track stock instantly.<br />
        <span className="text-cuephoria-lightpurple">Pro tip:</span>
        Low and critical stock products are visually highlighted.
      </>
    ),
  },
  {
    title: "Customer Management",
    icon: ListOrdered,
    detail: (
      <>
        Manage member profiles, see loyalty stats, export lists for marketing, and view spenders by game.<br />
        <span className="text-cuephoria-lightpurple">Smart tip:</span>
        Top 5 customers are shown for recognition!
      </>
    ),
  },
  {
    title: "Business Reports",
    icon: ListCheck,
    detail: (
      <>
        Access daily, weekly, and filtered reports on sales, expenses, and game usage.<br />
        <span className="text-cuephoria-lightpurple">Export:</span>
        Download Excel or PDF summaries for accounting or sharing.
      </>
    ),
  },
  {
    title: "Settings & Security",
    icon: Info,
    detail: (
      <>
        Only admins can manage system preferences, staff profiles, and privacy controls.<br />
        <span className="text-cuephoria-lightpurple">Note:</span>
        Make backups before making big changes!
      </>
    ),
  },
  {
    title: "Need Help or Training?",
    icon: ListVideo,
    detail: (
      <>
        In-app tooltips and this guide are always accessible from the sidebar.<br />
        <span className="text-cuephoria-lightpurple">Support:</span>
        Reach out any time to your admin or the developer.
      </>
    ),
  },
];

const HowToAccordion: React.FC = () => (
  <Accordion type="multiple" className="rounded-lg overflow-hidden shadow-inner border border-cuephoria-lightpurple/10 bg-cuephoria-darker/80">
    {steps.map((step, idx) => (
      <AccordionItem key={step.title} value={`item-${idx}`}>
        <AccordionTrigger className="flex gap-2 items-center px-4 py-2 text-lg font-semibold rounded-sm hover:bg-cuephoria-lightpurple/5 focus:bg-cuephoria-lightpurple/10 transition-all">
          <step.icon className="h-5 w-5 text-cuephoria-lightpurple" />
          <span>{step.title}</span>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-5 text-base text-white/90 leading-normal">{step.detail}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default HowToAccordion;
