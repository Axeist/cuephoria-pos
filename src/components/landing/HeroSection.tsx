import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Gamepad2, Circle } from "lucide-react";

const HERO_METRICS = [
  { value: "99.98%", label: "Uptime" },
  { value: "<100ms", label: "P95 API latency" },
  { value: "50k+", label: "Bookings processed" },
  { value: "14 days", label: "Free trial" },
];

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden min-h-[100svh] flex items-center pt-20 pb-16">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-12 gap-x-4 md:gap-x-6 items-center">
          
          {/* Left Column: Typography (7 cols) */}
          <div className="col-span-12 lg:col-span-7 z-20">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide"
              style={{
                background: "rgba(167,139,250,0.10)",
                border: "1px solid rgba(167,139,250,0.28)",
                color: "#ddd6fe",
                backdropFilter: "blur(8px)",
              }}
            >
              <Sparkles size={12} className="text-fuchsia-300" />
              Now in public preview · Powered by Cuephoria
            </motion.div>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-extrabold leading-[1.02] tracking-[-0.03em] mb-6"
            >
              Run your lounge like a{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #a78bfa 0%, #f0abfc 40%, #93c5fd 80%, #a78bfa 100%)",
                  backgroundSize: "200% 100%",
                  animation: reduceMotion ? undefined : "hueShift 6s ease-in-out infinite",
                }}
              >
                tech company
              </span>
              .
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl"
            >
              The premium operating system for modern gaming lounges, esports cafes, and billiards halls. 
              Online bookings, POS, loyalty, and multi-branch reports — all in one handcrafted platform.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-95 text-white text-base px-8 h-14 font-bold shadow-2xl shadow-fuchsia-600/40 rounded-xl transition-all hover:scale-[1.02]"
              >
                Start 14-day free trial
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo("modules")}
                className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] text-base px-8 h-14 rounded-xl backdrop-blur-md"
              >
                <Play size={16} className="mr-2" />
                See it in action
              </Button>
            </motion.div>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xs text-gray-500 font-medium"
            >
              No credit card required · Cancel anytime
            </motion.p>
          </div>

          {/* Right Column: Visual Anchor (5 cols) */}
          <div className="col-span-12 lg:col-span-5 mt-16 lg:mt-0 relative hidden md:block perspective-[2000px]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, rotateY: 15, rotateX: 5, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: -5, rotateX: 5, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              className="relative w-full aspect-[4/5] max-w-lg mx-auto transform-style-3d"
            >
              {/* Glow Behind */}
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/30 rounded-3xl blur-[80px] mix-blend-screen" />
              
              {/* Main Dashboard Card */}
              <div className="absolute inset-0 rounded-3xl border border-white/10 bg-[#0a0514]/80 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="h-12 border-b border-white/10 flex items-center px-4 gap-4 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/40" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                    <div className="w-3 h-3 rounded-full bg-green-500/40" />
                  </div>
                  <div className="h-4 w-32 bg-white/5 rounded-md mx-auto" />
                </div>
                
                {/* Content */}
                <div className="flex-1 p-5 flex flex-col gap-4">
                  {/* Top Stats */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="h-2 w-12 bg-white/10 rounded mb-2" />
                      <div className="h-5 w-20 bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded" />
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="h-2 w-12 bg-white/10 rounded mb-2" />
                      <div className="h-5 w-16 bg-white/20 rounded" />
                    </div>
                  </div>

                  {/* Main Chart */}
                  <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-end gap-2 relative overflow-hidden">
                    <div className="absolute top-4 left-4 h-3 w-24 bg-white/10 rounded" />
                    <div className="flex items-end justify-between h-32 gap-2">
                      {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                          className="w-full bg-gradient-to-t from-violet-500/80 to-fuchsia-500/80 rounded-t-sm"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Active Stations */}
                  <div className="h-24 bg-white/5 border border-white/5 rounded-xl p-3 flex gap-3">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex-1 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Gamepad2 size={20} className={i === 1 ? "text-fuchsia-400" : "text-white/20"} />
                        <div className="h-1.5 w-8 bg-white/10 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Floating UI Elements */}
              <motion.div 
                animate={{ y: [0, -15, 0], rotateZ: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 -left-12 px-5 py-3 rounded-2xl bg-[#120822]/90 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-4 translate-z-50"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white/90">Station 4 Active</div>
                  <div className="text-xs text-emerald-400">01:24:05 elapsed</div>
                </div>
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, 15, 0], rotateZ: [0, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-32 -right-12 px-5 py-3 rounded-2xl bg-[#120822]/90 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-4 translate-z-50"
              >
                <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
                  <Circle size={20} className="text-fuchsia-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-pink-300">₹450.00</div>
                  <div className="text-xs text-gray-400">Paid via UPI</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Metrics Strip */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 border-t border-white/10 pt-12"
        >
          {HERO_METRICS.map((m) => (
            <div key={m.label} className="text-left md:text-center">
              <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent tracking-tight">
                {m.value}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider mt-2 font-medium">
                {m.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* keyframes for the hero headline hue shift */}
      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
