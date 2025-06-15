
import React from "react";
import HowToBanner from "../components/howto/HowToBanner";
import HowToAccordion from "../components/howto/HowToAccordion";
import HowToFAQ from "../components/howto/HowToFAQ";
import SupportBanner from "../components/howto/SupportBanner";

const HowToUse: React.FC = () => (
  <div className="min-h-screen w-full bg-cuephoria-dark flex flex-col items-center justify-center px-2 md:px-4 py-8 font-quicksand">
    <div className="w-full max-w-3xl">
      {/* Subtle hero/banner */}
      <HowToBanner />

      {/* Support/Contact Banner */}
      <SupportBanner />

      {/* Instructions */}
      <HowToAccordion />

      {/* FAQ */}
      <HowToFAQ />

      <div className="w-full flex justify-center mt-10">
        <span className="text-xs text-cuephoria-lightpurple/70 px-2 text-center font-quicksand">
          For security, you will be automatically logged out after 5 hours of inactivity.
          Save your work and login daily for best results.<br />
          <b>Questions?</b> Contact your admin or the developer (RK).
        </span>
      </div>
    </div>
  </div>
);

export default HowToUse;
