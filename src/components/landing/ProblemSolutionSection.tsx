import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Static data ──────────────────────────────────────────────────────────────

const PAINS = [
  {
    title: "WhatsApp DMs for bookings",
    detail:
      "Chasing confirmations at midnight. Screenshots as receipts. One missed message kills the slot.",
  },
  {
    title: "Excel sheets + manual timers",
    detail:
      "Staff watching wall clocks. Spreadsheets with formulas that break. Revenue leaking every session.",
  },
  {
    title: "Two separate bills for gaming + cafe",
    detail:
      "Customers settling twice. Staff doing mental arithmetic. Disputes at checkout every single night.",
  },
  {
    title: "Zero visibility into station revenue",
    detail:
      "Which PS5 earns the most? Which hours are dead? You don't know — and that costs you.",
  },
];

const SOLUTIONS = [
  {
    title: "Automated bookings via branded portal with UPI",
    detail:
      "Customers book online, pay instantly, receive a QR. Your staff sees it in the dashboard before they even arrive.",
  },
  {
    title: "Unified POS — one bill for PS5 + cafe + pool",
    detail:
      "Add a cappuccino to an active station mid-session. One combined bill at checkout. Zero disputes.",
  },
  {
    title: "Real-time station engine with per-minute billing",
    detail:
      "Timers start on QR scan. Per-minute or hourly billing. Pauses, transfers, extensions — all in one click.",
  },
  {
    title: "Deep analytics — revenue by station, utilization heatmaps, LTV",
    detail:
      "Know your top earner, your dead hours, your best customers. Data you can act on at 2 AM.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ProblemSolutionSection: React.FC = () => {
  const navigate = useNavigate();

  const scrollToBookCall = () => {
    document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      {/* ── Dot-grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(167,139,250,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Ambient glow blobs ── */}
      <div
        className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(239,68,68,0.035) 0%, transparent 70%)",
          transform: "translate(-30%, -20%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.055) 0%, transparent 70%)",
          transform: "translate(20%, 20%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">

        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="text-center mb-20"
        >
          <span className="text-xs font-bold tracking-[0.18em] uppercase text-red-400 mb-4 block">
            The Old Way Is Breaking Your Business
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
            Sound familiar?
          </h2>
        </motion.div>

        {/* ── Main two-column grid ── */}
        <div className="grid grid-cols-12 gap-x-6 gap-y-12 lg:gap-y-0 items-start">

          {/* ──── LEFT: Pain column (5 cols) ──── */}
          <div className="col-span-12 lg:col-span-5">
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-5 text-center lg:text-left"
            >
              What operators tell us
            </motion.p>

            <div className="flex flex-col gap-4">
              {PAINS.map((pain, i) => (
                <motion.div
                  key={pain.title}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 + i * 0.09 }}
                  whileHover={{ x: 5, transition: { duration: 0.18 } }}
                  className="group flex gap-4 items-start rounded-2xl border p-5 cursor-default select-none"
                  style={{
                    background: "rgba(239,68,68,0.045)",
                    borderColor: "rgba(239,68,68,0.18)",
                    transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(239,68,68,0.085)";
                    el.style.borderColor = "rgba(239,68,68,0.32)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(239,68,68,0.045)";
                    el.style.borderColor = "rgba(239,68,68,0.18)";
                  }}
                >
                  <XCircle
                    size={20}
                    className="flex-shrink-0 mt-0.5 text-red-500 group-hover:text-red-400 transition-colors duration-200"
                  />
                  <div>
                    <div className="text-sm font-bold text-red-200 mb-1 leading-snug">
                      {pain.title}
                    </div>
                    <div className="text-sm text-gray-500 leading-relaxed">
                      {pain.detail}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ──── CENTER: Arrow divider ──── */}
          <div className="col-span-12 lg:col-span-2 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-row lg:flex-col items-center gap-3 lg:gap-4"
            >
              {/* Top connector line (desktop) */}
              <div
                className="hidden lg:block w-px"
                style={{
                  height: "72px",
                  background:
                    "linear-gradient(to bottom, transparent, rgba(232,121,249,0.45))",
                }}
              />

              {/* Arrow + label */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl font-black leading-none select-none hidden lg:block"
                  style={{
                    background: "linear-gradient(135deg, #c084fc, #f0abfc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  →
                </div>
                <div className="block lg:hidden text-2xl font-black leading-none select-none"
                  style={{
                    background: "linear-gradient(135deg, #c084fc, #f0abfc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  ↓
                </div>
                <span
                  className="text-xs font-bold tracking-wide text-center whitespace-nowrap"
                  style={{
                    background: "linear-gradient(90deg, #c084fc, #f0abfc, #c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Here's what<br className="hidden lg:block" /> changes
                </span>
              </div>

              {/* Bottom connector line (desktop) */}
              <div
                className="hidden lg:block w-px"
                style={{
                  height: "72px",
                  background:
                    "linear-gradient(to bottom, rgba(232,121,249,0.45), transparent)",
                }}
              />
            </motion.div>
          </div>

          {/* ──── RIGHT: Solutions column (5 cols) ──── */}
          <div className="col-span-12 lg:col-span-5">
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-5 text-center lg:text-left"
            >
              The Cuetronix way
            </motion.p>

            {/* 2×2 solution grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SOLUTIONS.map((sol, i) => (
                <motion.div
                  key={sol.title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 + i * 0.09 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group flex flex-col gap-3 rounded-2xl border p-5 cursor-default select-none"
                  style={{
                    background: "rgba(139,92,246,0.06)",
                    borderColor: "rgba(139,92,246,0.18)",
                    transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(139,92,246,0.11)";
                    el.style.borderColor = "rgba(139,92,246,0.38)";
                    el.style.boxShadow = "0 0 32px rgba(139,92,246,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(139,92,246,0.06)";
                    el.style.borderColor = "rgba(139,92,246,0.18)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <CheckCircle2
                    size={20}
                    className="text-emerald-400 group-hover:text-emerald-300 flex-shrink-0 transition-colors duration-200"
                  />
                  <div>
                    <div className="text-sm font-bold text-violet-200 mb-1.5 leading-snug">
                      {sol.title}
                    </div>
                    <div className="text-sm text-gray-500 leading-relaxed">
                      {sol.detail}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom callout: "The Cuetronix Difference" ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="mt-20 relative rounded-3xl p-px overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.55) 0%, rgba(232,121,249,0.4) 45%, rgba(59,130,246,0.35) 100%)",
          }}
        >
          <div
            className="relative rounded-3xl px-8 py-12 md:px-16 md:py-14 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-14"
            style={{ background: "rgba(10,4,20,0.96)" }}
          >
            {/* Inner glow */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 55% 90% at 25% 50%, rgba(139,92,246,0.07) 0%, transparent 70%)",
              }}
            />

            <div className="relative flex-1 min-w-0">
              <span className="text-xs font-bold tracking-[0.18em] uppercase text-fuchsia-400 mb-4 block">
                The Cuetronix Difference
              </span>
              <blockquote className="text-2xl md:text-3xl font-extrabold text-white leading-[1.25] tracking-tight mb-4">
                "Built by people who close the cash drawer at 2&nbsp;AM."
              </blockquote>
              <p className="text-gray-400 text-base leading-relaxed max-w-xl">
                We didn't build Cuetronix from a whiteboard. We built it from two years of late closes,
                double-booked stations, and split bills. Every feature exists because we needed it first.
              </p>
            </div>

            <div className="relative flex-shrink-0 flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white font-bold px-8 h-12 rounded-xl shadow-2xl shadow-fuchsia-600/30 transition-all hover:scale-[1.02] whitespace-nowrap"
              >
                Start free trial
                <ArrowRight size={17} className="ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToBookCall}
                className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.09] font-semibold px-8 h-12 rounded-xl backdrop-blur-md whitespace-nowrap"
              >
                Book a call
              </Button>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default ProblemSolutionSection;
