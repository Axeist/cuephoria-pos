/**
 * PlatformShell — layout for all authenticated platform-admin pages.
 * Matte-black background, soft purple/indigo accents (Cuetronix vibe),
 * navigation rail at top with admin identity + logout.
 */

import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Building2, Activity, Sparkles, Shield, Menu, Megaphone, FlaskConical } from "lucide-react";
import { PARENT_BRAND, PRODUCT_BRAND } from "@/branding/brand";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/platform", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/platform/organizations", label: "Organizations", icon: Building2, end: false },
  { to: "/platform/admins", label: "Admins", icon: Shield, end: false },
  { to: "/platform/plans", label: "Billing plans", icon: Sparkles, end: false },
  { to: "/platform/broadcasts", label: "Broadcasts", icon: Megaphone, end: false },
  { to: "/platform/sandbox", label: "Demo sandboxes", icon: FlaskConical, end: false },
  { to: "/platform/audit", label: "Audit log", icon: Activity, end: false },
];

export const PlatformShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, logout } = usePlatformAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07070e] text-zinc-100 overflow-x-hidden">
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
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-2">
            {/* Mobile hamburger — opens the navigation sheet. */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-zinc-300 hover:text-white hover:bg-white/10 -ml-2"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[78%] max-w-[280px] border-white/10 p-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(7,7,14,0.98) 0%, rgba(13,13,25,0.98) 100%)',
                  backdropFilter: 'blur(24px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                }}
              >
                <div className="flex h-full flex-col">
                  <div className="px-4 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-black grid place-items-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                        <img src={PRODUCT_BRAND.iconUrl} alt={PRODUCT_BRAND.name} className="h-full w-full object-contain" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                          {PRODUCT_BRAND.name} · Platform
                        </div>
                        <div className="text-sm font-semibold text-zinc-100">Operator console</div>
                      </div>
                    </div>
                  </div>
                  <nav className="flex-1 overflow-auto p-2 space-y-0.5">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setMobileNavOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all",
                              isActive
                                ? "bg-white/10 text-white"
                                : "text-zinc-400 hover:text-white hover:bg-white/5",
                            )
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </nav>
                  <div className="p-3 border-t border-white/5">
                    <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 mb-2">
                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {admin?.displayName || admin?.email}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{admin?.email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-zinc-300 hover:text-white hover:bg-white/10"
                      onClick={async () => {
                        setMobileNavOpen(false);
                        await logout();
                        navigate("/platform/login", { replace: true });
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden md:flex relative h-9 w-9 rounded-lg overflow-hidden bg-black place-items-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                <img src={PRODUCT_BRAND.iconUrl} alt={PRODUCT_BRAND.name} className="h-full w-full object-contain" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-zinc-500 truncate">
                  {PRODUCT_BRAND.name} · Platform
                </div>
                <div className="text-sm font-semibold text-zinc-100 truncate">Operator console</div>
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

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden md:block text-right leading-tight">
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
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="mx-auto max-w-[1400px] w-full min-w-0 px-4 sm:px-6 py-6 sm:py-8">{children}</div>
        </main>

        <footer className="border-t border-white/5 py-4 text-center text-[11px] text-zinc-600">
          {PRODUCT_BRAND.name} operator console · {PARENT_BRAND.name} · internal use only
        </footer>
      </div>
    </div>
  );
};
