
import React from "react";
import HowToBanner from "../components/howto/HowToBanner";
import HowToAccordion from "../components/howto/HowToAccordion";
import HowToFAQ from "../components/howto/HowToFAQ";

const HowToUse: React.FC = () => (
  <div className="min-h-screen w-full bg-cuephoria-dark flex flex-col items-center justify-center px-2 md:px-4 py-8">
    <div className="w-full max-w-3xl">
      <HowToBanner />

      {/* Highlighted support/instructions block */}
      <div className="w-full flex justify-center mb-6">
        <div className="bg-gradient-to-r from-cuephoria-blue/80 via-cuephoria-lightpurple/80 to-cuephoria-orange/60 border border-cuephoria-lightpurple/70 rounded-xl px-5 py-4 shadow-lg flex gap-4 items-center">
          <span className="block text-base md:text-lg font-bold text-white flex gap-2 items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cuephoria-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 6v2m6 8v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2M3 17h.01"/><circle cx="12" cy="12" r="10" /></svg>
            For any doubts or support, <span className="inline-block text-cuephoria-orange font-extrabold">Contact Ranjith (RK): <a href="tel:8667637565" className="underline hover:text-white">8667637565</a></span>
          </span>
        </div>
      </div>

      <HowToAccordion />
      <HowToFAQ />
      <div className="w-full flex justify-center mt-10">
        <span className="text-xs text-cuephoria-lightpurple/70 px-2 text-center">
          For security, you will be automatically logged out after 5 hours of inactivity.
          Save your work and login daily for best results.<br />
          <b>Questions?</b> Contact your admin or the developer (RK).
        </span>
      </div>
    </div>
  </div>
);

export default HowToUse;

