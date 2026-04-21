import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, CheckCircle2, LifeBuoy, ShieldCheck, Sparkles, Clock, Headphones, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget?: (opts: { url: string; parentElement: HTMLElement }) => void;
      initInlineWidgets?: () => void;
    };
  }
}

const CALENDLY_URL =
  "https://calendly.com/d/ctyh-bmd-wc7?background_color=0f091a&text_color=ffffff&primary_color=b850f2";

const CALL_OUTCOMES = [
  "Audit your current booking and counter workflow",
  "Map your stations, tables, cafe and pricing structure",
  "Show the exact online booking to checkout journey",
  "Plan launch, migration and staff onboarding with you",
];

const CALL_FACTS = [
  { icon: Clock,      label: "Guided demo",    value: "30 mins" },
  { icon: Headphones, label: "Response time",  value: "<24 hrs" },
  { icon: Rocket,     label: "Go-live help",   value: "Included" },
];

const FinalCtaSection: React.FC = () => {
  const navigate = useNavigate();
  const calendlyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = calendlyRef.current;
    if (!parent) return;

    const mount = () => {
      if (!parent || parent.childElementCount > 0) return;
      window.Calendly?.initInlineWidget?.({ url: CALENDLY_URL, parentElement: parent });
    };

    // If widget.js is already loaded, mount immediately
    if (window.Calendly?.initInlineWidget) {
      mount();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]',
    );
    if (existing) {
      existing.addEventListener("load", mount, { once: true });
      // script may have already loaded before this effect ran
      if (window.Calendly?.initInlineWidget) mount();
      return () => existing.removeEventListener("load", mount);
    }

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = mount;
    document.body.appendChild(script);

    // Calendly CSS (optional but recommended for proper widget styling)
    if (!document.querySelector<HTMLLinkElement>(
      'link[href="https://assets.calendly.com/assets/external/widget.css"]',
    )) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(link);
    }

    return () => { script.onload = null; };
  }, []);

  return (
    <section id="book-call" className="relative z-10 scroll-mt-32 py-24 sm:py-32 px-5 sm:px-8 overflow-hidden">
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6), transparent)" }} />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.5), transparent)" }} />
      </div>
      {/* grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="max-w-7xl mx-auto relative">

        {/* Section header */}
        <div className="text-center mb-14">
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
            Let's talk
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Ready to run your lounge<br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #a78bfa, #f0abfc, #a78bfa)", backgroundSize: "200%",
                animation: "hueShift 6s ease-in-out infinite" }}>
              {" "}like a tech company?
            </span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg">
            Start your 14-day free trial instantly, or book a call and we'll map your exact venue setup — stations, pricing, cafe, memberships, and launch plan.
          </motion.p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">

          {/* ── Left: value prop ── */}
          <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }}
            className="relative overflow-hidden rounded-[32px] p-8 sm:p-10"
            style={{
              background: "linear-gradient(160deg, rgba(139,92,246,0.22) 0%, rgba(236,72,153,0.12) 48%, rgba(8,4,17,0.92) 100%)",
              border: "1px solid rgba(167,139,250,0.24)",
              backdropFilter: "blur(22px)",
            }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(217,70,239,0.22), transparent 70%)" }} />

            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 shadow-lg backdrop-blur">
                <Sparkles size={13} /> White-glove setup for serious venues
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.08] mb-5">
                Want a premium walkthrough before you launch?
              </h3>
              <p className="text-gray-200 text-base leading-relaxed mb-8 max-w-xl">
                Book a call and we will map your exact lounge setup: stations, pricing, memberships, bookings, cafe, and launch plan. This is built to feel concierge, not self-serve chaos.
              </p>

              <div className="space-y-2.5 mb-8">
                {CALL_OUTCOMES.map((item) => (
                  <div key={item}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-gray-100">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {CALL_FACTS.map((f) => (
                  <div key={f.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md text-center">
                    <f.icon size={18} className="text-fuchsia-300 mx-auto mb-2" />
                    <div className="text-xl font-extrabold text-white">{f.value}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/40">{f.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => navigate("/signup")}
                  className="h-13 rounded-xl bg-white px-7 text-base font-bold text-[#1a0a2e] shadow-2xl shadow-fuchsia-600/30 hover:bg-gray-50">
                  Start free trial <ArrowRight size={18} className="ml-2" />
                </Button>
                <a href="mailto:hello@cuetronix.com?subject=Cuetronix%20demo%20request"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10">
                  <LifeBuoy size={18} /> Email instead
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-2.5 text-sm text-gray-300">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
                  <CalendarDays size={12} className="text-fuchsia-300" /> Direct booking in-page
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
                  <ShieldCheck size={12} className="text-violet-300" /> Secure rollout planning
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
                  <CheckCircle2 size={12} className="text-emerald-400" /> No credit card needed
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Calendly ── */}
          <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f091a]/80 shadow-[0_24px_70px_-30px_rgba(168,85,247,0.55)] backdrop-blur-2xl">
            <div className="border-b border-white/10 px-7 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-300 mb-1">Book a call</div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Choose a slot — meet us directly.
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                Live product walkthrough, migration discussion, or launch planning for your venue.
              </p>
            </div>
            <div className="p-3">
              <div
                ref={calendlyRef}
                className="overflow-hidden rounded-[20px] bg-[#0f091a]"
                style={{ minWidth: "320px", height: "clamp(720px, 90vh, 1000px)" }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
};

export default FinalCtaSection;
