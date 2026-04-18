import { motion } from "framer-motion";
import { XCircle, CheckCircle2 } from "lucide-react";

const PROBLEMS = [
  "Juggling WhatsApp DMs for bookings",
  "Manual Excel sheets for station timers",
  "Separate bills for gaming and cafe",
  "No visibility into station utilization",
];

const SOLUTIONS = [
  {
    title: "Automated Bookings",
    desc: "Customers book and pay online through your branded portal. No more back-and-forth.",
  },
  {
    title: "Unified POS",
    desc: "One bill for the PS5, the pool table, and the cappuccino. Split it, merge it, print it.",
  },
  {
    title: "Real-time Station Engine",
    desc: "Per-minute billing, frame-based pricing, and automatic happy-hour overrides.",
  },
  {
    title: "Deep Analytics",
    desc: "See exactly which stations make money, when your peak hours are, and who your whales are.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const ProblemSolutionSection: React.FC = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-8 border-y border-white/[0.05] bg-white/[0.01]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-x-4 md:gap-x-12 lg:gap-x-16">
          
          {/* Left Column: Sticky Problem Statement (4 cols) */}
          <div className="col-span-12 md:col-span-5 lg:col-span-4 mb-16 md:mb-0">
            <div className="md:sticky md:top-32">
              <motion.p 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-4"
              >
                The Old Way
              </motion.p>
              <motion.h2 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 leading-tight"
              >
                Stop fighting your tools.
              </motion.h2>
              <motion.p 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="text-gray-400 text-base leading-relaxed mb-8"
              >
                Running a lounge is hard enough. You shouldn't have to duct-tape generic POS systems, spreadsheets, and messaging apps together just to close out a Saturday night.
              </motion.p>
              
              <ul className="space-y-4">
                {PROBLEMS.map((p, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 text-sm text-gray-300"
                  >
                    <XCircle size={18} className="text-red-400/70 shrink-0 mt-0.5" />
                    {p}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Scrolling Solutions (8 cols) */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="grid sm:grid-cols-2 gap-6"
            >
              {SOLUTIONS.map((s, i) => (
                <motion.article
                  key={i}
                  variants={fadeUp}
                  className="group relative rounded-2xl p-8 overflow-hidden transition-all hover:bg-white/[0.04]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold tracking-tight mb-3 text-white/90 group-hover:text-white transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {s.desc}
                  </p>
                </motion.article>
              ))}
            </motion.div>
            
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-fuchsia-500/20"
            >
              <h4 className="text-lg font-bold mb-2">The Cuetronix Difference</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                We built this because we run our own venues. Every feature — from mid-session station transfers to frame-based pool pricing — was earned on a busy floor.
              </p>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;
