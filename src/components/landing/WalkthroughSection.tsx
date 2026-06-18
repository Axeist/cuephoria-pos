import { motion } from "framer-motion";
import { Calendar, Monitor, ShoppingCart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    title: "The Booking",
    description:
      "Customer books on your branded portal, pays via UPI, gets a QR code. No WhatsApp. No back-and-forth. The slot is confirmed before they leave their couch.",
    icon: Calendar,
    color: "indigo" as const,
  },
  {
    number: "02",
    title: "The Session",
    description:
      "Staff scans the QR and the timer starts instantly. Need to transfer between PS5 and a pool table? One click — time and cart carry over. Zero friction.",
    icon: Monitor,
    color: "violet" as const,
  },
  {
    number: "03",
    title: "The POS",
    description:
      "Add a cappuccino directly to the active station mid-session. When they're done, one combined bill — gaming, cafe, everything. Checkout in under 30 seconds.",
    icon: ShoppingCart,
    color: "fuchsia" as const,
  },
  {
    number: "04",
    title: "The Reports",
    description:
      "Revenue by station. Utilization heatmaps. Staff reconciliation. Check it at 2 AM from your phone. Know exactly where every rupee came from.",
    icon: LayoutDashboard,
    color: "emerald" as const,
  },
];

const COLOR_MAP = {
  indigo: {
    iconBg: "from-indigo-500 to-violet-600",
    iconRing: "rgba(99,102,241,0.35)",
    glow: "rgba(99,102,241,0.10)",
    numColor: "text-indigo-300",
    pillBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    dot: "bg-indigo-400",
    connectorFrom: "rgba(99,102,241,0.5)",
    connectorTo: "rgba(139,92,246,0.5)",
  },
  violet: {
    iconBg: "from-violet-500 to-fuchsia-600",
    iconRing: "rgba(139,92,246,0.35)",
    glow: "rgba(139,92,246,0.10)",
    numColor: "text-violet-300",
    pillBg: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
    connectorFrom: "rgba(139,92,246,0.5)",
    connectorTo: "rgba(217,70,239,0.5)",
  },
  fuchsia: {
    iconBg: "from-fuchsia-500 to-pink-600",
    iconRing: "rgba(217,70,239,0.35)",
    glow: "rgba(217,70,239,0.10)",
    numColor: "text-fuchsia-300",
    pillBg: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    dot: "bg-fuchsia-400",
    connectorFrom: "rgba(217,70,239,0.5)",
    connectorTo: "rgba(16,185,129,0.5)",
  },
  emerald: {
    iconBg: "from-emerald-500 to-teal-600",
    iconRing: "rgba(16,185,129,0.35)",
    glow: "rgba(16,185,129,0.10)",
    numColor: "text-emerald-300",
    pillBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    connectorFrom: "rgba(16,185,129,0.5)",
    connectorTo: "transparent",
  },
};

const METRIC_PILLS = [
  { label: "Booking", color: "indigo" as const },
  { label: "Session", color: "violet" as const },
  { label: "POS", color: "fuchsia" as const },
  { label: "Reports", color: "emerald" as const },
];

// ─── Component ────────────────────────────────────────────────────────────────

const WalkthroughSection: React.FC = () => {
  const scrollToBookCall = () => {
    document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="workflow"
      className="relative overflow-hidden scroll-mt-24 py-28 md:py-36"
    >
      {/* ── Dot-grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(167,139,250,0.028) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Ambient glows ── */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">

        {/* ── Section header ── */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-xs font-bold tracking-[0.18em] uppercase text-fuchsia-400 mb-4 block"
          >
            The Workflow
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-5"
          >
            From booking to checkout —{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #a78bfa 0%, #f0abfc 50%, #93c5fd 100%)",
              }}
            >
              seamlessly.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Four steps. One platform. Every customer interaction handled without duct-tape or
            second-guessing.
          </motion.p>
        </div>

        {/* ── Steps 2-column grid ── */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

          {/* Desktop connecting line (vertical, left col) */}
          <div
            className="absolute hidden xl:block pointer-events-none"
            style={{
              left: "calc(50% - 1px)",
              top: "10%",
              bottom: "10%",
              width: "1px",
              background:
                "linear-gradient(to bottom, transparent, rgba(167,139,250,0.2) 15%, rgba(167,139,250,0.2) 85%, transparent)",
            }}
          />

          {STEPS.map((step, i) => {
            const c = COLOR_MAP[step.color];
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.15 }}
                whileHover={{ y: -6, transition: { duration: 0.22 } }}
                className="group relative rounded-3xl border overflow-hidden cursor-default select-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.10)",
                  transition: "border-color 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = `rgba(255,255,255,0.18)`;
                  el.style.boxShadow = `0 0 40px ${c.glow}, 0 20px 60px rgba(0,0,0,0.35)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(255,255,255,0.10)";
                  el.style.boxShadow = "none";
                }}
              >
                {/* Background step number watermark */}
                <div
                  className={`absolute top-4 right-5 text-8xl font-black opacity-[0.07] leading-none select-none pointer-events-none ${c.numColor}`}
                  aria-hidden
                >
                  {step.number}
                </div>

                {/* Hover glow blob */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
                  }}
                />

                <div className="relative p-7 md:p-8 flex flex-col gap-5 h-full">

                  {/* Icon circle */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center shadow-lg`}
                    style={{ boxShadow: `0 0 20px ${c.iconRing}` }}
                  >
                    <Icon size={22} className="text-white" />
                  </div>

                  {/* Step label */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${c.pillBg}`}
                    >
                      Step {step.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-base leading-relaxed flex-1">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Metric pill bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: "easeOut", delay: 0.2 }}
          className="mt-16 flex items-center justify-center gap-0 flex-wrap sm:flex-nowrap"
        >
          {METRIC_PILLS.map((pill, i) => {
            const c = COLOR_MAP[pill.color];
            const isLast = i === METRIC_PILLS.length - 1;
            return (
              <div key={pill.label} className="flex items-center">
                <div
                  className={`px-5 py-2.5 rounded-full border text-sm font-bold tracking-wide ${c.pillBg}`}
                >
                  <span className={`w-2 h-2 rounded-full inline-block mr-2 align-middle ${c.dot}`} />
                  {pill.label}
                </div>
                {!isLast && (
                  <div
                    className="w-8 h-px mx-1 flex-shrink-0"
                    style={{
                      background: `linear-gradient(to right, ${c.connectorFrom}, ${COLOR_MAP[METRIC_PILLS[i + 1].color].connectorFrom})`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="mt-14 text-center"
        >
          <Button
            size="lg"
            onClick={scrollToBookCall}
            className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white font-bold px-10 h-13 text-base rounded-xl shadow-2xl shadow-fuchsia-600/30 transition-all hover:scale-[1.02]"
          >
            See it in action — book a 30-min demo
          </Button>
        </motion.div>

      </div>
    </section>
  );
};

export default WalkthroughSection;
