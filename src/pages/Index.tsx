/**
 * Cuetronix — public marketing landing page.
 *
 * This is the SaaS landing page for Cuetronix: the multi-tenant operating
 * system for gaming lounges, esports cafes, billiards halls, and VR arcades.
 * Built on the same infrastructure that runs Cuephoria's own venues.
 *
 * Design goals:
 *   - High-tech futuristic vibe to match the Unicorn Studio hero scene.
 *   - Deeply SEO-friendly: semantic HTML (header, main, section, article,
 *     footer), rich crawlable copy, JSON-LD already in index.html.
 *   - Sexy but purposeful motion — framer-motion fade-ins on scroll, no
 *     janky parallax. The WebGL hero does the heavy lifting.
 *   - Accessible: every interactive element is a real <button> or <a>
 *     with visible focus states.
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Boxes,
  Calendar,
  ChevronDown,
  ClipboardList,
  Coffee,
  Crown,
  Database,
  Gamepad2,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogIn,
  Mail,
  MessageSquare,
  Monitor,
  Palette,
  Play,
  PlugZap,
  Rocket,
  ScanLine,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wallet,
  Wand2,
  Zap,
} from "lucide-react";

const UnicornScene = lazy(() => import("unicornstudio-react"));

/* ------------------------------------------------------------------ */
/*  Content data                                                       */
/* ------------------------------------------------------------------ */

const HERO_METRICS = [
  { value: "99.98%", label: "Uptime" },
  { value: "<100ms", label: "P95 API latency" },
  { value: "50k+", label: "Bookings processed" },
  { value: "14 days", label: "Free trial" },
];

const TRUST_LOGOS = [
  "Cuephoria Main",
  "Cuephoria Lite",
  "NIT Trichy E-Sports",
  "Choco Loca Cafe",
  "Level-Up Arcade",
  "Frame Pool House",
];

const MODULES = [
  {
    icon: Monitor,
    title: "Stations & Rentals",
    desc: "Model PS5, Xbox, gaming PC, VR headsets, pool, snooker, and billiards under one unified station engine. Per-minute, per-frame, flat, or hybrid pricing with live availability.",
    highlights: ["PS5 / Xbox / PC / VR", "Pool, snooker, billiards", "Happy-hour windows", "Group + multi-station bookings"],
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Calendar,
    title: "Online Bookings",
    desc: "A beautiful customer portal on your own branded sub-domain. Customers pick a slot, pay by UPI or card, and walk in with a confirmed QR code. No more WhatsApp ping-pong.",
    highlights: ["Razorpay-native UPI/cards", "Branded booking portal", "QR check-in + no-show timer", "Refunds + cancellation rules"],
    accent: "from-indigo-500 to-violet-500",
  },
  {
    icon: ShoppingCart,
    title: "Point of Sale",
    desc: "The fastest POS your staff has ever used. Split bills, keep saved carts per station, apply loyalty credits, scan barcodes, and print or share receipts instantly over WhatsApp.",
    highlights: ["Station-linked carts", "Barcode + variant SKUs", "Split / merge bills", "WhatsApp + email receipts"],
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: Coffee,
    title: "Cafe & F&B",
    desc: "A full cafe module with categorised menus, kitchen display, recipe costing, and order routing. Your cafe and gaming floor finally share one customer, one bill, one loyalty wallet.",
    highlights: ["KDS with station routing", "Recipe & modifier engine", "Bulk menu CSV import", "Inline prep time estimates"],
    accent: "from-pink-500 to-rose-500",
  },
  {
    icon: Users,
    title: "Customers & Loyalty",
    desc: "Every walk-in becomes a profile. Track visits, spend, favourite games, and birthday dates. Run tiered memberships, cashback wallets, referral codes, and automated offers.",
    highlights: ["Tiered memberships", "Cashback + credit wallets", "Referral tracking", "Auto-expiring coupons"],
    accent: "from-blue-500 to-cyan-500",
  },
  {
    icon: Trophy,
    title: "Tournaments & Events",
    desc: "Run PS5, PC, FIFA, BGMI, or pool tournaments with bracket generation, seeding, live scoring, and prize pool ledgers. Publish a public bracket URL your community can share.",
    highlights: ["Single / double elimination", "Auto-seeded brackets", "Prize pool ledger", "Public bracket pages"],
    accent: "from-amber-500 to-orange-500",
  },
  {
    icon: LayoutDashboard,
    title: "Reports & Analytics",
    desc: "Revenue by branch, by station, by staff, by hour. GST-ready exports, P&L snapshots, station utilisation heatmaps, and a customer LTV view that finally tells you who your whales are.",
    highlights: ["GST + tax summaries", "Station utilisation heatmap", "LTV + cohort charts", "CSV + Excel exports"],
    accent: "from-emerald-500 to-teal-500",
  },
  {
    icon: ClipboardList,
    title: "Staff & Roles",
    desc: "Owner, manager, cafe, and floor-staff roles out of the box — or configure your own. PIN-based shift sign-in, cash drawer reconciliation, and a timeline of every action an employee took.",
    highlights: ["Granular role matrix", "PIN sign-in for floor staff", "Cash drawer reconciliation", "Per-user audit timeline"],
    accent: "from-cyan-500 to-sky-500",
  },
  {
    icon: Palette,
    title: "Your Brand, Everywhere",
    desc: "Upload your logo, pick your palette, plug in your domain. Customers see your identity — not ours — on the booking portal, receipts, emails, and the branded staff login page.",
    highlights: ["Logo + favicon + colours", "Branded receipts & emails", "Custom sub-domain", "White-label customer portal"],
    accent: "from-purple-500 to-indigo-500",
  },
];

