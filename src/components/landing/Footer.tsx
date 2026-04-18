import { useNavigate } from "react-router-dom";
import { Gamepad2, Shield, PlugZap } from "lucide-react";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer
      className="relative z-10 py-16 px-5 sm:px-8"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(7,3,15,0.85)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-y-12 md:gap-x-8 mb-16">
          
          {/* Brand Column (4 cols) */}
          <div className="col-span-12 md:col-span-4">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-600/40">
                <Gamepad2 size={22} className="text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight">
                Cue<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">tronix</span>
              </span>
            </div>
            <p className="text-gray-500 text-base leading-relaxed max-w-sm mb-6">
              The operating system for modern gaming lounges. POS, bookings, cafe,
              loyalty, tournaments, analytics — built by operators, powered by
              Cuephoria.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Links Columns (8 cols total, 3 groups) */}
          <div className="col-span-12 md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-white text-base font-bold mb-6 tracking-tight">Product</p>
              <ul className="space-y-4">
                {[
                  { label: "Modules", action: () => scrollTo("modules") },
                  { label: "Pricing", action: () => scrollTo("pricing") },
                  { label: "Integrations", action: () => scrollTo("integrations") },
                  { label: "FAQ", action: () => scrollTo("faq") },
                ].map((l) => (
                  <li key={l.label}>
                    <button onClick={l.action} className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white text-base font-bold mb-6 tracking-tight">Account</p>
              <ul className="space-y-4">
                <li>
                  <button onClick={() => navigate("/signup")} className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Start free trial
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/login")} className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Sign in
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/customer/login")} className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Customer portal
                  </button>
                </li>
                <li>
                  <a href="mailto:hello@cuetronix.com" className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Contact sales
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-white text-base font-bold mb-6 tracking-tight">Company</p>
              <ul className="space-y-4">
                <li>
                  <a href="https://cuephoria.in" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Cuephoria Venues
                  </a>
                </li>
                <li>
                  <a href="https://cuephoriatech.in" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Cuephoria Tech
                  </a>
                </li>
                <li>
                  <button onClick={() => navigate("/terms")} className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Terms
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/privacy")} className="text-gray-400 hover:text-white text-base transition-colors font-medium">
                    Privacy
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-gray-600 text-sm font-medium">
            © {new Date().getFullYear()} Cuetronix. A Cuephoria Tech product. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
            <span className="inline-flex items-center gap-2 text-gray-500">
              <Shield size={16} className="text-gray-600" /> SOC-ready · RLS · PBKDF2 · TOTP
            </span>
            <span className="inline-flex items-center gap-2 text-gray-500">
              <PlugZap size={16} className="text-gray-600" /> Razorpay · Supabase · Resend
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
