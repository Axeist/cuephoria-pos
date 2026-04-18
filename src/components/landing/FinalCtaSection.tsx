import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidgets?: () => void;
    };
  }
}

const CALENDLY_URL =
  "https://calendly.com/d/ctyh-bmd-wc7?background_color=190c30&text_color=ffffff&primary_color=b850f2";

const CALL_OUTCOMES = [
  "Audit your current booking and counter workflow",
  "Map your stations, tables, cafe and pricing structure",
  "Show the exact online booking to checkout journey",
  "Plan launch, migration and staff onboarding with you",
];

const CALL_FACTS = [
  { label: "Guided demo", value: "30 mins" },
  { label: "Response time", value: "<24 hrs" },
  { label: "Go-live help", value: "Included" },
];

const FinalCtaSection: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]',
    );

    const initializeWidget = () => {
      window.Calendly?.initInlineWidgets?.();
    };

    if (existingScript) {
      initializeWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = initializeWidget;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  return (
    <section id="book-call" className="relative z-10 scroll-mt-32 py-32 px-5 sm:px-8 bg-[#07030f]">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className="relative overflow-hidden rounded-[32px] p-8 sm:p-10 xl:p-12"
            style={{
              background:
                "linear-gradient(160deg, rgba(139,92,246,0.22) 0%, rgba(236,72,153,0.12) 48%, rgba(8,4,17,0.92) 100%)",
              border: "1px solid rgba(167,139,250,0.24)",
              backdropFilter: "blur(22px)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(217,70,239,0.22), transparent 70%)",
              }}
            />
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 shadow-lg backdrop-blur">
                <Sparkles size={14} /> White-glove setup for serious venues
              </div>

              <h2 className="max-w-xl text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-5xl">
                Want a premium walkthrough before you launch?
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-200">
                Start your free trial, or book a call and we will map your exact lounge setup:
                stations, pricing, memberships, bookings, cafe, and launch plan. This is built to
                feel concierge, not self-serve chaos.
              </p>

              <div className="mt-8 grid gap-3">
                {CALL_OUTCOMES.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-gray-100"
                  >
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CALL_FACTS.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                  >
                    <div className="text-2xl font-extrabold text-white">{fact.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                      {fact.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="h-14 rounded-xl bg-white px-8 text-base font-bold text-[#1a0a2e] shadow-2xl shadow-fuchsia-600/30 hover:bg-gray-50"
                >
                  Start free trial <ArrowRight size={20} className="ml-2" />
                </Button>
                <a
                  href="mailto:hello@cuetronix.com?subject=Cuetronix%20demo%20request"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-white/20 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <LifeBuoy size={20} /> Prefer email instead?
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <CalendarDays size={15} className="text-fuchsia-300" />
                  Direct booking inside the page
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <ShieldCheck size={15} className="text-violet-300" />
                  Secure rollout planning for your team
                </span>
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f091a]/80 shadow-[0_24px_70px_-30px_rgba(168,85,247,0.55)] backdrop-blur-2xl"
          >
            <div className="border-b border-white/10 px-6 py-5 sm:px-8">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
                Book a call
              </div>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Choose a slot and meet directly with us.
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                Pick the time that works for you. Use the call for a live product walkthrough, a
                migration discussion, or launch planning for your venue.
              </p>
            </div>

            <div className="p-2 sm:p-4">
              <div
                className="calendly-inline-widget overflow-hidden rounded-[24px]"
                data-url={CALENDLY_URL}
                style={{ minWidth: "320px", height: "700px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
