import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Clock,
  Calendar,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";
import { useAppNavItems } from "@/hooks/useAppNavItems";
import { useMobileNav } from "./MobileNavContext";

type TabDef = {
  path: string;
  icon: typeof Home;
  label: string;
  matchPaths: string[];
  action?: "more";
};

/**
 * Fixed bottom tab bar for the staff app on mobile — primary navigation
 * reachable by thumb, modeled on the customer portal BottomNav.
 */
export function AppBottomNav() {
  const { isMobile } = useViewMode();
  const location = useLocation();
  const { openSheet } = useMobileNav();
  const { bookingsEnabled } = useAppNavItems();

  if (!isMobile) return null;

  const tabs: TabDef[] = [
    {
      path: "/dashboard",
      icon: Home,
      label: "Home",
      matchPaths: ["/dashboard"],
    },
    {
      path: "/pos",
      icon: ShoppingCart,
      label: "POS",
      matchPaths: ["/pos"],
    },
    {
      path: "/stations",
      icon: Clock,
      label: "Stations",
      matchPaths: ["/stations"],
    },
    ...(bookingsEnabled
      ? [
          {
            path: "/booking-management",
            icon: Calendar,
            label: "Bookings",
            matchPaths: ["/booking-management"],
          } as TabDef,
        ]
      : []),
    {
      path: "#more",
      icon: LayoutGrid,
      label: "More",
      matchPaths: [],
      action: "more",
    },
  ];

  const morePaths = [
    "/products",
    "/customers",
    "/reports",
    "/tournaments",
    "/staff",
    "/staff-portal",
    "/chat-ai",
    "/subscription",
    "/settings",
    "/how-to-use",
    "/login-logs",
    "/account",
    "/organization",
    "/billing",
  ];

  const isActive = (tab: TabDef) => {
    if (tab.action === "more") {
      return morePaths.some(
        (p) =>
          location.pathname === p ||
          location.pathname.startsWith(`${p}/`),
      );
    }
    return tab.matchPaths.some((p) => location.pathname === p);
  };

  return createPortal(
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,6,22,0.98)_0%,rgba(7,3,15,0.98)_100%)] backdrop-blur-xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.5)] md:hidden"
      style={{
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);

          if (tab.action === "more") {
            return (
              <button
                key="more"
                type="button"
                aria-label="More"
                onClick={openSheet}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-lg transition-colors duration-200 touch-manipulation",
                  active
                    ? "text-[var(--brand-primary-hex)]"
                    : "text-white/55 hover:text-white hover:bg-white/[0.06]",
                )}
              >
                <Icon
                  className={cn("h-[22px] w-[22px]", active && "scale-110")}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    active && "font-semibold",
                  )}
                >
                  {tab.label}
                </span>
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-[var(--brand-primary-hex)] to-[var(--brand-accent-hex)]"
                    aria-hidden
                  />
                )}
              </button>
            );
          }

          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-label={tab.label}
              className={cn(
                "relative flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-lg transition-colors duration-200 touch-manipulation",
                active
                  ? "text-[var(--brand-primary-hex)]"
                  : "text-white/55 hover:text-white hover:bg-white/[0.06]",
              )}
            >
              <Icon
                className={cn("h-[22px] w-[22px]", active && "scale-110")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  active && "font-semibold",
                )}
              >
                {tab.label}
              </span>
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-[var(--brand-primary-hex)] to-[var(--brand-accent-hex)]"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
}
