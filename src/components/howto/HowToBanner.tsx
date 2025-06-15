
import React from "react";
import { BookOpenText } from "lucide-react";

const HowToBanner: React.FC = () => (
  <div className="w-full flex flex-col md:flex-row items-center bg-gradient-to-br from-cuephoria-dark via-cuephoria-darker to-cuephoria-dark rounded-lg shadow-xl p-6 mb-8 border border-cuephoria-lightpurple/20">
    <img
      src="/lovable-uploads/photo-1519389950473-47ba0277781c.png"
      alt="Welcome to Cuephoria Management"
      className="w-32 h-32 md:w-44 md:h-44 rounded-lg object-cover shadow-md border-2 border-cuephoria-lightpurple/40 mr-0 md:mr-8 mb-4 md:mb-0"
      loading="lazy"
    />
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <BookOpenText className="h-8 w-8 text-cuephoria-lightpurple" />
        <h1 className="text-3xl font-bold font-heading gradient-text">Welcome to Cuephoria!</h1>
      </div>
      <p className="text-lg text-white/90 leading-relaxed">
        Manage your club, staff, customers, and games efficiently.<br />
        This interactive guide helps you unlock all the features built for your workflow. Click on any section below to get detailed tips!
      </p>
    </div>
  </div>
);

export default HowToBanner;
