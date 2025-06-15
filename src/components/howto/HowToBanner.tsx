
import React from "react";
import { BookOpenText } from "lucide-react";

const HowToBanner: React.FC = () => (
  <div
    className="
      w-full flex items-center gap-6
      bg-gradient-to-br from-cuephoria-darker via-cuephoria-dark to-cuephoria-dark
      rounded-xl shadow-xl relative px-5 pt-5 pb-4 mb-7 border border-cuephoria-lightpurple/20
      "
    style={{
      boxShadow:
        "0 2px 20px 0 rgba(155,135,245,0.08), 0 1.5px 14px 0 rgba(14,165,233,0.10)",
    }}
  >
    {/* Logo image - smaller, less glow */}
    <div className="flex-shrink-0">
      <img
        src="/lovable-uploads/253e523b-050e-4861-9f9d-11be72cda8fd.png"
        alt="Cuephoria Logo"
        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover shadow border-2 border-cuephoria-lightpurple/20 bg-cuephoria-darker"
        loading="lazy"
      />
    </div>
    {/* Content - simpler, subtler */}
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <BookOpenText className="h-6 w-6 text-cuephoria-lightpurple" />
        <h1 className="text-2xl font-heading font-bold text-white tracking-tight">
          Welcome to <span className="text-cuephoria-blue">Cuephoria!</span>
        </h1>
      </div>
      <p className="text-base md:text-lg font-quicksand text-white/85 mt-0.5 leading-normal">
        Manage your club, staff, customers, and games{" "}
        <span className="text-cuephoria-blue font-semibold">efficiently</span>.<br />
        <span className="text-white/75">
          This interactive guide unlocks every feature for your workflow.
        </span><br />
        <span className="text-cuephoria-lightpurple font-semibold">Tip:</span>
        <span className="ml-1 text-white/75">Click any section below for pro tips!</span>
      </p>
    </div>
  </div>
);

export default HowToBanner;
