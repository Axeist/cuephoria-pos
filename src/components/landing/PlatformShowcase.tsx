import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import Reveal from "@/components/landing/lp/Reveal";

type PillarKey = "billing" | "booking" | "staff";

const PILLARS: {
  key: PillarKey;
  label: string;
  tag: string;
  icon: typeof CreditCard;
  accent: string;
  blurb: string;
}[] = [
  {
    key: "billing",
    label: "Billing & POS",
    tag: "Point of sale",
    icon: CreditCard,
    accent: "#a78bfa",
    blurb:
      "Ring up sessions, food and rentals in seconds. UPI, cards and split payments settle straight into your books.",
  },
  {
    key: "booking",
    label: "Online Booking",
    tag: "Self-serve",
    icon: CalendarCheck,
    accent: "#22d3ee",
    blurb:
      "Customers reserve and prepay slots online. Live availability syncs to every screen the instant a slot is taken.",
  },
  {
    key: "staff",
    label: "Staff & Payroll",
    tag: "Workforce",
    icon: Users,
    accent: "#34d399",
    blurb:
      "Shifts, attendance and payroll in one deck. Role-based access keeps every action accountable.",
  },
];

/* ─────────────────────────── Billing mock ─────────────────────────── */

const TXNS = [
  { id: "TXN-9F2A", label: "Station 4 · Snooker", amt: 450, method: "UPI" },
  { id: "TXN-9F2B", label: "Cafe · Cold coffee x2", amt: 220, method: "Card" },
  { id: "TXN-9F2C", label: "PS5 · 3 hrs", amt: 360, method: "UPI" },
  { id: "TXN-9F2D", label: "Turf · 1 hr slot", amt: 900, method: "UPI" },
  { id: "TXN-9F2E", label: "Membership top-up", amt: 1500, method: "Card" },
];

