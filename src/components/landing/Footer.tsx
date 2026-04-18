import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Gamepad2,
  Headphones,
  LogIn,
  PlugZap,
  Shield,
  ShieldCheck,
} from "lucide-react";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="relative z-10 px-5 pb-8 pt-20 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div
          className="relative overflow-hidden rounded-[36px] border border-white/10"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,8,22,0.95) 0%, rgba(9,5,17,0.92) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow:
              "0 28px 90px -36px rgba(120, 65, 245, 0.48), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(216,180,254,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.12),_transparent_22%)]" />

          <div className="relative border-b border-white/8 px-6 py-8 sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
                  Premium venue software
                </div>
                <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                  A more polished front door for your lounge, from discovery to login.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
                  Cuetronix gives operators one system for bookings, live station control, cafe
                  billing, loyalty, reporting and customer self-serve. Start a trial, log in to the
                  right portal, or book a setup call directly from here.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: "99.98%", label: "Uptime" },
                  { value: "50k+", label: "Bookings processed" },
                  { value: "<100ms", label: "P95 latency" },
                  { value: "4 portals", label: "Login paths ready" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                  >
                    <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative grid gap-12 px-6 py-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-10">
            <div>
              <div className="mb-6 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-600/40">
                  <Gamepad2 size={22} className="text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight">
                  Cue<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">tronix</span>
                </span>
              </div>
              <p className="mb-6 max-w-md text-base leading-relaxed text-gray-400">
                The operating system for modern gaming lounges. Premium bookings, counter speed,
                cafe workflows, loyalty, tournaments and analytics, built by operators who run
                real venues.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/signup")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-opacity hover:opacity-95"
                >
                  Start free trial <ArrowUpRight size={15} />
                </button>
                <button
                  onClick={() => scrollTo("book-call")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                >
                  <CalendarDays size={15} className="text-fuchsia-300" />
                  Book a call
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-gray-500">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                All systems operational
              </div>
            </div>

            <div>
              <p className="mb-6 text-base font-bold tracking-tight text-white">Explore</p>
              <ul className="space-y-4">
                {[
                  { label: "Modules", action: () => scrollTo("modules") },
                  { label: "Workflow", action: () => scrollTo("workflow") },
                  { label: "Pricing", action: () => scrollTo("pricing") },
                  { label: "Security", action: () => scrollTo("trust") },
                  { label: "FAQ", action: () => scrollTo("faq") },
                  { label: "Book a call", action: () => scrollTo("book-call") },
                ].map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={l.action}
                      className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-6 text-base font-bold tracking-tight text-white">Login portals</p>
              <ul className="space-y-4">
                {[
                  { label: "Workspace admin login", action: () => navigate("/login") },
                  { label: "Customer login", action: () => navigate("/customer/login") },
                  { label: "Cafe login", action: () => navigate("/cafe/login") },
                  { label: "Platform admin login", action: () => navigate("/platform/login") },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.action}
                      className="inline-flex items-center gap-2 text-base font-medium text-gray-400 transition-colors hover:text-white"
                    >
                      <LogIn size={15} className="text-violet-300" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-6 text-base font-bold tracking-tight text-white">Company</p>
              <ul className="space-y-4">
                <li>
                  <button
                    onClick={() => navigate("/contact")}
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:hello@cuetronix.com"
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    hello@cuetronix.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://cuephoria.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Cuephoria Venues
                  </a>
                </li>
                <li>
                  <a
                    href="https://cuephoriatech.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Cuephoria Tech
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/terms")}
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Terms
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/privacy")}
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Privacy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/shipping-and-delivery")}
                    className="text-base font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Shipping and delivery
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="relative border-t border-white/8 px-6 py-6 sm:px-8 lg:px-10">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
                <ShieldCheck size={16} className="text-violet-300" />
                Security posture: RLS, PBKDF2, TOTP and audit logs
              </div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
                <PlugZap size={16} className="text-sky-300" />
                Integrations: Razorpay, Supabase, Resend, WhatsApp
              </div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
                <Headphones size={16} className="text-fuchsia-300" />
                Support: launch help, migration planning and live demos
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-between gap-4 border-t border-white/8 px-6 py-6 text-center sm:px-8 md:flex-row md:text-left lg:px-10">
            <p className="text-sm font-medium text-gray-600">
              © {new Date().getFullYear()} Cuetronix. A Cuephoria Tech product. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
              <span className="inline-flex items-center gap-2 text-gray-500">
                <Shield size={16} className="text-gray-600" /> SOC-ready mindset
              </span>
              <a
                href="mailto:hello@cuetronix.com"
                className="inline-flex items-center gap-2 text-gray-500 transition-colors hover:text-white"
              >
                <ArrowUpRight size={15} className="text-gray-600" />
                Contact sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
