
import React from "react";
import { BookOpenText } from "lucide-react";

const HowToBanner: React.FC = () => (
  <div
    className="
      w-full flex flex-col md:flex-row items-center
      bg-gradient-to-br from-cuephoria-darker via-cuephoria-dark to-cuephoria-dark
      rounded-2xl shadow-2xl relative p-0 mb-10
      border-2 border-cuephoria-lightpurple/40
      animate-[glow_2.7s_infinite_ease-in-out]
      overflow-hidden
    "
    style={{
      boxShadow:
        "0 3px 32px 0 rgba(155,135,245,0.17), 0 1.5px 24px 0 rgba(14,165,233,0.17)",
    }}
  >
    {/* Fancy background shimmer bar */}
    <div className="absolute top-[-20px] left-[-120px] w-[350px] h-[80px] bg-gradient-to-r from-cuephoria-lightpurple/30 via-cuephoria-lightpurple/80 to-cuephoria-blue/40 blur-2xl opacity-60 rotate-[-8deg] animate-shimmer z-0" />
    {/* Logo/picture with glow and border */}
    <div className="flex-shrink-0 z-10 p-3 pl-6 md:pl-8 drop-shadow-xl">
      <img
        src="/lovable-uploads/253e523b-050e-4861-9f9d-11be72cda8fd.png"
        alt="Cuephoria Logo"
        className="
          w-32 h-32 md:w-44 md:h-44 rounded-xl
          object-cover shadow-lg border-4
          border-cuephoria-lightpurple/60
          bg-cuephoria-darker
          animate-[pulse-glow_2.5s_ease-in-out_infinite]
        "
        loading="lazy"
        style={{
          boxShadow: "0 0 45px 0 #9b87f599, 0 8px 40px #1a1f2c55",
        }}
      />
    </div>
    {/* Content Block */}
    <div className="flex-1 flex flex-col z-10 gap-4 py-7 px-6 md:px-0 md:pr-8 items-center md:items-start text-center md:text-left">
      <div className="flex items-center gap-3 justify-center md:justify-start">
        <BookOpenText
          className="h-9 w-9 text-cuephoria-lightpurple
            drop-shadow-[0_0_14px_#9b87f5,0_1px_8px_#6E59A530]"
        />
        <h1
          className="text-3xl md:text-4xl font-extrabold font-heading gradient-text
            tracking-tight animate-text-gradient"
        >
          Welcome to Cuephoria!
        </h1>
      </div>
      <p className="text-lg md:text-xl text-white/90 leading-relaxed font-quicksand max-w-xl">
        Manage your club, staff, customers, and games <span className="text-cuephoria-blue font-semibold">efficiently</span>.<br />
        <span className="opacity-90">
          This interactive guide unlocks every feature for your workflow.<br />
          <span className="inline-block mt-1">
            <span className="text-cuephoria-lightpurple font-bold">Tip:</span> Click any section below for pro tips!
          </span>
        </span>
      </p>
    </div>
    {/* Animated accent bar at bottom right */}
    <div className="absolute bottom-2 right-0 w-44 h-4 rounded-r-xl bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/10 blur-lg opacity-90 z-0 animate-shimmer" />
  </div>
);

export default HowToBanner;
