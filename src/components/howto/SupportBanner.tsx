
import React from "react";
import { Info } from "lucide-react";

const SupportBanner: React.FC = () => (
  <div className="w-full flex justify-center my-6">
    <div
      className="
        flex items-center gap-2 px-6 py-3 rounded-2xl
        bg-gradient-to-r from-cuephoria-blue/90 via-cuephoria-lightpurple/80 to-cuephoria-orange/80
        border border-cuephoria-lightpurple/40
        shadow-lg
        "
      style={{
        fontFamily: "'Poppins', 'Inter', sans-serif",
      }}
    >
      <Info className="h-5 w-5 text-cuephoria-orange mr-2" />
      <span className="text-white text-base md:text-lg font-bold">
        For any doubts or support,
        <span className="font-bold text-cuephoria-orange ml-2">
          Contact Ranjith (RK):
        </span>
        <a
          href="tel:8667637565"
          className="ml-1 underline text-cuephoria-orange font-extrabold"
          style={{ textDecorationThickness: 2 }}
        >
          8667637565
        </a>
      </span>
    </div>
  </div>
);

export default SupportBanner;
