import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Zap, Database, ArrowRight, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65 } } };

const METRICS = [
  { value: "99.98%", label: "Uptime SLA", sub: "across all tenants" },
  { value: "<100ms", label: "P95 API latency", sub: "globally served" },
  { value: "50k+",   label: "Bookings processed", sub: "and counting" },
  { value: "100%",   label: "Tenant isolation", sub: "row-level security" },
];

const SECURITY = [
  { icon: Shield,   label: "Row-Level Security",  desc: "Every tenant sees only their data — enforced at the database layer, not just the app." },
  { icon: Lock,     label: "TOTP 2FA",             desc: "Time-based one-time passwords for all admin accounts. Backup codes included." },
  { icon: Zap,      label: "Append-only Audit Log",desc: "Every sensitive action is timestamped and stored. Full trail, no editing." },
  { icon: Database, label: "PBKDF2-SHA-256",       desc: "Industry-standard password hashing. No plaintext, no shortcuts." },
];

const INTEGRATIONS = [
  { name: "Razorpay",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  { name: "WhatsApp",    color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  { name: "Supabase",    color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20" },
  { name: "Google Maps", color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
  { name: "Resend",      color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { name: "TOTP 2FA",    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
];

const TESTIMONIALS = [
  {
    quote: "We went from WhatsApp chaos to a clean digital operation in one afternoon. Staff loved it within the first shift.",
    author: "Cuephoria Trichy",
    role: "Founding venue · PS5, VR, Pool",
    stars: 5,
  },
  {
    quote: "The combined bill feature alone saved us 45 minutes of reconciliation every single night. It just works.",
    author: "Gaming Lounge Operator",
    role: "Multi-station venue · 12 consoles",
    stars: 5,
  },
  {
    quote: "Our customers love booking online. Repeat bookings went up 38% in the first month after we launched the portal.",
    author: "Esports Cafe Owner",
    role: "PC + Console · 20-seat venue",
    stars: 5,
  },
];

const TrustSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="trust" className="relative z-10 scroll-mt-32 py-24 sm:py-32 px-5 sm:px-8">
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.4), transparent 70%)" }} />
      </div>

      <div className="max-w-7xl mx-auto relative">

        {/* ── Metrics strip ── */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {METRICS.map((m) => (
            <motion.div key={m.label} variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur-md hover:border-violet-500/30 transition-colors">
              <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent tracking-tight">
                {m.value}
              </div>
              <div className="text-white text-sm font-semibold mt-1">{m.label}</div>
              <div className="text-gray-600 text-xs mt-0.5">{m.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Origin story + security ── */}
        <div className="grid grid-cols-12 gap-x-6 md:gap-x-10 mb-20">

          {/* Left: origin story */}
          <motion.div className="col-span-12 lg:col-span-7 mb-12 lg:mb-0"
            initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65 }}>
            <div className="relative rounded-3xl p-8 sm:p-10 overflow-hidden h-full"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(236,72,153,0.06) 60%, rgba(7,3,15,0) 100%)",
                border: "1px solid rgba(167,139,250,0.18)",
              }}>
              <div className="absolute -top-24 -left-12 w-64 h-64 rounded-full blur-3xl opacity-50"
                style={{ background: "rgba(139,92,246,0.2)" }} />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-300 font-semibold mb-3">The Cuephoria Story</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                  Built by operators,<br />for operators.
                </h2>
                <div className="space-y-4 text-gray-300 leading-relaxed text-base sm:text-lg max-w-2xl">
                  <p>
                    Cuetronix started as the internal toolset running <strong className="text-white">Cuephoria</strong> — a premium gaming lounge in Trichy with PS5s, VR pods, and professional pool tables.
                  </p>
                  <p>
                    Every friction we felt on a busy Saturday night became a feature: mid-session station transfers, combined cafe + gaming bills, frame-based pool pricing, happy-hour auto-overrides, and loyalty credits that work across branches.
                  </p>
                  <p>
                    Two years and tens of thousands of bookings later, we opened the platform to other operators — because the gaming lounge industry deserved software made by people who actually close the cash drawer at 2 AM.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-8">
                  {[{ v: "2 Years", l: "Live Ops" }, { v: "9 Modules", l: "In Production" }, { v: "100%", l: "Battle-Tested" }].map(s => (
                    <div key={s.l} className="rounded-xl p-4 text-center bg-white/[0.04] border border-white/10">
                      <div className="text-xl font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{s.v}</div>
                      <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: security + integrations */}
          <motion.div className="col-span-12 lg:col-span-5 flex flex-col gap-6"
            initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.1 }}>

            <div>
              <h3 className="text-2xl font-bold tracking-tight mb-5 text-white">Enterprise-grade security.</h3>
              <div className="space-y-3">
                {SECURITY.map((s, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/25 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <s.icon size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{s.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-white/10">
              <h3 className="text-base font-bold tracking-tight mb-3 text-gray-200">Integrations that just work.</h3>
              <div className="flex flex-wrap gap-2">
                {INTEGRATIONS.map((integ) => (
                  <span key={integ.name}
                    className={`px-3 py-1.5 rounded-lg ${integ.bg} border ${integ.border} text-sm ${integ.color} font-medium backdrop-blur-sm`}>
                    {integ.name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Testimonials ── */}
        <div className="mb-16">
          <motion.div className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-2">Operators love it</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">What venues are saying.</h3>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={fadeUp}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md flex flex-col justify-between hover:border-fuchsia-500/25 hover:bg-white/[0.06] transition-all duration-300">
                <div>
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, s) => (
                      <Star key={s} size={13} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.07]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {t.author[0]}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{t.author}</div>
                    <div className="text-gray-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── CTA strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(219,39,119,0.15) 50%, rgba(7,3,15,0.9) 100%)",
            border: "1px solid rgba(167,139,250,0.22)",
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 60% at 20% 50%, rgba(139,92,246,0.15), transparent)" }} />
          <div className="relative px-8 py-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">14 days free · No credit card</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Ready to modernise your venue?
              </h3>
              <p className="text-gray-400 mt-1.5 text-base max-w-lg">
                Join operators who switched from WhatsApp chaos to a proper operating system.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Button onClick={() => navigate("/signup")} size="lg"
                className="h-12 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-bold px-7 hover:opacity-95 shadow-xl shadow-fuchsia-600/30">
                Start free trial <ArrowRight size={16} className="ml-2" />
              </Button>
              <button onClick={() => document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 rounded-xl border border-white/15 bg-white/[0.05] text-white font-semibold px-7 hover:bg-white/[0.1] transition-colors text-sm">
                Book a demo call
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default TrustSection;
