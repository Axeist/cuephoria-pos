import { useNavigate } from "react-router-dom";
import { ArrowRight, LifeBuoy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FinalCtaSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 py-32 px-5 sm:px-8 bg-[#07030f]">
      <div className="max-w-6xl mx-auto">
        <div
          className="relative overflow-hidden rounded-[32px] p-12 sm:p-20 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(236,72,153,0.18) 50%, rgba(99,102,241,0.22) 100%)",
            border: "1px solid rgba(167,139,250,0.35)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(217,70,239,0.35), transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90 backdrop-blur shadow-lg">
              <Sparkles size={14} /> Ship your venue online tonight
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.05] max-w-3xl mx-auto">
              Ready to run a smarter gaming lounge?
            </h2>
            
            <p className="text-gray-200 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              Start a free 14-day trial — no credit card, no setup fees.
              If you're stuck, we'll hop on a call and get you live the same day.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-white text-[#1a0a2e] hover:bg-gray-50 font-bold text-lg px-10 h-16 rounded-xl hover:scale-[1.02] transition-transform shadow-2xl shadow-fuchsia-600/30"
              >
                Start free trial <ArrowRight size={20} className="ml-2" />
              </Button>
              <a
                href="mailto:hello@cuetronix.com?subject=Cuetronix%20demo%20request"
                className="inline-flex items-center justify-center gap-2 text-lg px-10 h-16 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors font-semibold backdrop-blur-sm"
              >
                <LifeBuoy size={20} /> Book a live demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
