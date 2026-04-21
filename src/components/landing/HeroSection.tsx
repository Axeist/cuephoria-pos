import { lazy, Suspense, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Gamepad2, Circle, ShieldCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const HeroScene3D = lazy(() => import("./HeroScene3D"));

// ─── Static data ──────────────────────────────────────────────────────────────
const HERO_METRICS = [
  { value: "99.98%", label: "Uptime" },
  { value: "<100ms", label: "P95 API latency" },
  { value: "50k+",   label: "Bookings processed" },
  { value: "14 days", label: "Free trial" },
];

// ─── 3-D tilt card ────────────────────────────────────────────────────────────
function TiltCard({ reduceMotion, children, className = "" }: {
  reduceMotion: boolean | null;
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion) return;

    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      target.current.x = (e.clientX - r.left) / r.width  - 0.5;
      target.current.y = (e.clientY - r.top)  / r.height - 0.5;
    };
    const onLeave = () => { target.current.x = 0; target.current.y = 0; };

    const loop = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      setTilt({ x: current.current.x, y: current.current.y });
      rafRef.current = requestAnimationFrame(loop);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion]);

  const transform = reduceMotion
    ? undefined
    : `perspective(1100px) rotateY(${tilt.x * 14}deg) rotateX(${-tilt.y * 12}deg) translateZ(10px)`;

  return (
    <div ref={containerRef} className={className} style={{ transform, transformStyle: "preserve-3d", transition: "transform 0.05s linear", willChange: "transform" }}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const HeroSection: React.FC = () => {
  const navigate     = useNavigate();
  const reduceMotion = useReducedMotion();
  const isMobile     = useIsMobile();

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden min-h-[100svh] flex items-center pt-28 sm:pt-32 md:pt-36 pb-16"
    >

      {/* ── 3-D Background ── */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="absolute inset-0 bg-[#07030f]" />}>
          <HeroScene3D mobile={isMobile} />
        </Suspense>
      </div>

      {/* ── Readability scrim: uniform on mobile, left-biased on desktop ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none hidden md:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,3,15,0.88) 0%, rgba(7,3,15,0.55) 38%, rgba(7,3,15,0.15) 62%, transparent 85%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none md:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,3,15,0.72) 0%, rgba(7,3,15,0.55) 40%, rgba(7,3,15,0.72) 100%)",
        }}
      />
      {/* Soft radial vignette for edges */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 100% at 50% 50%, transparent 45%, rgba(7,3,15,0.55) 100%)",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-12 gap-x-4 md:gap-x-6 items-center">

          {/* Left — copy */}
          <div className="col-span-12 lg:col-span-7 z-20 text-center lg:text-left">

            {/* Badge row — "built by Cuephoria Tech" + social proof */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6"
            >
              <a
                href="https://cuephoriatech.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors hover:text-white"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(167,139,250,0.18) 0%, rgba(236,72,153,0.14) 100%)",
                  border: "1px solid rgba(167,139,250,0.35)",
                  color: "#ede9fe",
                  backdropFilter: "blur(8px)",
                }}
                aria-label="A Cuephoria Tech product"
              >
                <Sparkles size={12} className="text-fuchsia-300" />
                A <span className="text-white">Cuephoria&nbsp;Tech</span> product
              </a>

              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide text-emerald-100/90"
                style={{
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.28)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ShieldCheck size={11} className="text-emerald-300" />
                Battle-tested at Cuephoria Gaming Lounge
              </span>
            </motion.div>

            <motion.h1
              id="hero-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold leading-[1.02] tracking-[-0.03em] mb-6 text-white"
            >
              Snooker. 8-Ball. Esports.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #a78bfa 0%, #f0abfc 40%, #93c5fd 80%, #a78bfa 100%)",
                  backgroundSize: "200% 100%",
                  animation: reduceMotion ? undefined : "hueShift 6s ease-in-out infinite",
                }}
              >
                One billing OS to run them all.
              </span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0"
            >
              Cuetronix is the <span className="text-white font-semibold">snooker, 8-ball &amp; gaming centre billing software</span> built for modern venues — tables, consoles, VR, cafe,
              bookings, loyalty and multi-branch reports in one operating system.
              Engineered by <a
                href="https://cuephoriatech.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-200 underline-offset-4 hover:underline"
              >Cuephoria Tech</a> and proven live at{" "}
              <a
                href="https://cuephoria.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fuchsia-200 underline-offset-4 hover:underline"
              >Cuephoria Gaming Lounge</a>.
            </motion.p>

            {/* Keyword pills — search-intent optimised */}
            <motion.ul
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-wrap justify-center lg:justify-start gap-2 mb-9"
              aria-label="Software categories"
            >
              {[
                "Snooker billing software",
                "8-ball pool POS",
                "Gaming centre software",
                "PS5 / Xbox rental",
                "VR arcade management",
              ].map((k) => (
                <li
                  key={k}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-gray-300 backdrop-blur-md"
                >
                  {k}
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-stretch sm:items-center"
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
                className="border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1] text-base px-8 h-14 rounded-xl backdrop-blur-md"
              >
                <Play size={16} className="mr-2" />
                See it in action
              </Button>
            </motion.div>
          </div>

          {/* Right — 3-D tilt dashboard */}
          <div className="col-span-12 lg:col-span-5 mt-16 lg:mt-0 relative hidden md:flex items-center justify-center">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
              className="w-full max-w-md"
            >
              <TiltCard reduceMotion={reduceMotion} className="relative w-full aspect-[4/5]">

                {/* Ambient glow behind the card */}
                <div className="absolute inset-[-20%] bg-gradient-to-tr from-violet-600/25 to-fuchsia-600/25 rounded-[50%] blur-[70px]" />

                {/* Main dashboard card */}
                <div className="absolute inset-0 rounded-3xl border border-white/[0.12] bg-[#0a0514]/80 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
                  style={{ transform: "translateZ(0px)", transformStyle: "preserve-3d" }}
                >
                  {/* Browser chrome */}
                  <div className="h-11 border-b border-white/[0.07] flex items-center px-4 gap-3 bg-white/[0.02] flex-shrink-0">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="h-5 flex-1 bg-white/[0.04] rounded-md flex items-center px-2 gap-1.5 mx-auto max-w-[160px]">
                      <div className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
                      <div className="h-1.5 w-16 bg-white/10 rounded" />
                    </div>
                  </div>

                  {/* Dashboard body */}
                  <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
                    {/* Top stat cards */}
                    <div className="flex gap-3 flex-shrink-0">
                      {[
                        { label: "Revenue today", color: "from-violet-400 to-fuchsia-400", width: "w-20" },
                        { label: "Active now", color: "from-emerald-400 to-cyan-400", width: "w-12" },
                      ].map(({ label, color, width }) => (
                        <div key={label} className="flex-1 bg-white/[0.05] border border-white/[0.06] rounded-xl p-3">
                          <div className="h-2 w-14 bg-white/10 rounded mb-2.5" />
                          <div className={`h-5 ${width} bg-gradient-to-r ${color} rounded opacity-90`} />
                        </div>
                      ))}
                    </div>

                    {/* Chart area */}
                    <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-end gap-2 relative overflow-hidden min-h-0">
                      <div className="absolute top-3 left-4 flex items-center gap-2">
                        <div className="h-2.5 w-20 bg-white/10 rounded" />
                        <div className="h-2 w-10 bg-violet-400/30 rounded" />
                      </div>
                      <div className="flex items-end justify-between gap-1.5 h-28">
                        {[38, 58, 43, 76, 52, 88, 67, 94, 71].map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ scaleY: 0, originY: 1 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 1.4, delay: 0.6 + i * 0.08, ease: "easeOut" }}
                            className="flex-1 rounded-t-sm"
                            style={{
                              height: `${h}%`,
                              background: i === 7
                                ? "linear-gradient(to top, #7c3aed, #e879f9)"
                                : "linear-gradient(to top, rgba(124,58,237,0.5), rgba(232,121,249,0.5))",
                              boxShadow: i === 7 ? "0 0 12px rgba(232,121,249,0.5)" : "none",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Station row */}
                    <div className="flex-shrink-0 bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex gap-2">
                      {[
                        { active: false, icon: <Gamepad2 size={16} className="text-white/20" /> },
                        { active: true,  icon: <Gamepad2 size={16} className="text-fuchsia-300" /> },
                        { active: false, icon: <Gamepad2 size={16} className="text-white/20" /> },
                        { active: true,  icon: <Gamepad2 size={16} className="text-emerald-400" /> },
                      ].map(({ active, icon }, i) => (
                        <div key={i} className={`flex-1 rounded-lg border flex flex-col items-center justify-center gap-1.5 py-2 ${active ? "border-white/10 bg-white/[0.05]" : "border-white/[0.04] bg-transparent"}`}>
                          {icon}
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(240,171,252,0.8)]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ─ Floating badge: active station ─ */}
                <motion.div
                  animate={reduceMotion ? {} : { y: [0, -14, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-20 -left-14 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-3 select-none"
                  style={{
                    background: "rgba(10,5,20,0.88)",
                    transform: "translateZ(60px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(167,139,250,0.15)",
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Station 4 Active</div>
                    <div className="text-xs text-emerald-400 font-mono">01:24:05 elapsed</div>
                  </div>
                </motion.div>

                {/* ─ Floating badge: payment ─ */}
                <motion.div
                  animate={reduceMotion ? {} : { y: [0, 12, 0] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                  className="absolute bottom-28 -right-12 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-3 select-none"
                  style={{
                    background: "rgba(10,5,20,0.88)",
                    transform: "translateZ(40px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,171,252,0.12)",
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                    <Circle size={16} className="text-fuchsia-300" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-pink-300">₹450.00</div>
                    <div className="text-xs text-gray-400">Paid via UPI</div>
                  </div>
                </motion.div>

                {/* ─ Floating badge: booking notification ─ */}
                <motion.div
                  animate={reduceMotion ? {} : { y: [0, -10, 0], x: [0, 4, 0] }}
                  transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                  className="absolute bottom-12 -left-10 px-3.5 py-2.5 rounded-xl border border-white/10 backdrop-blur-xl shadow-xl flex items-center gap-2.5 select-none"
                  style={{
                    background: "rgba(10,5,20,0.88)",
                    transform: "translateZ(30px)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.12)",
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-300" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">New booking</div>
                    <div className="text-[10px] text-gray-400">PS5 · 3 hrs · just now</div>
                  </div>
                </motion.div>

              </TiltCard>
            </motion.div>
          </div>
        </div>

        {/* ── Metrics strip ── */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 border-t border-white/10 pt-12"
        >
          {HERO_METRICS.map((m) => (
            <div key={m.label} className="text-center">
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

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