const BillingMock: React.FC<{ active: boolean }> = ({ active }) => {
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<typeof TXNS>(reduce ? TXNS.slice(0, 4) : []);
  const revenue = useCountUp({ to: 48250, duration: 1800, start: active });

  useEffect(() => {
    if (!active || reduce) return;
    setRows([]);
    let i = 0;
    const t = window.setInterval(() => {
      setRows((prev) => {
        const next = [TXNS[i % TXNS.length], ...prev].slice(0, 4);
        return next;
      });
      i += 1;
    }, 1400);
    return () => window.clearInterval(t);
  }, [active, reduce]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Revenue + chart */}
      <div className="lp-glass-soft lp-scan p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Revenue today
          </span>
          <TrendingUp size={14} className="text-emerald-300" />
        </div>
        <div className="lp-mono mt-1 flex items-center text-2xl font-bold text-white">
          <IndianRupee size={18} className="mr-0.5 text-violet-300" />
          {revenue.toLocaleString("en-IN")}
        </div>
        <div className="mt-3 flex h-16 items-end gap-1">
          {[42, 60, 38, 72, 55, 84, 68, 92].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t origin-bottom"
              style={{
                height: `${h}%`,
                background:
                  i === 7
                    ? "linear-gradient(to top,#7c3aed,#e879f9)"
                    : "linear-gradient(to top,rgba(124,58,237,0.45),rgba(232,121,249,0.45))",
                boxShadow: i === 7 ? "0 0 12px rgba(232,121,249,0.5)" : undefined,
                animation: reduce ? undefined : `lp-bar 0.9s ${0.1 + i * 0.07}s both`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Live transactions */}
      <div className="lp-glass-soft p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Live transactions
          </span>
          <span className="lp-led text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {rows.map((t) => (
              <motion.div
                key={t.id + rows.length}
                layout
                initial={reduce ? false : { opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5"
              >
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-white/90">
                    {t.label}
                  </div>
                  <div className="lp-mono text-[10px] text-white/40">
                    {t.id} · {t.method}
                  </div>
                </div>
                <div className="lp-mono text-[13px] font-semibold text-emerald-300">
                  ₹{t.amt}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── Booking mock ─────────────────────────── */

const SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];
const BOOKED = new Set([1, 2, 5, 6, 7, 10]);

const BookingMock: React.FC<{ active: boolean }> = ({ active }) => {
  const reduce = useReducedMotion();
  const [filled, setFilled] = useState<Set<number>>(
    reduce ? BOOKED : new Set(),
  );
  const occupancy = useCountUp({ to: 78, duration: 1600, start: active });

  useEffect(() => {
    if (!active || reduce) return;
    setFilled(new Set());
    const order = [...BOOKED];
    let i = 0;
    const t = window.setInterval(() => {
      setFilled((prev) => {
        const next = new Set(prev);
        next.add(order[i]);
        return next;
      });
      i += 1;
      if (i >= order.length) window.clearInterval(t);
    }, 360);
    return () => window.clearInterval(t);
  }, [active, reduce]);

  return (
    <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
      <div className="lp-glass-soft p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Today · Court availability
          </span>
          <span className="lp-chip lp-mono !py-0.5 !text-[10px] text-cyan-200">
            <CalendarCheck size={11} /> 12 slots
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {SLOTS.map((s, i) => {
            const isBooked = filled.has(i);
            return (
              <div
                key={s}
                className="lp-mono rounded-lg border px-1 py-2 text-center text-[11px] transition-colors duration-500"
                style={{
                  borderColor: isBooked
                    ? "rgba(34,211,238,0.4)"
                    : "rgba(255,255,255,0.08)",
                  background: isBooked
                    ? "linear-gradient(180deg,rgba(34,211,238,0.22),rgba(34,211,238,0.06))"
                    : "rgba(255,255,255,0.02)",
                  color: isBooked ? "#a5f3fc" : "rgba(255,255,255,0.45)",
                  boxShadow: isBooked
                    ? "0 0 14px rgba(34,211,238,0.25)"
                    : undefined,
                }}
              >
                {s}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="lp-glass-soft p-4">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Occupancy
          </span>
          <div className="lp-mono mt-1 text-2xl font-bold text-cyan-200">
            {occupancy}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-1000"
              style={{
                width: `${occupancy}%`,
                background: "linear-gradient(90deg,#22d3ee,#7c3aed)",
              }}
            />
          </div>
        </div>
        <div className="lp-glass-soft flex items-center gap-2.5 p-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "rgba(34,197,94,0.16)" }}
          >
            <Wallet size={16} className="text-emerald-300" />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-white">
              Prepaid via Razorpay
            </div>
            <div className="lp-mono text-[10px] text-white/45">
              ₹900 · confirmed instantly
            </div>
          </div>
          <Zap size={14} className="ml-auto shrink-0 text-amber-300" />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── Staff mock ─────────────────────────── */

const STAFF = [
  { name: "Aarav S.", role: "Manager", status: "in", color: "#34d399" },
  { name: "Diya R.", role: "Cashier", status: "in", color: "#34d399" },
  { name: "Kabir M.", role: "Floor", status: "break", color: "#fbbf24" },
  { name: "Meera P.", role: "Cafe", status: "out", color: "#9aa3b8" },
];

const StaffMock: React.FC<{ active: boolean }> = ({ active }) => {
  const payroll = useCountUp({ to: 184500, duration: 1900, start: active });

  return (
    <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
      <div className="lp-glass-soft p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Today's roster
          </span>
          <span className="lp-chip lp-mono !py-0.5 !text-[10px] text-emerald-200">
            <Clock size={11} /> Live
          </span>
        </div>
        <div className="space-y-1.5">
          {STAFF.map((s, i) => (
            <Reveal key={s.name} delay={i * 80}>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
                <span
                  className="lp-led shrink-0"
                  style={{ color: s.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-white/90">
                    {s.name}
                  </div>
                  <div className="text-[10px] text-white/40">{s.role}</div>
                </div>
                <span
                  className="lp-mono rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                  style={{
                    color: s.color,
                    background: `${s.color}1f`,
                  }}
                >
                  {s.status === "in"
                    ? "Clocked in"
                    : s.status === "break"
                      ? "On break"
                      : "Off"}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="lp-glass-soft p-4">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Payroll this month
          </span>
          <div className="lp-mono mt-1 flex items-center text-2xl font-bold text-emerald-200">
            <IndianRupee size={16} className="mr-0.5" />
            {payroll.toLocaleString("en-IN")}
          </div>
          <div className="mt-2 text-[11px] text-white/45">
            Auto-calculated from attendance
          </div>
        </div>
        <div className="lp-glass-soft flex items-center gap-2 p-3">
          <ShieldCheck size={16} className="shrink-0 text-violet-300" />
          <div className="text-[11px] text-white/70">
            Role-based access on every action
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── Section ─────────────────────────── */

const MOCKS: Record<PillarKey, React.FC<{ active: boolean }>> = {
  billing: BillingMock,
  booking: BookingMock,
  staff: StaffMock,
};

const PlatformShowcase: React.FC = () => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<PillarKey>("billing");
  const interacted = useRef(false);

  // Auto-rotate pillars until the user interacts.
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => {
      if (interacted.current) return;
      setActive((prev) =>
        prev === "billing" ? "booking" : prev === "booking" ? "staff" : "billing",
      );
    }, 5000);
    return () => window.clearInterval(t);
  }, [reduce]);

  const ActiveMock = MOCKS[active];
  const activePillar = PILLARS.find((p) => p.key === active)!;

  return (
    <section
      id="platform"
      aria-labelledby="platform-heading"
      className="relative py-24 sm:py-28"
    >
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="lp-chip mx-auto mb-4 text-violet-200">
            <Zap size={12} className="text-fuchsia-300" /> One platform · three engines
          </span>
          <h2
            id="platform-heading"
            className="lp-display text-3xl font-bold text-white sm:text-4xl md:text-5xl"
          >
            Run billing, bookings and your team
            <br />
            from <span className="lp-holo">one command deck</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Cuetronix unifies your point of sale, online booking platform and staff
            management into a single real-time system.
          </p>
        </Reveal>

        {/* Pillar tabs */}
        <Reveal delay={120} className="mt-10 flex flex-wrap justify-center gap-2">
          {PILLARS.map((p) => {
            const isActive = p.key === active;
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => {
                  interacted.current = true;
                  setActive(p.key);
                }}
                aria-pressed={isActive}
                className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200"
                style={{
                  borderColor: isActive
                    ? `${p.accent}66`
                    : "rgba(255,255,255,0.1)",
                  background: isActive
                    ? `${p.accent}1f`
                    : "rgba(255,255,255,0.03)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                <Icon size={16} style={{ color: p.accent }} />
                {p.label}
              </button>
            );
          })}
        </Reveal>

        {/* Active pillar panel */}
        <Reveal delay={180} className="mt-8">
          <div className="lp-glass lp-border-glow lp-grain mx-auto max-w-4xl overflow-hidden p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="lp-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {activePillar.tag}
                </div>
                <div className="lp-display mt-0.5 text-lg font-bold text-white">
                  {activePillar.label}
                </div>
              </div>
              <Receipt size={18} className="mt-1 shrink-0 text-white/30" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <ActiveMock active />
                <p className="mt-4 text-sm leading-relaxed text-white/55">
                  {activePillar.blurb}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default PlatformShowcase;
