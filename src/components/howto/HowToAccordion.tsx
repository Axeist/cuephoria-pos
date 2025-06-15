
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
  Bell
} from "lucide-react";

const steps = [
  {
    title: "Dashboard Page",
    icon: ListTodo,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          The Dashboard gives an at-a-glance summary of your club’s daily activities, finances, and trends.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Stats and Summaries:</b> Quickly view today’s sales, cash in vault, hourly revenue, and total transactions.
          </li>
          <li>
            <b>Active Stations Tracker:</b> See what gaming stations are in-use and by which customers, shown with timers.
          </li>
          <li>
            <b>Performance Charts:</b> Analyze sales by the hour, day, week, or month. Click <span className="underline text-cuephoria-lightpurple">"More"</span> on any chart for expanded analytics.
          </li>
          <li>
            <b>Critical Notifications:</b> Get alerts on low-stock products, new member signups, and session anomalies.
          </li>
          <li>
            <b>Recently Added Customers:</b> Track new registrations for the day.
          </li>
          <li>
            <b>Club Insights:</b> Compare current sales and growth metrics to previous periods.
          </li>
        </ul>
        <div className="block mt-2 text-cuephoria-lightpurple">
          <b>Pro tip:</b> Hover any statistic to see a breakdown or explanation. Use tabs for Overview, Analytics, Expenses, or Vault views.
        </div>
      </>
    ),
  },
  {
    title: "Point of Sale (POS) Page",
    icon: ListOrdered,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          The POS page is used for billing customers, recording sales, and managing the club’s daily transactions.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Create Bills:</b> Start new bills, scan items with a barcode, or manually select products and hourly sessions.
          </li>
          <li>
            <b>Edit Orders:</b> Correct mistakes or edit products before completing a sale (change quantity, remove items).
          </li>
          <li>
            <b>Apply Discounts:</b> Use custom discounts, loyalty points, or offers where available.
          </li>
          <li>
            <b>Split Payments:</b> Accept cash, UPI, card, or a combination for each bill.
          </li>
          <li>
            <b>Bill Printing & Sharing:</b> Instantly print, download, or share receipts, including reprints from report history.
          </li>
          <li>
            <b>Customer Link:</b> Attach a customer to a bill with their details auto-filled for loyalty tracking.
          </li>
        </ul>
        <div className="block mt-2 text-cuephoria-lightpurple">
          <b>Admin:</b> Only admins can change pricing mid-sale or override discounts.
        </div>
        <div className="block mt-1 text-cuephoria-lightpurple">
          <b>Did you know?</b> Old receipts can always be reprinted from the Reports page.
        </div>
      </>
    ),
  },
  {
    title: "Stations Page",
    icon: ListCheck,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Manage all gaming tables, consoles, and equipment sessions from this page.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Live Status Indicators:</b> Check which stations are Free or Occupied instantly.
          </li>
          <li>
            <b>Session Control:</b> Start or end play sessions with one click. Add extra playtime mid-session if needed.
          </li>
          <li>
            <b>Edit Stations:</b> Set custom names, attach hourly rates, and update equipment types (snooker, FIFA, etc).
          </li>
          <li>
            <b>Session History:</b> View how long each customer has played, time in/out, and session cost.
          </li>
          <li>
            <b>Configure Play Rules:</b> Some settings (like allowed categories or rate editing) may be Admin-only.
          </li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">
          <b>Tip:</b> Shortcuts for session extension pop up while a station is active!
        </span>
      </>
    ),
  },
  {
    title: "Products Page",
    icon: Info,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Control your product inventory, prices, categories, and manage stock in real-time.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Add / Edit / Remove Products:</b> Create food, drinks, memberships, challenges, and hourly packages.
          </li>
          <li>
            <b>Bulk Edit:</b> Use bulk actions for price changes or stock corrections.
          </li>
          <li>
            <b>Stock Alerts:</b> Products running low (custom threshold) are highlighted. Instantly restock or set zero.
          </li>
          <li>
            <b>Advanced Pricing:</b> Enable offer prices, buying cost, and selling price for profit tracking.
          </li>
          <li>
            <b>Categories:</b> Organize products into types (e.g. Snacks, Membership, Game Time). Categories can be managed (add/remove) any time.
          </li>
          <li>
            <b>Product Images:</b> Upload images for visual catalog and better POS lookup.
          </li>
          <li>
            <b>Export Options:</b> Download full inventory as Excel for account audits.
          </li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">
          <b>Admins:</b> Only Admins can delete products or edit "membership" products.
        </span>
      </>
    ),
  },
  {
    title: "Customers Page",
    icon: BookOpen,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Manage all club members and regulars with searchable, filterable lists.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Register New Customers:</b> Add members with name, phone, email, and assign category (member/regular/guest).
          </li>
          <li>
            <b>View Profiles:</b> Click on a customer to see order history, total spend, sessions played, and points.
          </li>
          <li>
            <b>Edit / Remove:</b> Fix typos or delete customers (with warning - permanent!).
          </li>
          <li>
            <b>Loyalty Tracking:</b> See live points, redeemables, and assign rewards.
          </li>
          <li>
            <b>Filters and Exports:</b> Search by name, type, and download lists for marketing.
          </li>
          <li>
            <b>Billing Recovery:</b> Instantly restore past transactions from any customer’s profile.
          </li>
        </ul>
        <div className="block mt-2 text-cuephoria-lightpurple">
          <b>Quick filter:</b> Use the search bar and type selector for rapid lookups.
        </div>
        <div className="block mt-1 text-cuephoria-lightpurple">
          <b>Warning:</b> Deleted customers <b>cannot</b> be restored!
        </div>
      </>
    ),
  },
  {
    title: "Reports Page",
    icon: BookText,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Detailed analytics of sales, sessions, staff performance, tax, and product popularity.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Sales Reports:</b> Filter by date, product, category, or staff member. See total sales, breakdowns by payment type.
          </li>
          <li>
            <b>Bill Drilldown:</b> Click any row for a full bill, receipt reprint, or payment summary.
          </li>
          <li>
            <b>Export Features:</b> Download reports as Excel or PDF for records or GST audit.
          </li>
          <li>
            <b>Session Reports:</b> Track gaming activity, peaks, and revenue from hourly play.
          </li>
          <li>
            <b>Expense Integration:</b> Optionally include expense data with revenue.
          </li>
          <li>
            <b>Trends & Graphs:</b> Visualize revenue trends and product movements over time.
          </li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">
          <b>Admins:</b> Can view profit/loss figures and staff audit logs.
        </span>
      </>
    ),
  },
  {
    title: "Expense Tracking Page",
    icon: Info,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Maintain a log of all spending for maximum profit tracking and transparency.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Add Expenses:</b> Record everyday, monthly, and one-time expenses with category and notes.
          </li>
          <li>
            <b>Edit/Delete:</b> Fix data entry mistakes or remove wrong items.
          </li>
          <li>
            <b>Recurring Expenses:</b> Mark repeating expenses (rent, salaries) for ongoing reports.
          </li>
          <li>
            <b>Export Lists:</b> Download as Excel for financial records.
          </li>
          <li>
            <b>Expense + Sales Report:</b> Compare spending to earnings, get net profit view instantly.
          </li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">
          <b>Tip:</b> Be diligent – well-categorized expenses make monthly summaries accurate!
        </span>
      </>
    ),
  },
  {
    title: "Tournaments Page",
    icon: ListVideo,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Host, track, and manage club tournaments, matches, and winners.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Create New Tournaments:</b> Set up name, game type (PS5, Table, etc.), date, max players, and budget/prize.
          </li>
          <li>
            <b>Player Signup:</b> Add players manually or allow signup from staff.
          </li>
          <li>
            <b>Match Progress:</b> Advance matches, assign winners, and auto-update brackets.
          </li>
          <li>
            <b>Leaderboard:</b> Live leaderboard for current and past tournaments.
          </li>
          <li>
            <b>Tournament History:</b> Full archives of previous events and champions.
          </li>
          <li>
            <b>Edit or Delete:</b> Update details/matches or remove old tournaments as needed (PIN required for deletes).
          </li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">
          <b>Pro tip:</b> Player stats update automatically; only admins can delete tournaments.
        </span>
      </>
    ),
  },
  {
    title: "Settings Page",
    icon: Bell,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Admins control all app and club configurations here.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Club Details:</b> Set name, location, branding, GSTIN, and contact information.
          </li>
          <li>
            <b>Staff Profiles & Permissions:</b> Add/remove staff, set roles, and restrict sensitive features (discounts, reports).
          </li>
          <li>
            <b>Security Settings:</b> Update PINs, enforce auto-logout, and configure access rules.
          </li>
          <li>
            <b>Notifications:</b> Toggle alerts for critical actions and reminders.
          </li>
          <li>
            <b>Backup/Restore:</b> Download all data for safekeeping before major updates.
          </li>
          <li>
            <b>Customization:</b> Change logo, primary colors, and theme for a personalized feel.
          </li>
        </ul>
        <span className="block mt-2 text-cuephoria-lightpurple">
          <b>Important:</b> Only Admins see this page; staff have restricted access.
        </span>
      </>
    ),
  },
  {
    title: "Help, Training & Tips",
    icon: CircleHelp,
    detail: (
      <>
        <p className="mb-2 text-white/75">
          Get quick access to in-app guides, tips, training resources, and support at any time.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>How To Use:</b> This page serves as a complete manual and is always accessible from the sidebar.</li>
          <li>
            <b>Tooltips:</b> Hover over buttons and icons on any screen for additional explanations or tips.
          </li>
          <li>
            <b>Staff Training:</b> Use the accordion above as part of in-person or WhatsApp training.
          </li>
          <li>
            <b>Advanced Features:</b> New functionalities are highlighted here after updates.</li>
          <li>
            <b>Support:</b> For <span className="font-bold text-cuephoria-lightpurple">ANY</span> doubts or issues, always contact your club lead or <b className="text-cuephoria-lightpurple">Ranjith (RK): <a href="tel:8667637565" className="underline text-cuephoria-blue">8667637565</a></b>.
          </li>
        </ul>
        <div className="block mt-2 text-white/75">
          <b>Remember:</b> You can revisit this guide at any time, or share it with new staff!
        </div>
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

