import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Crown, Shield, Users, ArrowRight, Check, BarChart3, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] } } };

const FEATURES = [
  {
    role: "For Owners",
    icon: Crown,
    gradient: "from-amber-500 to-orange-500",
    glow: "rgba(251,191,36,0.15)",
    accent: "text-amber-400",
    border: "border-amber-500/20",
    bg: "from-amber-500/10 to-orange-500/5",
    title: "See the whole board — in real time.",
    desc: "Stop guessing which stations are profitable. Every rupee, every session, every hour — visible on your phone before you close.",
    bullets: [
      "Station revenue & utilization heatmaps",
      "LTV cohort analysis per customer tier",
      "Multi-branch P&L and inter-branch comparisons",
      "Automated daily summaries to your inbox",
    ],
    align: "left",
    mockup: "owner",
  },
  {
    role: "For Staff",
    icon: Shield,
    gradient: "from-cyan-500 to-sky-500",
    glow: "rgba(6,182,212,0.15)",
    accent: "text-cyan-400",
    border: "border-cyan-500/20",
    bg: "from-cyan-500/10 to-sky-500/5",
    title: "A POS that gets out of your way.",
    desc: "Built for a busy Saturday night — not a slow Tuesday afternoon. Your staff will be trained in under an hour.",
    bullets: [
      "Split, merge, or transfer bills mid-session",
      "Barcode scanner + WhatsApp receipt in 2 taps",
      "Loyalty credits applied automatically at checkout",
      "Offline-capable with background sync",
    ],
    align: "right",
    mockup: "staff",
  },
  {
    role: "For Customers",
    icon: Users,
    gradient: "from-violet-500 to-purple-500",
    glow: "rgba(139,92,246,0.15)",
    accent: "text-violet-400",
    border: "border-violet-500/20",
    bg: "from-violet-500/10 to-purple-500/5",
    title: "Your brand. Their pocket.",
    desc: "A white-labeled booking portal on your own domain. Customers book, track visits, and redeem rewards — no app download needed.",
    bullets: [
      "Custom domain & full brand theming",
      "UPI, cards, and wallet payments",
      "Loyalty wallet, membership cards, visit history",
      "Instant booking confirmation via WhatsApp",
    ],
    align: "left",
    mockup: "customer",
  },
];

