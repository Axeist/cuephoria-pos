import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import WalkthroughSection from "@/components/landing/WalkthroughSection";
import FeatureDepthSection from "@/components/landing/FeatureDepthSection";
import TrustSection from "@/components/landing/TrustSection";
import PricingSection from "@/components/landing/PricingSection";
import SolutionsSection from "@/components/landing/SolutionsSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen bg-[#07030f] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />

      <div className="relative z-10">
        <Header />

        <main>
          <HeroSection />

          {/*
           * Narrative order:
           *   Hero      → hook
           *   Problem   → pain we solve
           *   Solutions → audience / venue types ("is this for me?")
           *   Walkthrough → how the platform flows
           *   FeatureDepth → role-based deep value
           *   Trust     → social proof + security
           *   Pricing   → cost
           *   FinalCTA  → book a call / trial
           */}
          <div className="relative">
            <ProblemSolutionSection />
          </div>
          <div className="relative">
            <SolutionsSection />
          </div>
          <div className="relative">
            <WalkthroughSection />
          </div>
          <div className="relative">
            <FeatureDepthSection />
          </div>
          <div className="relative">
            <TrustSection />
          </div>
          <div className="relative">
            <PricingSection />
          </div>
          <div className="relative">
            <FinalCtaSection />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
