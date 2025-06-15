
import React from "react";
import { BookOpen } from "lucide-react";

const HowToUse: React.FC = () => (
  <div className="min-h-screen w-full bg-cuephoria-dark flex flex-col items-center justify-center px-4 py-12">
    <div className="w-full max-w-2xl bg-cuephoria-darker/90 rounded-lg shadow-xl border border-cuephoria-lightpurple/20 backdrop-blur-lg p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="h-8 w-8 text-cuephoria-lightpurple" />
        <h1 className="text-2xl font-bold gradient-text">How to Use Cuephoria Management App</h1>
      </div>
      <ol className="list-decimal pl-6 space-y-4 text-base leading-relaxed text-white">
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Login: </span>
          Use your admin or staff credentials on the login page. Admins have full control, while staff have limited permissions.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Dashboard: </span>
          After login, you'll see business insights, stats, trends, and recent activity at a glance.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">POS (Point of Sale): </span>
          Record sales, process transactions for food, drinks, and games. Staff access POS directly after login.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Stations: </span>
          Manage gaming stations/tables, start and end game sessions, track usage and status in real time.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Products: </span>
          View, add, edit, or remove products (food, drinks, etc.), check stock & inventory, and exports.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Customers: </span>
          View customer profiles, transaction history, and top spenders.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Reports: </span>
          Access daily, weekly, and custom sales and expense reports.
        </li>
        <li>
          <span className="font-semibold text-cuephoria-lightpurple">Settings: </span>
          Manage account settings, staff members, and application preferences (Admin only).
        </li>
      </ol>
      <div className="mt-6 p-4 rounded bg-cuephoria-lightpurple/10 border border-cuephoria-lightpurple/30 text-sm text-cuephoria-lightpurple">
        For security, you will be automatically logged out after 5 hours of inactivity. Please make sure to save your work and log in daily for best results.<br />
        <br />
        <b>Need help?</b> Contact your administrator or the developer (RK).
      </div>
    </div>
  </div>
);

export default HowToUse;