const PERSONAS = [
  { icon: Gamepad2, label: "Console lounges", desc: "PS5, Xbox, Switch rental centres." },
  { icon: ScanLine, label: "Esports cafes", desc: "PC bangs, LAN gaming halls." },
  { icon: Crown, label: "Pool & snooker", desc: "Billiard halls and cue clubs." },
  { icon: Boxes, label: "VR arcades", desc: "Room-scale VR and mixed reality." },
  { icon: Trophy, label: "Tournament venues", desc: "Weekly leagues and ticketed events." },
  { icon: Coffee, label: "Entertainment cafes", desc: "Gaming + cafe hybrid spaces." },
];

const HOW_STEPS = [
  {
    step: "01",
    title: "Sign up in under 5 minutes",
    body: "Pick a workspace name, choose a URL slug, create your owner account. Your branded customer portal goes live immediately at yourlounge.cuetronix.app.",
    icon: Rocket,
  },
  {
    step: "02",
    title: "Import stations, menu, and staff",
    body: "Add your PS5s, pool tables, VR pods, and cafe SKUs. Paste a CSV or use the guided wizard. Invite your team and assign roles in a couple of clicks.",
    icon: Wand2,
  },
  {
    step: "03",
    title: "Start taking bookings today",
    body: "Share your portal URL on Instagram and Google Maps. Accept online payments. Run the POS on opening night with your existing cash drawer and printer.",
    icon: Zap,
  },
];

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

const INTEGRATIONS = [
  { icon: Wallet, name: "Razorpay", desc: "Subscriptions, one-time payments, UPI, cards, and webhooks." },
  { icon: MessageSquare, name: "WhatsApp + SMS", desc: "Automated booking confirmations, OTPs, and receipts." },
  { icon: Globe2, name: "Google Maps", desc: "Embed directions and open-hours on the customer portal." },
  { icon: Mail, name: "Resend Email", desc: "Transactional emails that actually land in the inbox." },
  { icon: Database, name: "Supabase", desc: "Multi-tenant Postgres with row-level security." },
  { icon: Lock, name: "TOTP 2FA", desc: "Google Authenticator-compatible two-factor login." },
];