// ─── Mock UI components ───────────────────────────────────────────────────────
function OwnerMockup() {
  return (
    <div className="absolute inset-0 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="h-3.5 w-28 bg-white/10 rounded" />
        <div className="flex gap-1.5">
          {["Today","Week","Month"].map(l => (
            <div key={l} className="h-6 px-2.5 bg-white/[0.05] border border-white/10 rounded-lg flex items-center">
              <div className="h-1.5 w-8 bg-white/20 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { w: "w-20", gradient: "from-amber-400 to-orange-400" },
          { w: "w-14", gradient: "from-emerald-400 to-teal-400" },
          { w: "w-16", gradient: "from-violet-400 to-fuchsia-400" },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
            <div className="h-2 w-14 bg-white/10 rounded mb-2.5" />
            <div className={`h-5 ${s.w} bg-gradient-to-r ${s.gradient} rounded opacity-90`} />
          </div>
        ))}
      </div>
      <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-end gap-1.5 relative overflow-hidden min-h-0">
        <div className="absolute top-3 left-4 h-2.5 w-20 bg-white/10 rounded" />
        <div className="flex items-end justify-between gap-1.5 h-24">
          {[30,50,40,70,60,88,75,95,80,65,90,72].map((h, i) => (
            <motion.div key={i}
              initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }}
              viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.4 + i * 0.06, ease: "easeOut" }}
              style={{ height: `${h}%`, transformOrigin: "bottom", background: i === 7 ? "linear-gradient(to top,#f59e0b,#fb923c)" : "linear-gradient(to top,rgba(245,158,11,0.35),rgba(251,146,60,0.35))", boxShadow: i===7?"0 0 12px rgba(251,146,60,0.4)":"none" }}
              className="flex-1 rounded-t-sm"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map((_, i) => (
          <div key={i} className={`rounded-xl border p-2.5 ${i===1?"border-amber-500/40 bg-amber-500/10":"border-white/[0.06] bg-white/[0.03]"}`}>
            <div className={`w-2 h-2 rounded-full mb-2 ${i===1?"bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]":i===2?"bg-emerald-400":"bg-white/20"}`} />
            <div className="h-1.5 w-full bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffMockup() {
  return (
    <div className="absolute inset-0 flex">
      <div className="flex-[2] border-r border-white/10 p-5 flex flex-col gap-3">
        <div className="h-9 bg-white/[0.05] border border-white/10 rounded-xl flex items-center px-3 gap-2">
          <div className="w-3.5 h-3.5 bg-white/10 rounded" />
          <div className="h-2 w-24 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {[1,2,3,4,5,6].map((_, i) => (
            <div key={i} className={`rounded-xl border flex flex-col items-center justify-center gap-2 py-3 cursor-pointer transition-all ${i===2?"border-cyan-500/40 bg-cyan-500/10":"border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"}`}>
              <div className={`w-8 h-8 rounded-full ${i===2?"bg-cyan-500/20":"bg-white/5"} flex items-center justify-center`}>
                <div className={`w-4 h-4 rounded ${i===2?"bg-cyan-400":"bg-white/20"}`} />
              </div>
              <div className="h-1.5 w-10 bg-white/10 rounded" />
              <div className={`h-1.5 w-7 rounded ${i===2?"bg-cyan-400/50":"bg-white/5"}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col">
        <div className="h-3 w-20 bg-white/10 rounded mb-4" />
        <div className="flex-1 space-y-2">
          {[
            { w1: "w-24", w2: "w-16", accent: true },
            { w1: "w-20", w2: "w-12", accent: false },
            { w1: "w-16", w2: "w-10", accent: false },
          ].map((row, i) => (
            <div key={i} className="flex justify-between items-center p-2.5 bg-white/[0.04] rounded-lg border border-white/[0.05]">
              <div className={`h-2 ${row.w1} bg-white/20 rounded`} />
              <div className={`h-2 ${row.w2} ${row.accent?"bg-cyan-400/60":"bg-white/30"} rounded`} />
            </div>
          ))}
        </div>
        <div className="mt-auto pt-3 border-t border-white/10 space-y-2.5">
          <div className="flex justify-between">
            <div className="h-2 w-10 bg-white/10 rounded" />
            <div className="h-2 w-16 bg-white/40 rounded" />
          </div>
          <div className="h-10 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 flex items-center justify-center">
            <div className="h-2 w-16 bg-white/40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerMockup() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-900/20 to-purple-900/10">
      <div className="w-[240px] bg-[#0d0520] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-violet-600/40 to-purple-700/30 relative flex items-end px-5 pb-0">
          <div className="absolute bottom-0 left-5 translate-y-1/2 w-14 h-14 rounded-full bg-[#0d0520] border-4 border-[#0d0520] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
          </div>
        </div>
        <div className="pt-10 px-5 pb-5 space-y-3">
          <div>
            <div className="h-3.5 w-24 bg-white/20 rounded mb-1" />
            <div className="h-2 w-16 bg-violet-400/40 rounded" />
          </div>
          <div className="bg-white/[0.05] border border-white/[0.07] rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="h-2 w-14 bg-white/15 rounded mb-1.5" />
              <div className="h-3.5 w-20 bg-white/35 rounded" />
            </div>
            <div className="w-9 h-9 bg-violet-500/15 border border-violet-500/25 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {["PS5","Pool","VR"].map(l => (
              <div key={l} className="bg-white/[0.04] border border-white/[0.06] rounded-lg py-2 text-center">
                <div className="h-2 w-6 bg-white/20 rounded mx-auto mb-1" />
                <div className="h-1.5 w-8 bg-white/10 rounded mx-auto" />
              </div>
            ))}
          </div>
          <div className="h-10 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
            <div className="h-2 w-20 bg-white/40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCKUP_MAP: Record<string, React.FC> = { owner: OwnerMockup, staff: StaffMockup, customer: CustomerMockup };

// ─── Main section ─────────────────────────────────────────────────────────────
const FeatureDepthSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="modules" className="relative z-10 scroll-mt-32 py-24 sm:py-32 px-5 sm:px-8">
      {/* background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
            Role-Based Value
          </motion.p>
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Built for every person in your lounge.
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-gray-400 max-w-2xl mx-auto text-lg">
            A generic POS only serves the cashier. Cuetronix gives specialised tools to the owner, the floor staff, and the customer — all connected.
          </motion.p>
        </div>

        {/* Feature alternating rows */}
        <div className="space-y-28">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            const isLeft = f.align === "left";
            const MockupComponent = MOCKUP_MAP[f.mockup];

            return (
              <div key={idx} className="grid grid-cols-12 gap-x-6 md:gap-x-12 items-center">

                {/* Copy */}
                <motion.div
                  className={`col-span-12 md:col-span-5 ${isLeft ? "md:order-1" : "md:order-2"} mb-12 md:mb-0`}
                  initial={{ opacity: 0, x: isLeft ? -24 : 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.65 }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 8px 24px ${f.glow}` }}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-wider ${f.accent}`}>{f.role}</span>
                  </div>

                  <h3 className="text-3xl sm:text-[2.2rem] font-extrabold tracking-tight mb-4 leading-tight text-white">
                    {f.title}
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-7">{f.desc}</p>

                  <ul className="space-y-3 mb-8">
                    {f.bullets.map((b, i) => (
                      <motion.li key={i}
                        initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex items-start gap-2.5 text-sm text-gray-300">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                          <Check size={11} className="text-emerald-400" />
                        </span>
                        {b}
                      </motion.li>
                    ))}
                  </ul>

                  <Button onClick={() => navigate("/signup")} size="sm"
                    className={`rounded-xl bg-gradient-to-r ${f.gradient} text-white font-semibold px-5 h-10 hover:opacity-90 transition-opacity`}
                    style={{ boxShadow: `0 4px 20px ${f.glow}` }}>
                    Try free for 14 days <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </motion.div>

                {/* Mockup */}
                <motion.div
                  className={`col-span-12 md:col-span-7 ${isLeft ? "md:order-2" : "md:order-1"}`}
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.8 }}
                >
                  <div className={`relative w-full aspect-[16/10] rounded-3xl overflow-hidden border ${f.border} shadow-2xl`}
                    style={{ background: "rgba(10,5,20,0.8)" }}>
                    {/* gradient tint */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${f.bg} pointer-events-none`} />
                    {/* ambient glow */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
                      style={{ background: f.glow }} />
                    {/* content */}
                    <div className="absolute inset-3 rounded-2xl overflow-hidden bg-[#08030f]/80">
                      <MockupComponent />
                    </div>
                    {/* role badge */}
                    <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${f.border} backdrop-blur-md`}
                      style={{ background: "rgba(0,0,0,0.4)" }}>
                      <Icon size={11} className={f.accent} />
                      <span className={f.accent}>{f.role}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="mt-24 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 px-8 py-6 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[BarChart3, Zap, Globe].map((Icon, i) => (
                <div key={i} className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <Icon size={14} className="text-fuchsia-300" />
                </div>
              ))}
            </div>
            <p className="text-white font-semibold text-sm sm:text-base">
              All modules. One platform. One monthly price.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/signup")}
              className="h-10 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-bold px-5 hover:opacity-95 shadow-lg shadow-fuchsia-600/30">
              Start free trial <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureDepthSection;
