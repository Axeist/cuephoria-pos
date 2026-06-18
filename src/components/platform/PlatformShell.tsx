import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  Activity,
  Sparkles,
  Shield,
  Menu,
  Megaphone,
  FlaskConical,
  Search,
} from "lucide-react";
import { PARENT_BRAND, PRODUCT_BRAND } from "@/branding/brand";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PlatformCommandMenu } from "./PlatformCommandMenu";

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
  const [maintenanceMode, setMaintenanceMode] = useState(() => {
    return localStorage.getItem("cuetronix_platform_mock_maintenance") === "true";
  });

  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setMaintenanceMode(customEvent.detail);
    };
    window.addEventListener("platform-maintenance-updated", handleUpdated);
    return () => window.removeEventListener("platform-maintenance-updated", handleUpdated);
  }, []);

  return (
    <div className="min-h-screen bg-[#070512] text-zinc-100 flex flex-col overflow-x-hidden font-quicksand">
      {/* Simulated maintenance banner alert */}
      {maintenanceMode && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 py-1.5 px-4 text-center text-xs font-bold text-white relative z-[60] flex items-center justify-center gap-2 shadow-md">
          <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
          <span>Operator Console sandbox simulation banner: System scheduled maintenance window is active.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 relative z-10">
        {/* Ambient gradient (non-interactive) */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-80"
          style={{
            background:
              "radial-gradient(1200px circle at 15% 0%, rgba(124,58,237,0.16), transparent 60%), radial-gradient(900px circle at 90% 10%, rgba(236,72,153,0.1), transparent 55%), radial-gradient(800px circle at 50% 100%, rgba(59,130,246,0.06), transparent 55%)",
          }}
        />

        {/* Global Command Menu */}
        <PlatformCommandMenu />

        {/* Desktop left persistent sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-[#0d0a21]/20 backdrop-blur-md sticky top-0 h-screen p-5 shrink-0 z-20">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-white/5 mb-6">
            <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-black grid place-items-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 shrink-0">
              <img src={PRODUCT_BRAND.iconUrl} alt={PRODUCT_BRAND.name} className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 truncate">
                {PRODUCT_BRAND.name} · Platform
              </div>
              <div className="text-sm font-semibold text-zinc-100 truncate">Operator console</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 border border-transparent",
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 text-white border-indigo-500/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]"
                        : "text-zinc-400 hover:text-white hover:bg-white/5",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-white/5 pt-4 mt-auto">
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-[11px] font-bold text-white shadow-inner shrink-0 font-mono">
                  {(admin?.displayName || admin?.email || "OP").substring(0, 2).toUpperCase()}
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {admin?.displayName || "Operator"}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{admin?.email}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile view topbar & page body wrapper */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0 min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/[0.06] backdrop-blur-lg bg-[#0d0a21]/50 shadow-[0_2px_15px_rgba(0,0,0,0.15)] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-initial">
              {/* Mobile hamburger menu */}
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
                      "linear-gradient(180deg, rgba(7,5,18,0.98) 0%, rgba(15,10,32,0.98) 100%)",
                    backdropFilter: "blur(24px) saturate(140%)",
                    WebkitBackdropFilter: "blur(24px) saturate(140%)",
                  }}
                >
                  <div className="flex h-full flex-col font-quicksand">
                    <div className="px-4 py-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-black grid place-items-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                          <img src={PRODUCT_BRAND.iconUrl} alt={PRODUCT_BRAND.name} className="h-full w-full object-contain" />
                        </div>
                        <div className="leading-tight">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            {PRODUCT_BRAND.name} · Platform
                          </div>
                          <div className="text-sm font-semibold text-zinc-100 font-quicksand">Operator console</div>
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

              {/* Mobile-only branding title */}
              <div className="flex items-center gap-2.5 md:hidden min-w-0">
                <div className="h-6 w-6 rounded bg-black grid place-items-center ring-1 ring-white/10 shrink-0">
                  <img src={PRODUCT_BRAND.iconUrl} alt={PRODUCT_BRAND.name} className="h-4 w-4 object-contain" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 truncate">Platform</span>
              </div>

              {/* CMD+K trigger input button on desktop */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-platform-command-palette"));
                }}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-[#0b061c]/40 hover:bg-[#0b061c]/70 hover:border-white/10 text-zinc-400 hover:text-zinc-200 transition-all text-xs font-medium w-64 text-left cursor-pointer font-quicksand"
              >
                <Search className="h-3.5 w-3.5 text-zinc-500" />
                <span className="flex-1">Search or type command...</span>
                <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[9px] font-bold text-zinc-400">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white hover:bg-white/5 h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-xl"
                onClick={async () => {
                  await logout();
                  navigate("/platform/login", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
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
    </div>
  );
};
