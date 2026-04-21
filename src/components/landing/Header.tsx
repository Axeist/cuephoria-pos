import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Gamepad2, LogIn, Menu, Sparkles, X } from "lucide-react";

const NAV = [
  { label: "Product", id: "modules" },
  { label: "Workflow", id: "workflow" },
  { label: "Security", id: "trust" },
  { label: "Pricing", id: "pricing" },
  { label: "Solutions", id: "solutions" },
];

/**
 * Floating glass-pill header.
 * Behaviour:
 *  - At page top → near-full-width translucent bar (blends with hero)
 *  - On scroll  → morphs into a narrower centered pill with advanced
 *                 glassmorphism (layered blur, gradient border, inner shine,
 *                 subtle violet glow) that travels with the page.
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <motion.div
        initial={false}
        animate={{
          marginTop: scrolled ? 14 : 0,
          maxWidth: scrolled ? 1120 : 1400,
          borderRadius: scrolled ? 22 : 0,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.6 }}
        className="pointer-events-auto relative w-full mx-3 sm:mx-5"
        style={{ willChange: "transform, max-width, border-radius" }}
      >
        {/* Glass body */}
        <div
          className="relative overflow-hidden transition-[border-color,background,box-shadow] duration-300"
          style={{
            borderRadius: "inherit",
            background: scrolled
              ? "linear-gradient(180deg, rgba(16,9,30,0.92) 0%, rgba(9,5,20,0.92) 100%)"
              : mobileOpen
                ? "linear-gradient(180deg, rgba(14,8,26,0.88) 0%, rgba(8,4,18,0.92) 100%)"
                : "linear-gradient(180deg, rgba(20,12,38,0) 0%, rgba(12,7,24,0) 100%)",
            border: `1px solid ${
              scrolled || mobileOpen ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0)"
            }`,
            backdropFilter:
              scrolled || mobileOpen ? "blur(32px) saturate(180%)" : "blur(0px)",
            WebkitBackdropFilter:
              scrolled || mobileOpen ? "blur(32px) saturate(180%)" : "blur(0px)",
            boxShadow:
              scrolled || mobileOpen
                ? "0 20px 50px -20px rgba(124,58,237,0.40), 0 8px 28px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "none",
          }}
        >
          {/* Inner radial tint — only when floating or drawer open */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: scrolled || mobileOpen ? 1 : 0,
              background:
                "radial-gradient(600px 140px at 20% 0%, rgba(167,139,250,0.18), transparent 55%)," +
                "radial-gradient(500px 140px at 80% 100%, rgba(236,72,153,0.12), transparent 60%)",
            }}
          />

          {/* Gradient top shine */}
          <div
            className="pointer-events-none absolute inset-x-6 top-0 h-px transition-opacity duration-300"
            style={{
              opacity: scrolled || mobileOpen ? 1 : 0,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
            }}
          />

          {/* Bottom accent gradient (mirrors footer) */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-300"
            style={{
              opacity: scrolled || mobileOpen ? 1 : 0,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.45) 50%, transparent 100%)",
            }}
          />

          <div className="relative px-4 sm:px-5">
            <div className="flex h-[60px] items-center justify-between gap-4 lg:h-[64px]">
              {/* Brand */}
              <a
                href="/"
                className="group flex min-w-0 items-center gap-2.5"
                aria-label="Cuetronix home"
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-violet-600/40">
                  <Gamepad2 size={17} className="text-white" />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] font-bold leading-none tracking-tight">
                    Cue
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      tronix
                    </span>
                  </div>
                  <div className="mt-1 hidden text-[9px] uppercase tracking-[0.22em] text-white/45 lg:block">
                    Premium lounge OS
                  </div>
                </div>
              </a>

              {/* Center nav */}
              <nav className="hidden items-center gap-0.5 lg:flex">
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="relative rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:text-white"
                  >
                    <span className="relative z-10">{item.label}</span>
                    <span className="absolute inset-0 rounded-lg bg-white/0 transition-colors hover:bg-white/[0.06]" />
                  </button>
                ))}
                <div className="mx-1 h-4 w-px bg-white/10" />
                <button
                  onClick={() => scrollTo("book-call")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-fuchsia-200 transition-colors hover:text-white"
                >
                  <Sparkles size={11} className="text-fuchsia-300" />
                  Book a call
                </button>
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-white sm:inline-flex"
                >
                  <LogIn size={13} /> Sign in
                </button>

                <button
                  onClick={() => navigate("/signup")}
                  className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-3.5 text-sm font-semibold text-white shadow-md shadow-fuchsia-600/30 transition-all hover:scale-[1.02] hover:shadow-fuchsia-600/50"
                >
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    Start free trial
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)",
                    }}
                  />
                </button>

                <button
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
                >
                  {mobileOpen ? <X size={15} /> : <Menu size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile drawer */}
          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: "easeInOut" }}
                className="overflow-hidden lg:hidden"
              >
                <div className="mx-3 my-3 rounded-xl border border-white/10 bg-[#0b0617]/80 p-2 backdrop-blur-md">
                  {NAV.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => scrollTo("book-call")}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-fuchsia-200 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={12} className="text-fuchsia-300" />
                      Book a call
                    </span>
                  </button>
                  <div className="my-1.5 h-px bg-white/10" />
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMobileOpen(false);
                    }}
                    className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogIn size={13} /> Sign in
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </header>
  );
};

export default Header;
