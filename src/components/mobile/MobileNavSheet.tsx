import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  User,
  PowerOff,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useViewMode } from "@/context/ViewModeContext";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import { cn } from "@/lib/utils";
import { useAppNavItems } from "@/hooks/useAppNavItems";
import { useMobileNav } from "./MobileNavContext";

/**
 * Full navigation sheet — opened from bottom "More" tab or header menu button.
 */
export function MobileNavSheet() {
  const { isMobile } = useViewMode();
  const { sheetOpen, setSheetOpen, closeSheet } = useMobileNav();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { menuItems, prefetchBilling } = useAppNavItems();
  const {
    mode: viewMode,
    setOverride,
  } = useViewMode();
  const branding = useTenantBrandingOptional();
  const override = branding?.override ?? {};
  const brandName =
    override.display_name || branding?.brand?.name || "Cuephoria";
  const brandLogo = override.logo_url;
  const isAdmin = user?.isAdmin || false;
  const showName =
    user?.displayName?.trim() || user?.username?.trim() || "User";

  if (!isMobile) return null;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="left"
        className="p-0 w-[86%] max-w-[300px] border-white/10 text-white md:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,6,22,0.98) 0%, rgba(7,3,15,0.98) 100%)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 flex items-center gap-3 min-w-0">
            <div
              className="relative h-11 w-11 rounded-xl grid place-items-center overflow-hidden flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
              }}
            >
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <img
                  src={CUETRONIX_ASSETS.iconUrl}
                  alt={CUETRONIX_ASSETS.logoAlt}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                Workspace
              </div>
              <div className="text-base font-extrabold text-white truncate">
                {brandName}
              </div>
            </div>
          </div>
          <div className="px-3 pb-2 flex items-center gap-2">
            <GlobalNotificationBell />
            <LocationSwitcher />
          </div>
          <div className="hero-divider mx-4" />
          <nav className="flex-1 overflow-auto p-3 space-y-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSheet}
                  onMouseEnter={
                    item.path === "/subscription" ? prefetchBilling : undefined
                  }
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl py-2.5 px-3 text-sm font-medium transition-colors duration-200",
                    active
                      ? "text-white"
                      : "text-white/65 hover:text-white hover:bg-white/[0.04]",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-xl opacity-90"
                      style={{
                        background:
                          "linear-gradient(90deg, color-mix(in oklab, var(--brand-primary-hex) 28%, transparent), color-mix(in oklab, var(--brand-accent-hex) 18%, transparent))",
                        border:
                          "1px solid color-mix(in oklab, var(--brand-primary-hex) 45%, transparent)",
                      }}
                    />
                  )}
                  <item.icon className="relative z-10 h-[18px] w-[18px] flex-shrink-0" />
                  <span className="relative z-10 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOverride("mobile")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  viewMode === "mobile"
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/[0.06]",
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverride("desktop");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  viewMode === "desktop"
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/[0.06]",
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
            </div>
          </div>
          <div className="p-3">
            <div className="glass-card p-3 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--brand-primary-hex) 35%, transparent), color-mix(in oklab, var(--brand-accent-hex) 25%, transparent))",
                }}
              >
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">
                  {showName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeSheet();
                  logout();
                }}
                className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-red-500/25 transition-colors touch-manipulation"
                title="Sign out"
              >
                <PowerOff className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
