import { motion } from "framer-motion";
import { Shield, Lock, Zap, Database } from "lucide-react";

const TRUST_METRICS = [
  { value: "99.98%", label: "Uptime SLA" },
  { value: "<100ms", label: "P95 API Latency" },
  { value: "50k+", label: "Bookings Processed" },
  { value: "100%", label: "Data Isolation" },
];

const INTEGRATIONS = [
  "Razorpay", "WhatsApp", "Supabase", "Resend", "Google Maps", "TOTP 2FA"
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const TrustSection: React.FC = () => {
  return (
    <section className="relative z-10 py-32 px-5 sm:px-8 border-y border-white/[0.05] bg-white/[0.01]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-x-4 md:gap-x-12">
          
          {/* Left Column: Deep Case Study (7 cols) */}
          <div className="col-span-12 lg:col-span-7 mb-16 lg:mb-0">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="relative rounded-3xl p-10 sm:p-14 overflow-hidden h-full"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(236,72,153,0.06) 60%, rgba(7,3,15,0) 100%)",
                border: "1px solid rgba(167,139,250,0.18)",
              }}
            >
              <div className="absolute -top-32 -left-16 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" aria-hidden />
              
              <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-300 font-semibold mb-4">
                The Cuephoria Story
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
                Built by operators, for operators.
              </h2>
              
              <div className="space-y-5 text-gray-300 leading-relaxed max-w-2xl text-lg">
                <p>
                  Cuetronix started as the internal toolset that runs <strong className="text-white">Cuephoria</strong>, a premium gaming lounge in Trichy with PS5, VR, and professional pool tables. 
                </p>
                <p>
                  Every friction we felt on a busy Saturday night turned into a feature: mid-session station transfers, combined cafe + gaming bills, frame-based pool pricing, happy-hour auto-overrides, and loyalty credits that work across branches.
                </p>
                <p>
                  Two years and tens of thousands of bookings later, we opened the platform up to other operators — because the gaming lounge industry deserved software made by people who actually close the cash drawer at 2 AM.
                </p>
              </div>

              {/* Case Study Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-10">
                {[
                  { value: "2 Years", label: "Live Ops" },
                  { value: "9 Modules", label: "In Prod" },
                  { value: "100%", label: "Battle Tested" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-4 text-center bg-white/[0.03] border border-white/10">
                    <div className="text-xl font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      {s.value}
                    </div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Security & Integrations (5 cols) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
              className="space-y-8"
            >
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold tracking-tight mb-4">Enterprise-grade security.</h3>
                <p className="text-gray-400 text-base leading-relaxed mb-6">
                  Every tenant is isolated with row-level security on a hardened Postgres backend. Passwords use PBKDF2-SHA-256, admins can enrol in TOTP two-factor, and every sensitive action is written to an append-only audit log.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Shield, label: "Row-Level Security" },
                    { icon: Lock, label: "TOTP 2FA" },
                    { icon: Zap, label: "Append-only Audit" },
                    { icon: Database, label: "Tenant Isolation" },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                      <f.icon size={16} className="text-violet-400" />
                      {f.label}
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="pt-8 border-t border-white/10">
                <h3 className="text-lg font-bold tracking-tight mb-4">Integrations that just work.</h3>
                <div className="flex flex-wrap gap-2">
                  {INTEGRATIONS.map((integ, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-gray-300 font-medium"
                    >
                      {integ}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default TrustSection;
