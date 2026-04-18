import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, LogIn } from "lucide-react";

const Header: React.FC = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
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
  );
};

export default Header;
