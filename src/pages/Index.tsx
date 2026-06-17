import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import LogoMarquee from "@/components/landing/LogoMarquee";
import PlatformShowcase from "@/components/landing/PlatformShowcase";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import WalkthroughSection from "@/components/landing/WalkthroughSection";
import FeatureDepthSection from "@/components/landing/FeatureDepthSection";
import TrustSection from "@/components/landing/TrustSection";
import PricingSection from "@/components/landing/PricingSection";
import SolutionsSection from "@/components/landing/SolutionsSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import ScrollProgress from "@/components/landing/lp/ScrollProgress";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

const Index: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useSmoothScroll();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <div className="lp-root relative min-h-screen overflow-x-hidden bg-[#05060b] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <ScrollProgress />
      <SiteAmbientBackground parallax />

      <div className="relative z-10">
        <Header />

        <main>
          <HeroSection />

          <LogoMarquee />

          <div className="relative">
            <PlatformShowcase />
          </div>

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
