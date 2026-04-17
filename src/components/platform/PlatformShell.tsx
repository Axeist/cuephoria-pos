/**
 * PlatformShell — layout for all authenticated platform-admin pages.
 * Matte-black background, soft purple/indigo accents (Cuetronix vibe),
 * navigation rail at top with admin identity + logout.
 */

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Building2, Activity, Sparkles } from "lucide-react";
import { PRODUCT_BRAND } from "@/branding/brand";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/platform", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/platform/organizations", label: "Organizations", icon: Building2, end: false },
  { to: "/platform/plans", label: "Plans", icon: Sparkles, end: false },
  { to: "/platform/audit", label: "Audit log", icon: Activity, end: false },
];

export const PlatformShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, logout } = usePlatformAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#07070e] text-zinc-100">
      {/* Ambient gradient (non-interactive) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          background:
            "radial-gradient(1200px circle at 15% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.12), transparent 55%), radial-gradient(800px circle at 50% 100%, rgba(56,189,248,0.08), transparent 55%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="border-b border-white/5 backdrop-blur-md bg-black/30">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 grid place-items-center shadow-lg shadow-indigo-500/30">
                <span className="font-black text-white text-sm tracking-tight">CX</span>
              </div>
              <div className="leading-tight">
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {PRODUCT_BRAND.name} · Platform
                </div>
                <div className="text-sm font-semibold text-zinc-100">Operator console</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-all",
                        isActive
                          ? "bg-white/10 text-white shadow-inner"
                          : "text-zinc-400 hover:text-white hover:bg-white/5",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-sm font-medium text-zinc-200">
                  {admin?.displayName || admin?.email}
                </div>
                <div className="text-xs text-zinc-500">{admin?.email}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={async () => {
                  await logout();
                  navigate("/platform/login", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-[1400px] px-6 py-8">{children}</div>
        </main>

        <footer className="border-t border-white/5 py-4 text-center text-[11px] text-zinc-600">
          {PRODUCT_BRAND.name} operator console · internal use only
        </footer>
      </div>
    </div>
  );
};
