import { motion } from "framer-motion";
import { Users, Crown, Shield } from "lucide-react";

const FEATURES = [
  {
    role: "For Owners",
    title: "See the whole board.",
    desc: "Stop guessing which stations are profitable. Get real-time LTV cohort charts, station utilization heatmaps, and multi-branch P&L snapshots. Know exactly when to buy another PS5 or replace a pool table felt.",
    icon: Crown,
    color: "from-amber-500 to-orange-500",
    align: "left",
  },
  {
    role: "For Staff",
    title: "A POS that doesn't slow you down.",
    desc: "Built for speed on a busy Saturday night. Split bills, scan barcodes, apply loyalty credits, and print or WhatsApp receipts instantly. The UI gets out of the way so your floor staff can focus on the customer.",
    icon: Shield,
    color: "from-cyan-500 to-sky-500",
    align: "right",
  },
  {
    role: "For Customers",
    title: "Your brand, their pocket.",
    desc: "A beautiful, white-labeled booking portal on your own domain. Customers track their visits, check their wallet balance, and book their favorite station without ever downloading an app.",
    icon: Users,
    color: "from-purple-500 to-indigo-500",
    align: "left",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

const FeatureDepthSection: React.FC = () => {
  return (
    <section id="modules" className="relative z-10 scroll-mt-32 py-32 px-5 sm:px-8 border-y border-white/[0.05] bg-[#07030f]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3"
          >
            Role-Based Value
          </motion.p>
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4"
          >
            Built for the entire ecosystem.
          </motion.h2>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            A generic POS only serves the cashier. Cuetronix provides specialized tools for the owner, the floor staff, and the customer.
          </motion.p>
        </div>

        <div className="space-y-32">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const isLeft = feature.align === "left";
            
            return (
              <div key={idx} className="grid grid-cols-12 gap-x-4 md:gap-x-12 items-center">
                
                {/* Text Content */}
                <div className={`col-span-12 md:col-span-5 ${isLeft ? "md:order-1" : "md:order-2"} mb-12 md:mb-0`}>
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wider text-gray-400">
                        {feature.role}
                      </span>
                    </div>
                    
                    <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 text-white">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-400 text-lg leading-relaxed">
                      {feature.desc}
                    </p>
                  </motion.div>
                </div>

                {/* Visual Content */}
                <div className={`col-span-12 md:col-span-7 ${isLeft ? "md:order-2" : "md:order-1"}`}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="relative w-full aspect-[16/10] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-[0.03]`} />
                    
                    {/* High-fidelity UI mockup based on role */}
                    <div className="absolute inset-4 rounded-2xl border border-white/5 bg-[#0a0514] overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
                      
                      {idx === 0 && (
                        // Owner Dashboard Mockup
                        <div className="absolute inset-0 p-6 flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="flex gap-2">
                              <div className="h-6 w-16 bg-white/5 rounded" />
                              <div className="h-6 w-16 bg-white/5 rounded" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4">
                                <div className="h-3 w-16 bg-white/10 rounded mb-3" />
                                <div className="h-6 w-24 bg-gradient-to-r from-amber-400 to-orange-400 rounded" />
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4 flex items-end gap-3">
                            {[30, 50, 40, 70, 60, 90, 80, 100, 75, 85].map((h, i) => (
                              <motion.div 
                                key={i}
                                initial={{ height: 0 }}
                                whileInView={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: i * 0.05 }}
                                className="flex-1 bg-gradient-to-t from-orange-500/50 to-amber-400/50 rounded-t-sm"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {idx === 1 && (
                        // Staff POS Mockup
                        <div className="absolute inset-0 flex">
                          <div className="flex-[2] p-6 border-r border-white/10 flex flex-col gap-4">
                            <div className="h-8 w-full bg-white/5 rounded-lg mb-2" />
                            <div className="grid grid-cols-3 gap-3">
                              {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-square bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:bg-white/10 transition-colors">
                                  <div className="h-8 w-8 bg-cyan-500/20 rounded-full" />
                                  <div className="space-y-1">
                                    <div className="h-2 w-16 bg-white/20 rounded" />
                                    <div className="h-2 w-10 bg-cyan-400/50 rounded" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex-1 bg-white/[0.02] p-6 flex flex-col">
                            <div className="h-4 w-24 bg-white/10 rounded mb-6" />
                            <div className="flex-1 space-y-3">
                              {[1, 2].map((i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                  <div className="h-3 w-20 bg-white/20 rounded" />
                                  <div className="h-3 w-12 bg-white/40 rounded" />
                                </div>
                              ))}
                            </div>
                            <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                              <div className="flex justify-between">
                                <div className="h-3 w-12 bg-white/20 rounded" />
                                <div className="h-3 w-16 bg-white/40 rounded" />
                              </div>
                              <div className="h-10 w-full bg-gradient-to-r from-cyan-500 to-sky-500 rounded-lg" />
                            </div>
                          </div>
                        </div>
                      )}

                      {idx === 2 && (
                        // Customer Portal Mockup
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-[300px] h-[450px] bg-[#0a0514] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="h-32 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 relative">
                              <div className="absolute -bottom-8 left-6 w-16 h-16 bg-[#120822] rounded-full border-4 border-[#0a0514] flex items-center justify-center">
                                <Users size={20} className="text-purple-400" />
                              </div>
                            </div>
                            <div className="pt-10 px-6 pb-6 flex flex-col gap-4 flex-1">
                              <div className="h-5 w-32 bg-white/20 rounded" />
                              <div className="h-3 w-20 bg-purple-400/50 rounded mb-4" />
                              
                              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="h-2 w-16 bg-white/20 rounded" />
                                  <div className="h-4 w-24 bg-white/40 rounded" />
                                </div>
                                <div className="w-10 h-10 bg-white/10 rounded-lg" />
                              </div>
                              
                              <div className="mt-auto h-12 w-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
                
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureDepthSection;
