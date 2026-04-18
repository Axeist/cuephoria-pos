import { motion } from "framer-motion";
import { Monitor, Calendar, ShoppingCart, LayoutDashboard } from "lucide-react";

const STEPS = [
  {
    id: "booking",
    title: "1. The Booking",
    desc: "Customers pick a slot on your branded portal, pay via UPI, and walk in with a confirmed QR code. No more WhatsApp ping-pong.",
    icon: Calendar,
    color: "from-indigo-500 to-violet-500",
  },
  {
    id: "station",
    title: "2. The Session",
    desc: "Staff scan the QR code. The station timer starts. Need to move from PS5 to a pool table? Transfer the session in one click without losing track of time.",
    icon: Monitor,
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "pos",
    title: "3. The POS",
    desc: "Customer wants a cappuccino? Add it directly to their active station cart. When they leave, they pay one combined bill for gaming and F&B.",
    icon: ShoppingCart,
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "reports",
    title: "4. The Reports",
    desc: "At 2 AM, check your phone. See exact revenue splits between stations and cafe, station utilization heatmaps, and staff shift reconciliations.",
    icon: LayoutDashboard,
    color: "from-emerald-500 to-teal-500",
  },
];

const WalkthroughSection: React.FC = () => {
  return (
    <section className="relative z-10 py-32 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3"
          >
            The Workflow
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4"
          >
            How a session flows.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Watch how Cuetronix handles a customer from their couch to checkout, seamlessly connecting online bookings with offline operations.
          </motion.p>
        </div>

        <div className="grid grid-cols-12 gap-x-4 md:gap-x-8">
          {/* Left Column: Timeline Steps (5 cols) */}
          <div className="col-span-12 lg:col-span-5 relative">
            <div className="absolute left-6 top-8 bottom-8 w-px bg-white/10 hidden lg:block" />
            
            <div className="space-y-16 lg:space-y-24">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="relative pl-0 lg:pl-16"
                  >
                    <div className="hidden lg:flex absolute left-0 top-1 w-12 h-12 rounded-full bg-[#07030f] border border-white/20 items-center justify-center z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                        <Icon size={14} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="lg:hidden mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
                      <Icon size={20} className="text-fuchsia-300" />
                    </div>

                    <h3 className="text-2xl font-bold tracking-tight mb-3 text-white">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-base leading-relaxed">
                      {step.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Abstract UI Visuals (7 cols) */}
          <div className="col-span-12 lg:col-span-7 mt-16 lg:mt-0">
            <div className="sticky top-32 w-full aspect-[4/3] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden flex items-center justify-center p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5" />
              
              {/* Abstract Representation of the Dashboard */}
              <div className="relative w-full h-full border border-white/10 rounded-2xl bg-[#0a0514] shadow-2xl overflow-hidden flex flex-col">
                {/* Mock Header */}
                <div className="h-12 border-b border-white/10 flex items-center px-4 gap-4 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <div className="h-6 w-48 bg-white/5 rounded-md mx-auto" />
                </div>
                
                {/* Mock Content Area */}
                <div className="flex-1 p-6 grid grid-cols-3 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-1 space-y-3">
                    <div className="h-8 w-full bg-white/10 rounded-lg" />
                    <div className="h-8 w-3/4 bg-white/5 rounded-lg" />
                    <div className="h-8 w-5/6 bg-white/5 rounded-lg" />
                    <div className="h-8 w-full bg-white/5 rounded-lg" />
                  </div>
                  
                  {/* Main Area */}
                  <div className="col-span-2 flex flex-col gap-4">
                    {/* Top Stats Row */}
                    <div className="flex gap-4">
                      <div className="h-24 flex-1 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl border border-white/10 p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full" />
                        <div className="h-3 w-16 bg-white/20 rounded" />
                        <div className="h-6 w-24 bg-white/90 rounded" />
                      </div>
                      <div className="h-24 flex-1 bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col justify-between">
                        <div className="h-3 w-20 bg-white/10 rounded" />
                        <div className="h-6 w-16 bg-white/40 rounded" />
                      </div>
                    </div>
                    
                    {/* Station Grid Mockup */}
                    <div className="flex-1 w-full bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="h-4 w-1/3 bg-white/20 rounded-md" />
                        <div className="h-4 w-16 bg-white/10 rounded-md" />
                      </div>
                      <div className="grid grid-cols-3 gap-3 flex-1">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className={`rounded-lg border ${i === 2 ? 'border-fuchsia-500/50 bg-fuchsia-500/10' : 'border-white/5 bg-white/5'} p-2 flex flex-col justify-between relative overflow-hidden`}>
                            {i === 2 && (
                              <motion.div 
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 to-transparent"
                              />
                            )}
                            <div className="flex justify-between items-start z-10">
                              <div className="h-2 w-8 bg-white/20 rounded" />
                              <div className={`h-2 w-2 rounded-full ${i === 2 ? 'bg-fuchsia-400' : i === 4 ? 'bg-emerald-400' : 'bg-white/20'}`} />
                            </div>
                            <div className="space-y-1.5 z-10">
                              <div className={`h-1.5 w-full rounded ${i === 2 ? 'bg-fuchsia-400/50' : 'bg-white/10'}`} />
                              <div className={`h-1.5 w-2/3 rounded ${i === 2 ? 'bg-fuchsia-400/30' : 'bg-white/5'}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WalkthroughSection;
