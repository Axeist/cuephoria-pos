
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
  CircleHelp,
  Phone,
  BookOpen,
  Mail,
  Bell
} from "lucide-react";

const steps = [
  {
    title: "Dashboard Page",
    icon: ListTodo,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>View <b>today's sales, hourly revenue, and recent transactions</b>.</li>
          <li>See <b>active gaming stations</b> at a glance.</li>
          <li>Track <b>top products, best customers, and low-stock alerts</b> in real time.</li>
          <li>Catch up with <b>critical notifications and club performance</b> for any date range.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Pro tip: Click "More" on any chart for deeper analytics.</span>
      </>
    ),
  },
  {
    title: "Point of Sale (POS) Page",
    icon: ListOrdered,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>Create new bills and add products (including time-based or hourly stations).</li>
          <li><b>Apply discounts, loyalty points, or split payments</b> between cash/UPI.</li>
          <li>Scan product barcodes for faster billing.</li>
          <li>Print, download, or share receipts instantly.</li>
          <li>Edit orders and correct mistakes before payment.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Did you know? You can reprint any old receipt from the Reports page!</span>
      </>
    ),
  },
  {
    title: "Stations Page",
    icon: ListCheck,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>See all <b>gaming tables, consoles, and controllers</b> with current status (free/occupied).</li>
          <li><b>Start or end sessions</b> with just one click.</li>
          <li>Edit station details, set hourly rates, and assign types (e.g., snooker, FIFA, PS4).</li>
          <li>View how long a customer has played and session history.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Tip: Use the dashboard for a quick snapshot, or the Stations page for deep control.</span>
      </>
    ),
  },
  {
    title: "Products Page",
    icon: Info,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>Add, edit, or remove products including snacks, drinks, time-pass, and memberships.</li>
          <li>Bulk edit stock levels and prices.</li>
          <li>See <b>real-time low stock alerts</b> – never run out unexpectedly!</li>
          <li>Assign categories and images for better organization.</li>
          <li>Export your inventory to Excel for backup or audits.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Admins can set price tiers (student/membership/etc) for each product.</span>
      </>
    ),
  },
  {
    title: "Customers Page",
    icon: BookOpen,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>Add new members or regular customers with unique phone/email.</li>
          <li><b>Track loyalty points, total spent, and playtime</b> per customer.</li>
          <li>View, edit, or remove customer profiles.</li>
          <li>See top spenders, regulars, and export lists for marketing.</li>
          <li>Restore previous billings and view order history.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Quick Filter: Use search or filter by member type for targeted info.</span>
      </>
    ),
  },
  {
    title: "Reports Page",
    icon: BookText,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>Access daily, weekly, or custom period <b>sales, payments, and performance summaries</b>.</li>
          <li>Export reports in Excel or PDF format.</li>
          <li>Deep dive into each bill, product, or session with expandable details.</li>
          <li>See taxes, discounts, and payment breakdowns instantly.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Admins: Use filters to audit staff performance and sales trends.</span>
      </>
    ),
  },
  {
    title: "Expense Tracking Page",
    icon: Info,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>Add, edit, or delete daily/weekly/monthly expenses for tracking profit.</li>
          <li>Assign categories and notes to each expense for better reporting.</li>
          <li>Export full expense lists alongside your sales data.</li>
          <li>See recurring vs one-time expenses at a glance.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Tournaments Page",
    icon: ListVideo,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>View, add, or edit tournaments with game details and player signup.</li>
          <li>Track match progress, winners, and assign prizes.</li>
          <li>Public leaderboard and tournament history available.</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Tip: Player stats auto-update as each round completes.</span>
      </>
    ),
  },
  {
    title: "Settings Page",
    icon: Bell,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>Admins: Update club info, staff profiles, permissions, and security settings.</li>
          <li>Manage notifications, data backup, user preferences, and club branding (logo, etc).</li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">Back up data before big changes for extra safety!</span>
      </>
    ),
  },
  {
    title: "Help, Training & Tips",
    icon: CircleHelp,
    detail: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li>This "How to Use" page and tooltips are always accessible from the sidebar.</li>
          <li>Most buttons and features provide in-app prompts or extra info when hovered or clicked.</li>
          <li>For ANY doubts, contact staff, or <b>reach out directly to Ranjith (RK) at <a href="tel:8667637565" className="underline text-cuephoria-blue">8667637565</a></b>.</li>
        </ul>
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
