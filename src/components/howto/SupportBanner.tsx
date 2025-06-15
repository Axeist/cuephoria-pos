
import React from "react";
import { Info } from "lucide-react";

// A subtle support/contact banner matching the hero/banner theme
const SupportBanner: React.FC = () => (
  <div className="w-full flex justify-center mb-8">
    <div
      className="
        w-full flex items-center gap-3 px-5 py-3 md:py-3.5 rounded-xl
        bg-gradient-to-br from-cuephoria-darker via-cuephoria-dark to-cuephoria-dark
        border border-cuephoria-lightpurple/20
        shadow-xl
        max-w-3xl
        "
      style={{
        fontFamily: "'Poppins', 'Inter', sans-serif",
        boxShadow:
          "0 2px 20px 0 rgba(155,135,245,0.08), 0 1.5px 14px 0 rgba(14,165,233,0.10)",
      }}
    >
      <Info className="h-5 w-5 md:h-6 md:w-6 text-cuephoria-lightpurple flex-shrink-0" />
      <span className="text-white text-base md:text-lg font-bold leading-snug">
        For any doubts or support,
        <span className="font-bold text-cuephoria-lightpurple ml-2">
          Contact Ranjith (RK):
        </span>
        <a
          href="tel:8667637565"
          className="ml-1 underline text-cuephoria-lightpurple font-extrabold"
          style={{ textDecorationThickness: 2 }}
        >
          8667637565
        </a>
      </span>
    </div>
  </div>
);

export default SupportBanner;
