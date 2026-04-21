import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    code: "starter",
    name: "Starter",
    price: 1999,
    priceYear: 19990,
    tagline: "For single-branch lounges finding their feet.",
    cta: "Start 14-day trial",
    featured: false,
    features: [
      "1 branch",
      "Up to 10 stations",
      "3 admin seats",
      "Online bookings + POS",
      "Cafe module",
      "Loyalty & memberships",
      "Razorpay UPI + cards",
      "Email support",
    ],
  },
  {
    code: "growth",
    name: "Growth",
    price: 4999,
    priceYear: 49990,
    tagline: "For busy venues that need speed and depth.",
    cta: "Start 14-day trial",
    featured: true,
    features: [
      "1 branch",
      "Up to 30 stations",
      "10 admin seats",
      "Everything in Starter",
      "Tournaments + brackets",
      "Advanced happy hours",
      "Branded sub-domain",
      "Priority email support",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: 9999,
    priceYear: 99990,
    tagline: "For chains running multiple branches.",
    cta: "Start 14-day trial",
    featured: false,
    features: [
      "Up to 5 branches",
      "Unlimited stations",
      "Unlimited admin seats",
      "Everything in Growth",
      "Multi-branch reporting",
      "Custom SMS sender",
      "Audit log + SSO-ready",
      "Dedicated success manager",
    ],
  },
];

const FAQ = [
  {
    q: "What is Cuetronix?",
    a: "Cuetronix is an all-in-one cloud platform that runs every part of a modern gaming lounge — PS5 and Xbox consoles, PC esports rigs, VR headsets, pool and snooker tables, the cafe, customer loyalty, tournaments, and multi-branch reporting — from a single dashboard.",
  },
  {
    q: "Who is Cuetronix built for?",
    a: "Gaming lounge operators, esports cafe owners, billiards and snooker halls, VR arcades, console rental shops, and entertainment venues that rent stations by the hour and sell food and beverages alongside.",
  },
  {
    q: "How is it different from a generic POS?",
    a: "A generic POS understands products and bills. Cuetronix also understands stations, per-minute billing, bookings, happy hours, console-vs-PC pricing, frame-based pool games, tournaments, and loyalty — because we run our own gaming lounges on it every single day.",
  },
  {
    q: "Does it work offline?",
    a: "The core POS and station timer continue to work through short network drops and sync back automatically. Bookings and online payments need connectivity because they rely on the Razorpay webhook round-trip.",
  },
  {
    q: "Can I run multiple branches?",
    a: "Yes. Pro and Enterprise workspaces support multi-branch topologies with consolidated reports, cross-branch customer wallets, and per-branch role scoping.",
  },
  {
    q: "How much does Cuetronix cost?",
    a: "Starter is ₹1,999/month, Growth is ₹4,999/month, Pro is ₹9,999/month. Annual plans save roughly 17%. Enterprise pricing is custom. Every plan starts with a 14-day free trial and no credit card upfront.",
  },
  {
    q: "Is my data secure?",
    a: "Every tenant is isolated with row-level security on a hardened Postgres backend. Passwords use PBKDF2-SHA-256, admins can enrol in TOTP two-factor, and every sensitive action is written to an append-only audit log.",
  },
  {
    q: "Can I export my data if I ever leave?",
    a: "Always. You can export customers, bills, bookings, stations, menu, and the full audit log as CSV or Excel at any time from your workspace settings.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="pricing" className="relative z-10 scroll-mt-32 py-32 px-5 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-12"
        >
          <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
            Simple, honest pricing
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Pick a plan that scales with your lounge.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 max-w-xl mx-auto text-lg">
            14-day free trial on every plan. No credit card. Cancel with one click.
            Yearly billing saves roughly 17%.
          </motion.p>
        </motion.div>

        <div className="flex justify-center mb-16">
          <div
            className="inline-flex p-1 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {(["month", "year"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setBillingCycle(c)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  billingCycle === c
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {c === "month" ? "Monthly" : "Yearly"}
                {c === "year" && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    SAVE 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {PLANS.map((p) => {
            const price = billingCycle === "year" ? Math.round(p.priceYear / 12) : p.price;
            return (
              <article
                key={p.code}
                className={`relative rounded-3xl p-8 flex flex-col ${
                  p.featured ? "md:-translate-y-3" : ""
                }`}
                style={{
                  background: p.featured
                    ? "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(236,72,153,0.06))"
                    : "rgba(255,255,255,0.025)",
                  border: p.featured
                    ? "1px solid rgba(167,139,250,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: p.featured ? "0 30px 80px -20px rgba(167,139,250,0.35)" : "none",
                }}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-wider bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/40">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold tracking-tight mb-2">{p.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{p.tagline}</p>
                </div>
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tracking-tight">₹{price.toLocaleString("en-IN")}</span>
                    <span className="text-gray-500 text-base font-medium">/ month</span>
                  </div>
                  {billingCycle === "year" && (
                    <p className="text-sm text-emerald-400 mt-2 font-medium">
                      Billed ₹{p.priceYear.toLocaleString("en-IN")} yearly
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => navigate("/signup")}
                  className={`w-full h-12 rounded-xl font-semibold mb-8 text-base ${
                    p.featured
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 shadow-lg shadow-violet-600/25"
                      : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white"
                  }`}
                >
                  {p.cta}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <ul className="space-y-3.5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="mt-1 w-4 h-4 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" viewBox="0 0 10 10" className="text-violet-300 fill-current">
                          <path d="M8.5 2.5L4 7L1.5 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Enterprise strip */}
        <div
          className="rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-32"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <Crown size={20} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
                Multi-city chains, custom SLAs, SSO, dedicated infrastructure, and
                white-glove migration. Let's design a plan around your ops.
              </p>
            </div>
          </div>
          <a
            href="mailto:hello@cuetronix.com?subject=Enterprise%20inquiry"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 h-12 rounded-xl text-base font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors"
          >
            Talk to sales <ArrowRight size={16} />
          </a>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="max-w-3xl scroll-mt-32 mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
              Questions · Answered
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently asked.
            </motion.h2>
          </motion.div>

          <div className="space-y-4">
            {FAQ.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <article
                  key={item.q}
                  className="rounded-2xl overflow-hidden transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${isOpen ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-white/[0.04] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <h3 className="font-semibold text-white text-lg">{item.q}</h3>
                    <ChevronDown
                      size={20}
                      className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180 text-violet-300" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 -mt-2">
                      <p className="text-gray-400 text-base leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <p className="text-center text-base text-gray-500 mt-12">
            Still curious?{" "}
            <a
              href="mailto:hello@cuetronix.com"
              className="text-violet-300 hover:text-violet-200 font-medium"
            >
              Email hello@cuetronix.com
            </a>{" "}
            — we reply fast.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
