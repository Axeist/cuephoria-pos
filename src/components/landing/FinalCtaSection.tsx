import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, CheckCircle2, LifeBuoy, Mail, Phone, ShieldCheck, Sparkles, Clock, Headphones, Rocket } from "lucide-react";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget?: (opts: { url: string; parentElement: HTMLElement }) => void;
      initInlineWidgets?: () => void;
    };
  }
}

const CALENDLY_URL =
  "https://calendly.com/cuephoriatech/30min?background_color=0f091a&text_color=ffffff&primary_color=b850f2";

const CONTACT = {
  sales: "sales@cuephoriatech.in",
  support: "support@cuephoriatech.in",
  phone: "+91 8667637565",
  phoneHref: "tel:+918667637565",
} as const;

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
            className="lp-mono text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
            Let's talk
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lp-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Ready to run your lounge<br className="hidden sm:block" />
            <span className="lp-holo">{" "}like a tech company?</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg">
            Start your 14-day free trial instantly, or book a call and we'll map your exact venue setup — stations, pricing, cafe, memberships, and launch plan.
          </motion.p>
        </div>

        <div className="grid gap-6 items-stretch lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">

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

              <h3 className="lp-display text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08] mb-5">
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
                    <div className="lp-mono text-xl font-bold text-white">{f.value}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/40">{f.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => navigate("/signup")}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-bold text-[#1a0a2e] shadow-2xl shadow-fuchsia-600/30 transition-colors hover:bg-gray-50">
                  Start free trial <ArrowRight size={18} />
                </button>
                <a href={`mailto:${CONTACT.sales}?subject=Cuetronix%20demo%20request`}
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
            className="relative flex flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0f091a]/80 shadow-[0_24px_70px_-30px_rgba(168,85,247,0.55)] backdrop-blur-2xl">
            <div className="border-b border-white/10 px-6 py-4 sm:px-7">
              <div className="lp-mono text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-300 mb-1">Book a call</div>
              <h3 className="lp-display text-xl font-bold tracking-tight text-white">
                Choose a slot — meet us directly.
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                Live product walkthrough, migration discussion, or launch planning for your venue.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
                <a
                  href={`mailto:${CONTACT.sales}`}
                  className="inline-flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
                >
                  <Mail size={14} className="shrink-0 text-fuchsia-300" />
                  <span>
                    <span className="text-white/45">Sales:</span> {CONTACT.sales}
                  </span>
                </a>
                <a
                  href={`mailto:${CONTACT.support}`}
                  className="inline-flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
                >
                  <Mail size={14} className="shrink-0 text-violet-300" />
                  <span>
                    <span className="text-white/45">Support:</span> {CONTACT.support}
                  </span>
                </a>
                <a
                  href={CONTACT.phoneHref}
                  className="inline-flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
                >
                  <Phone size={14} className="shrink-0 text-emerald-300" />
                  <span>
                    <span className="text-white/45">Call:</span> {CONTACT.phone}
                  </span>
                </a>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-5 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5">
              <div
                ref={calendlyRef}
                className="h-full w-full overflow-hidden rounded-2xl bg-[#0f091a] calendly-book-a-call-slot"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        /**
         * The booking card stretches to match the left value-prop card (grid
         * items-stretch + flex column). The Calendly slot fills the remaining
         * height and is tall enough to show the full month view without its own
         * scrollbar. min-height guarantees room on shorter viewports.
         */
        .calendly-book-a-call-slot {
          height: 100%;
          min-height: 660px;
          min-width: 280px;
        }
        .calendly-book-a-call-slot iframe {
          height: 100% !important;
          min-height: 660px !important;
        }
      `}</style>
    </section>
  );
};

export default FinalCtaSection;
