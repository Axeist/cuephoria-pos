import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, Gamepad2, LockKeyhole, LogIn, Sparkles } from "lucide-react";

const Header: React.FC = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[26px] border border-white/10"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,8,26,0.92) 0%, rgba(11,6,20,0.82) 100%)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          boxShadow:
            "0 24px 80px -30px rgba(120, 65, 245, 0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(216,180,254,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.12),_transparent_26%)]" />

        <div className="relative px-4 sm:px-6">
          <div className="flex min-h-[76px] items-center justify-between gap-4">
            <a href="/" className="flex min-w-0 items-center gap-3 group" aria-label="Cuetronix home">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-violet-600/40">
                <Gamepad2 size={19} className="text-white" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[17px] tracking-tight">
                  Cue<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">tronix</span>
                </div>
                <div className="hidden text-[11px] uppercase tracking-[0.24em] text-white/45 lg:block">
                  Premium Lounge Operating System
                </div>
              </div>
            </a>

            <nav className="hidden items-center gap-1 lg:flex">
              {[
                { label: "Product", id: "modules" },
                { label: "Workflow", id: "workflow" },
                { label: "Security", id: "trust" },
                { label: "Pricing", id: "pricing" },
                { label: "Book a call", id: "book-call" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="rounded-xl px-3.5 py-2 text-sm text-gray-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <LogIn size={14} /> Sign in
              </button>
              <Button
                size="sm"
                onClick={() => navigate("/signup")}
                className="h-10 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:opacity-95"
              >
                Start free trial
              </Button>
            </div>
          </div>

          <div className="hidden items-center gap-3 border-t border-white/8 py-3 xl:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-100/80">
              <Sparkles size={12} className="text-fuchsia-300" />
              Built for PS5, PC, pool, snooker and cafe ops
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-gray-300">
              <LockKeyhole size={13} className="text-violet-300" />
              RLS, PBKDF2 and TOTP-ready security
            </div>
            <button
              onClick={() => scrollTo("book-call")}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-sm text-fuchsia-100 transition-colors hover:bg-fuchsia-500/16"
            >
              <CalendarDays size={13} className="text-fuchsia-300" />
              Book a guided setup call
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
