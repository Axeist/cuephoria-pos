import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Gamepad2,
  Globe2,
  Headphones,
  MapPin,
  Monitor,
  Send,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const VENUE_TYPES = [
  {
    icon: Gamepad2,
    name: "PS5 & Xbox lounges",
    blurb: "Console-based gaming bays with hourly billing and combo packs.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Monitor,
    name: "Esports & PC cafes",
    blurb: "High-spec gaming rigs, timed sessions and per-PC recharge.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Sparkles,
    name: "VR arcades",
    blurb: "Immersive VR pods with ticketed slots and group bookings.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Circle,
    name: "Pool & snooker halls",
    blurb: "Frame-based or hourly pricing, tournaments and table transfers.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Trophy,
    name: "Esports tournaments",
    blurb: "Brackets, registrations, prize pools and live leaderboards.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Users,
    name: "Board & party cafes",
    blurb: "Mixed venues with gaming, cafe orders and event slot booking.",
    color: "from-indigo-500 to-violet-500",
  },
];

const SEO_GROUPS: { title: string; keywords: string[] }[] = [
  {
    title: "Gaming & Esports",
    keywords: [
      "Gaming lounge POS software",
      "PS5 lounge management",
      "Xbox booking system",
      "Esports cafe software",
      "PC gaming center billing",
      "VR arcade management",
      "Tournament bracket manager",
      "Console rental POS",
    ],
  },
  {
    title: "Pool, Snooker & Billiards",
    keywords: [
      "Pool hall POS system",
      "Snooker club software",
      "Billiards table booking",
      "Frame-based pricing software",
      "8-ball league management",
      "Cue sports tournament software",
      "Happy-hour automation",
      "Table transfer system",
    ],
  },
  {
    title: "Operator workflows",
    keywords: [
      "Online bookings with UPI",
      "Combined cafe + gaming bills",
      "Station timer & transfers",
      "Loyalty & memberships",
      "Multi-branch reports",
      "WhatsApp receipts & reminders",
      "Staff payroll & shifts",
      "Inventory & menu control",
    ],
  },
];

const CITIES = [
  "Chennai", "Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Kochi",
  "Coimbatore", "Trichy", "Madurai", "Ahmedabad", "Kolkata", "Jaipur", "Indore",
  "Chandigarh", "Lucknow", "Nagpur", "Vizag", "Bhubaneswar", "Goa",
];

const TRUST = [
  { value: "80+", label: "Venues onboarded" },
  { value: "50k+", label: "Bookings processed" },
  { value: "4.9/5", label: "Operator rating" },
  { value: "20+", label: "Cities served" },
];

// ─── Component ────────────────────────────────────────────────────────────────
const SolutionsSection: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setEmail("");
    toast.success("You're on the list!", {
      description: "We'll send the operator playbook to your inbox shortly.",
    });
  };

  return (
    <section
      id="solutions"
      className="relative z-10 scroll-mt-32 overflow-hidden px-5 py-24 sm:px-8 sm:py-28"
    >
      {/* Subtle dot-grid overlay — matches other solid sections */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(167,139,250,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        {/* ─── Intro ─── */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
            <Globe2 size={12} />
            One platform · Every lounge
          </div>
          <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Whatever your venue looks like,{" "}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Cuetronix fits.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
            PS5 bays, VR pods, esports rigs, pool tables, snooker frames, a busy cafe
            counter — Cuetronix runs them all from one login, so you can focus on the
            floor, not the software.
          </p>
        </div>

        {/* ─── Venue types grid ─── */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VENUE_TYPES.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition-colors hover:border-violet-400/30 hover:bg-white/[0.05]"
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${v.color} shadow-lg shadow-violet-900/30`}
              >
                <v.icon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">{v.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{v.blurb}</p>
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl transition-opacity duration-300 group-hover:bg-violet-500/20" />
            </motion.div>
          ))}
        </div>

        {/* ─── SEO keyword groups ─── */}
        <div className="mt-20 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md sm:p-10">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
                Solutions
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Built for every kind of gaming and billiards venue.
              </h3>
            </div>
            <p className="max-w-sm text-sm text-gray-500">
              Whether you run consoles, PCs, VR pods, pool tables or a busy cafe counter
              — Cuetronix has a module for it.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {SEO_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {g.title}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {g.keywords.map((kw) => (
                    <li
                      key={kw}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[13px] text-gray-300 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
                    >
                      {kw}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Trust + Cities ─── */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Trust numbers */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/40 to-[#0c0618]/60 p-8 backdrop-blur-md">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={11} className="fill-amber-300 text-amber-300" />
                ))}
              </div>
              Operators love it
            </div>
            <h3 className="text-2xl font-bold text-white">
              Numbers that prove it works on a busy Saturday.
            </h3>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {TRUST.map((t) => (
                <div
                  key={t.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                    {t.value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">
                    {t.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cities */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-md">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Trusted across India
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Serving gaming lounges, esports cafes, VR arcades and billiards
                  clubs in these cities — and growing.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] font-medium text-gray-300"
                >
                  {c}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1.5 text-[13px] font-semibold text-fuchsia-200">
                + 40 more
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/8 pt-5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Zap size={13} className="text-violet-300" />
                99.98% uptime SLA
              </span>
              <span className="inline-flex items-center gap-2">
                <Headphones size={13} className="text-fuchsia-300" />
                Onboarding call included
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Data stays in India
              </span>
            </div>
          </div>
        </div>

        {/* ─── Newsletter ─── */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0618]/80 via-violet-950/40 to-fuchsia-950/30 p-6 backdrop-blur-xl sm:p-10">
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                <Sparkles size={12} />
                The Operator Playbook
              </div>
              <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                Monthly tips to fill stations, speed up checkout and grow repeat visits.
              </h3>
              <p className="mt-2 max-w-xl text-sm text-gray-400 sm:text-base">
                Real playbooks from lounges like yours. No fluff, no spam —
                unsubscribe any time.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="w-full">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="solutions-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="solutions-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@yourlounge.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-fuchsia-300/50 focus:bg-white/[0.07]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-600/30 transition-all hover:scale-[1.02] hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Get the playbook"}
                  <Send size={14} />
                </button>
              </div>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" /> 1-click unsubscribe
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" /> No spam, ever
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" /> 2-min read
                </span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
