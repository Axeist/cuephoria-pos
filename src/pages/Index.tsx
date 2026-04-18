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
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import Footer from "@/components/landing/Footer";

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#07030f] text-white overflow-x-hidden antialiased selection:bg-violet-500/40 selection:text-white">
      {/* BACKGROUND LAYERS */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 w-[720px] h-[620px] bg-violet-700/20 rounded-full blur-[180px]" />
        <div className="absolute top-[40%] -right-20 w-[560px] h-[480px] bg-fuchsia-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-indigo-600/12 rounded-full blur-[140px]" />
      </div>

      <Header />

      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <WalkthroughSection />
        <FeatureDepthSection />
        <TrustSection />
        <PricingSection />
        <FinalCtaSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