const TESTIMONIALS = [
  {
    name: "Shabari Giri",
    role: "Founder, Cuephoria Trichy",
    quote:
      "We built Cuetronix because nothing on the market could run a real gaming lounge end-to-end. After two years of using it across our own venues, we know every feature was earned on a busy Saturday night.",
    rating: 5,
  },
  {
    name: "Arjun K.",
    role: "Ops Lead, Level-Up Arcade",
    quote:
      "We moved off a bolted-together Excel + QR-code setup. Cuetronix cut our check-in time in half and we finally see which station makes the most money.",
    rating: 5,
  },
  {
    name: "Priya S.",
    role: "Owner, Frame Pool House",
    quote:
      "The frame-based pool pricing and happy-hour engine is worth the sticker price alone. Our staff stopped fighting the POS and started upselling the cafe.",
    rating: 5,
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

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                     */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#07030f] text-white overflow-x-hidden antialiased selection:bg-violet-500/40 selection:text-white">
      {/* ================================================================= */}
      {/*  BACKGROUND LAYERS                                                 */}
      {/* ================================================================= */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 w-[720px] h-[620px] bg-violet-700/20 rounded-full blur-[180px]" />
        <div className="absolute top-[40%] -right-20 w-[560px] h-[480px] bg-fuchsia-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-indigo-600/12 rounded-full blur-[140px]" />
      </div>

      {/* ================================================================= */}
      {/*  HEADER                                                            */}
      {/* ================================================================= */}
      <header
        className="relative z-50 border-b border-white/[0.06] sticky top-0"
        style={{
          background: "rgba(7,3,15,0.72)",
          backdropFilter: "blur(22px) saturate(140%)",
          WebkitBackdropFilter: "blur(22px) saturate(140%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[64px] flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group" aria-label="Cuetronix home">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-600/40">
              <Gamepad2 size={18} className="text-white" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-bold text-[17px] tracking-tight">
              Cue<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">tronix</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Product", id: "modules" },
              { label: "Pricing", id: "pricing" },
              { label: "Integrations", id: "integrations" },
              { label: "FAQ", id: "faq" },
            ].map((i) => (
              <button
                key={i.id}
                onClick={() => scrollTo(i.id)}
                className="text-gray-400 hover:text-white text-sm px-3.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                {i.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors flex items-center gap-1.5"
            >
              <LogIn size={14} /> Sign in
            </button>
            <Button
              size="sm"
              onClick={() => navigate("/signup")}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-600/30 rounded-lg text-sm h-9 px-4"
            >
              Start free trial
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* =============================================================== */}
        {/*  HERO with UnicornScene                                          */}
        {/* =============================================================== */}
        <section className="relative overflow-hidden min-h-[100svh] flex items-center">
          {/* WebGL scene — fills the hero, fades into the page */}
          <div className="absolute inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full bg-[#07030f]" />}>
              <UnicornScene
                projectId="VpaVzcWQTEJqmWAQXl4D"
                width="100%"
                height="100%"
                scale={1}
                dpi={1.5}
                fps={60}
                lazyLoad={false}
                production
                altText="Cuetronix hero animation"
                ariaLabel="Animated light beam backdrop"
                onLoad={() => setHeroReady(true)}
              />
            </Suspense>
            {/* tonal wash to keep text readable against any bright frame */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 40%, transparent, rgba(7,3,15,0.35) 70%, rgba(7,3,15,0.85)), linear-gradient(180deg, rgba(7,3,15,0.55) 0%, transparent 25%, transparent 65%, rgba(7,3,15,0.95) 100%)",
              }}
            />
            {/* subtle loading placeholder */}
            {!heroReady && (
              <div className="absolute inset-0 bg-gradient-to-b from-[#0b0520] via-[#0a0318] to-[#07030f] animate-pulse" />
            )}
          </div>

          {/* Copy */}
          <div className="relative z-10 w-full px-5 sm:px-8 py-28 sm:py-36">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide"
                style={{
                  background: "rgba(167,139,250,0.10)",
                  border: "1px solid rgba(167,139,250,0.28)",
                  color: "#ddd6fe",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Sparkles size={12} className="text-fuchsia-300" />
                Now in public preview · Powered by Cuephoria
              </motion.div>

              <motion.h1
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.12 }}
                className="text-5xl sm:text-6xl md:text-[84px] font-extrabold leading-[1.02] tracking-[-0.03em] mb-6"
              >
                The operating system
                <br />
                for modern{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #a78bfa 0%, #f0abfc 40%, #93c5fd 80%, #a78bfa 100%)",
                    backgroundSize: "200% 100%",
                    animation: reduceMotion ? undefined : "hueShift 6s ease-in-out infinite",
                  }}
                >
                  gaming lounges
                </span>
                .
              </motion.h1>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
              >
                Run your PS5, Xbox, PC, VR, pool, and cafe empire from a single dashboard.
                Online bookings, POS, loyalty, tournaments, multi-branch reports — all in
                one cloud platform, built by operators who run real venues every night.
              </motion.p>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28 }}
                className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
              >
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-95 text-white text-base px-8 h-14 font-bold shadow-2xl shadow-fuchsia-600/40 rounded-xl transition-all hover:scale-[1.02]"
                >
                  <Rocket size={18} className="mr-2" />
                  Start 14-day free trial
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("modules")}
                  className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] text-base px-8 h-14 rounded-xl backdrop-blur-md"
                >
                  <Play size={16} className="mr-2" />
                  See it in action
                </Button>
              </motion.div>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xs text-gray-500"
              >
                No credit card · Cancel anytime · Import existing data in minutes
              </motion.p>
            </div>

            {/* metrics strip */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {HERO_METRICS.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl p-5 text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                    {m.value}
                  </div>
                  <div className="text-gray-500 text-[11px] uppercase tracking-wider mt-1 font-medium">
                    {m.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  TRUST LOGOS                                                     */}
        {/* =============================================================== */}
        <section className="relative z-10 py-14 border-y border-white/[0.05] bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <p className="text-center text-xs uppercase tracking-[0.24em] text-gray-500 font-semibold mb-6">
              Running real gaming venues since 2024
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-gray-400">
              {TRUST_LOGOS.map((name) => (
                <span
                  key={name}
                  className="text-base font-bold tracking-tight opacity-60 hover:opacity-100 transition-opacity"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  WHO IT'S FOR                                                    */}
        {/* =============================================================== */}
        <section className="relative z-10 py-24 px-5 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-14"
            >
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
                Built for every kind of gaming venue
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                One platform, every playstyle.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 max-w-xl mx-auto">
                From a corner PS5 lounge to a multi-branch esports chain — Cuetronix
                bends to your business model, not the other way around.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
            >
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                return (
                  <motion.article
                    variants={fadeUp}
                    key={p.label}
                    className="rounded-2xl p-5 text-center hover:-translate-y-0.5 transition-transform"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/25 flex items-center justify-center mx-auto mb-3">
                      <Icon size={18} className="text-violet-300" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{p.label}</h3>
                    <p className="text-gray-500 text-xs leading-snug">{p.desc}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  MODULES / FEATURES                                              */}
        {/* =============================================================== */}
        <section id="modules" className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
                Platform modules
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Nine modules. One beautiful dashboard.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 max-w-2xl mx-auto">
                Every workflow your lounge needs — bookings, POS, cafe, loyalty,
                tournaments, reports — stitched together so customers, staff, and
                numbers finally speak the same language.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <motion.article
                    variants={fadeUp}
                    key={m.title}
                    className="group relative rounded-2xl p-7 overflow-hidden transition-transform hover:-translate-y-1 duration-300"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className={`absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-br ${m.accent} blur-3xl`}
                    />
                    <div className={`relative inline-flex p-3 rounded-xl bg-gradient-to-br ${m.accent} mb-5 shadow-lg`}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <h3 className="relative text-xl font-bold mb-2 tracking-tight">{m.title}</h3>
                    <p className="relative text-gray-400 text-sm leading-relaxed mb-5">{m.desc}</p>
                    <ul className="relative space-y-1.5">
                      {m.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-[13px] text-gray-300">
                          <span className="mt-[7px] w-1 h-1 rounded-full bg-fuchsia-400 flex-shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  HOW IT WORKS                                                    */}
        {/* =============================================================== */}
        <section className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
                From zero to live in one evening
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                How Cuetronix works
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="grid md:grid-cols-3 gap-5"
            >
              {HOW_STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    variants={fadeUp}
                    key={s.step}
                    className="relative rounded-2xl p-7"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {i < HOW_STEPS.length - 1 && (
                      <div
                        className="hidden md:block absolute top-12 -right-6 w-12 h-px"
                        style={{ background: "linear-gradient(90deg, rgba(167,139,250,0.6), transparent)" }}
                      />
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl font-black tracking-tighter bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        {s.step}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/25 flex items-center justify-center">
                        <Icon size={16} className="text-violet-300" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2 tracking-tight">{s.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{s.body}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  BUILT BY OPERATORS (narrative, SEO-heavy)                       */}
        {/* =============================================================== */}
        <section className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div
              className="relative rounded-3xl p-10 sm:p-14 overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(236,72,153,0.06) 60%, rgba(7,3,15,0) 100%)",
                border: "1px solid rgba(167,139,250,0.18)",
              }}
            >
              <div
                className="absolute -top-32 -left-16 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl"
                aria-hidden
              />
              <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-300 font-semibold mb-4">
                The Cuephoria story
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
                Built by operators, for operators.
              </h2>
              <div className="space-y-5 text-gray-300 leading-relaxed max-w-3xl">
                <p>
                  Cuetronix started as the internal toolset that runs{" "}
                  <strong className="text-white">Cuephoria</strong>, a premium gaming
                  lounge in Trichy with PS5, VR, and professional pool tables. Every
                  friction we felt on a busy Saturday night turned into a feature:
                  mid-session station transfers, combined cafe + gaming bills, frame-based
                  pool pricing, happy-hour auto-overrides, tournament brackets, loyalty
                  credits that work across branches.
                </p>
                <p>
                  Two years and tens of thousands of bookings later, we opened the
                  platform up to other operators — because the gaming lounge industry
                  deserved software made by people who actually close the cash drawer
                  at 2 AM.
                </p>
                <p>
                  Cuetronix is not a generic POS with a gaming skin. It is a
                  multi-tenant SaaS designed from the ground up for station-rental
                  businesses: per-minute billing, station state machines, console
                  lifecycle, deposits and cancellations, branded customer portals, and a
                  revenue model that finally treats pool tables and PS5s as first-class
                  citizens.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mt-10">
                {[
                  { value: "2 years", label: "Running real lounges" },
                  { value: "9 modules", label: "In production" },
                  { value: "100%", label: "Built on live ops data" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-5 text-center"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      {s.value}
                    </div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  PRICING                                                         */}
        {/* =============================================================== */}
        <section id="pricing" className="relative z-10 py-28 px-5 sm:px-8">
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
              <motion.p variants={fadeUp} className="text-gray-400 max-w-xl mx-auto">
                14-day free trial on every plan. No credit card. Cancel with one click.
                Yearly billing saves roughly 17%.
              </motion.p>
            </motion.div>

            <div className="flex justify-center mb-10">
              <div
                className="inline-flex p-1 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {(["month", "year"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setBillingCycle(c)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
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

            <div className="grid md:grid-cols-3 gap-5 mb-8">
              {PLANS.map((p) => {
                const price = billingCycle === "year" ? Math.round(p.priceYear / 12) : p.price;
                return (
                  <article
                    key={p.code}
                    className={`relative rounded-2xl p-7 flex flex-col ${
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
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/40">
                        MOST POPULAR
                      </div>
                    )}
                    <div className="mb-5">
                      <h3 className="text-xl font-bold tracking-tight mb-1">{p.name}</h3>
                      <p className="text-gray-500 text-sm">{p.tagline}</p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold tracking-tight">₹{price.toLocaleString("en-IN")}</span>
                        <span className="text-gray-500 text-sm">/ month</span>
                      </div>
                      {billingCycle === "year" && (
                        <p className="text-xs text-emerald-400 mt-1 font-medium">
                          Billed ₹{p.priceYear.toLocaleString("en-IN")} yearly
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => navigate("/signup")}
                      className={`w-full h-11 rounded-xl font-semibold mb-6 ${
                        p.featured
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 shadow-lg shadow-violet-600/25"
                          : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white"
                      }`}
                    >
                      {p.cta}
                      <ArrowRight size={15} className="ml-2" />
                    </Button>
                    <ul className="space-y-2.5 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="mt-[3px] w-4 h-4 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
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
              className="rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <Crown size={18} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Enterprise</h3>
                  <p className="text-gray-400 text-sm max-w-2xl">
                    Multi-city chains, custom SLAs, SSO, dedicated infrastructure, and
                    white-glove migration. Let's design a plan around your ops.
                  </p>
                </div>
              </div>
              <a
                href="mailto:hello@cuetronix.com?subject=Enterprise%20inquiry"
                className="flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors"
              >
                Talk to sales <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  INTEGRATIONS                                                    */}
        {/* =============================================================== */}
        <section id="integrations" className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-14"
            >
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
                Plays well with your stack
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Integrations that just work.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 max-w-xl mx-auto">
                The plumbing of payments, messaging, and auth — pre-wired, audited,
                and ready on day one.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {INTEGRATIONS.map((i) => {
                const Icon = i.icon;
                return (
                  <motion.article
                    variants={fadeUp}
                    key={i.name}
                    className="group rounded-2xl p-6 hover:-translate-y-0.5 transition-transform"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Icon size={20} className="text-violet-300" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">{i.name}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{i.desc}</p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  TESTIMONIALS                                                    */}
        {/* =============================================================== */}
        <section className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-14"
            >
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.22em] text-fuchsia-400 font-semibold mb-3">
                From the floor
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Loved by operators.
              </motion.h2>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="grid md:grid-cols-3 gap-5"
            >
              {TESTIMONIALS.map((t) => (
                <motion.blockquote
                  variants={fadeUp}
                  key={t.name}
                  className="rounded-2xl p-6"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex mb-3" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                  <footer className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-violet-600 to-fuchsia-600">
                      {t.name[0]}
                    </div>
                    <div>
                      <cite className="not-italic text-white font-semibold text-sm">{t.name}</cite>
                      <p className="text-gray-500 text-xs">{t.role}</p>
                    </div>
                  </footer>
                </motion.blockquote>
              ))}
            </motion.div>
          </div>
        </section>

        {/* =============================================================== */}
        {/*  FAQ                                                             */}
        {/* =============================================================== */}
        <section id="faq" className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-3xl mx-auto">
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
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Frequently asked.
              </motion.h2>
            </motion.div>

            <div className="space-y-3">
              {FAQ.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <article
                    key={item.q}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: `1px solid ${isOpen ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                      aria-expanded={isOpen}
                    >
                      <h3 className="font-semibold text-white text-base">{item.q}</h3>
                      <ChevronDown
                        size={18}
                        className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180 text-violet-300" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-0 -mt-1">
                        <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <p className="text-center text-sm text-gray-500 mt-10">
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
        </section>

        {/* =============================================================== */}
        {/*  FINAL CTA                                                       */}
        {/* =============================================================== */}
        <section className="relative z-10 py-28 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div
              className="relative overflow-hidden rounded-[28px] p-12 sm:p-16 text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(236,72,153,0.18) 50%, rgba(99,102,241,0.22) 100%)",
                border: "1px solid rgba(167,139,250,0.35)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(217,70,239,0.35), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90 backdrop-blur">
                  <Sparkles size={12} /> Ship your venue online tonight
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-5 leading-[1.05]">
                  Ready to run a smarter gaming lounge?
                </h2>
                <p className="text-gray-200 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                  Start a free 14-day trial — no credit card, no setup fees.
                  If you're stuck, we'll hop on a call and get you live the same day.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    onClick={() => navigate("/signup")}
                    className="bg-white text-[#1a0a2e] hover:bg-gray-50 font-bold text-base px-8 h-14 rounded-xl hover:scale-[1.02] transition-transform shadow-2xl shadow-fuchsia-600/30"
                  >
                    Start free trial <ArrowRight size={18} className="ml-2" />
                  </Button>
                  <a
                    href="mailto:hello@cuetronix.com?subject=Cuetronix%20demo%20request"
                    className="inline-flex items-center justify-center gap-2 text-base px-8 h-14 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors font-semibold"
                  >
                    <LifeBuoy size={16} /> Book a live demo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================================================================= */}
      {/*  FOOTER                                                            */}
      {/* ================================================================= */}
      <footer
        className="relative z-10 py-14 px-5 sm:px-8"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(7,3,15,0.85)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-600/40">
                  <Gamepad2 size={18} className="text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">
                  Cue<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">tronix</span>
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mb-5">
                The operating system for modern gaming lounges. POS, bookings, cafe,
                loyalty, tournaments, analytics — built by operators, powered by
                Cuephoria.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                All systems operational
              </div>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-4">Product</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Modules", action: () => scrollTo("modules") },
                  { label: "Pricing", action: () => scrollTo("pricing") },
                  { label: "Integrations", action: () => scrollTo("integrations") },
                  { label: "FAQ", action: () => scrollTo("faq") },
                ].map((l) => (
                  <li key={l.label}>
                    <button onClick={l.action} className="text-gray-500 hover:text-white text-sm transition-colors">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-4">Account</p>
              <ul className="space-y-2.5">
                <li>
                  <button onClick={() => navigate("/signup")} className="text-gray-500 hover:text-white text-sm transition-colors">
                    Start free trial
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/login")} className="text-gray-500 hover:text-white text-sm transition-colors">
                    Sign in
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/customer/login")} className="text-gray-500 hover:text-white text-sm transition-colors">
                    Customer portal
                  </button>
                </li>
                <li>
                  <a href="mailto:hello@cuetronix.com" className="text-gray-500 hover:text-white text-sm transition-colors">
                    Contact sales
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-4">Company</p>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://cuephoria.in" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-sm transition-colors">
                    Cuephoria Venues
                  </a>
                </li>
                <li>
                  <a href="https://cuephoriatech.in" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-sm transition-colors">
                    Cuephoria Tech
                  </a>
                </li>
                <li>
                  <button onClick={() => navigate("/terms")} className="text-gray-500 hover:text-white text-sm transition-colors">
                    Terms
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/privacy")} className="text-gray-500 hover:text-white text-sm transition-colors">
                    Privacy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-gray-600 text-xs">
              © {new Date().getFullYear()} Cuetronix. A Cuephoria Tech product. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <Shield size={11} /> SOC-ready · RLS · PBKDF2 · TOTP
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <PlugZap size={11} /> Razorpay · Supabase · Resend
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* keyframes for the hero headline hue shift */}
      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Index;
