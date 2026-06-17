import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  CookingPot,
  ClipboardList,
  LayoutGrid,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";
import { useCafeNavItems } from "@/hooks/useCafeNavItems";
import { useCafeMobileNav } from "./CafeMobileNavContext";

type TabDef = {
  href: string;
  icon: typeof ShoppingCart;
  label: string;
  matchPaths: string[];
  badge?: number;
  action?: "more";
};

export function CafeBottomNav() {
  const { isMobile } = useViewMode();
  const location = useLocation();
  const { openSheet } = useCafeMobileNav();
  const { isAdmin, orderBadge } = useCafeNavItems();

  if (!isMobile) return null;

  const tabs: TabDef[] = isAdmin
    ? [
        {
          href: "/cafe/dashboard",
          icon: LayoutDashboard,
          label: "Home",
          matchPaths: ["/cafe/dashboard"],
        },
        {
          href: "/cafe/pos",
          icon: ShoppingCart,
          label: "POS",
          matchPaths: ["/cafe/pos"],
        },
        {
          href: "/cafe/kitchen",
          icon: CookingPot,
          label: "Kitchen",
          matchPaths: ["/cafe/kitchen"],
        },
        {
          href: "/cafe/orders",
          icon: ClipboardList,
          label: "Orders",
          matchPaths: ["/cafe/orders"],
          badge: orderBadge,
        },
        {
          href: "#more",
          icon: LayoutGrid,
          label: "More",
          matchPaths: [],
          action: "more",
        },
      ]
    : [
        {
          href: "/cafe/pos",
          icon: ShoppingCart,
          label: "POS",
          matchPaths: ["/cafe/pos"],
        },
        {
          href: "/cafe/kitchen",
          icon: CookingPot,
          label: "Kitchen",
          matchPaths: ["/cafe/kitchen"],
        },
        {
          href: "/cafe/orders",
          icon: ClipboardList,
          label: "Orders",
          matchPaths: ["/cafe/orders"],
          badge: orderBadge,
        },
        {
          href: "/cafe/menu",
          icon: UtensilsCrossed,
          label: "Menu",
          matchPaths: ["/cafe/menu"],
        },
        {
          href: "#more",
          icon: LayoutGrid,
          label: "More",
          matchPaths: [],
          action: "more",
        },
      ];

  const morePaths = [
    "/cafe/menu",
    "/cafe/customers",
    "/cafe/reports",
    "/cafe/staff",
    "/cafe/dashboard",
  ];

  const isActive = (tab: TabDef) => {
    if (tab.action === "more") {
      return morePaths.some(
        (p) =>
          location.pathname === p || location.pathname.startsWith(`${p}/`),
      );
    }
    return tab.matchPaths.some((p) => location.pathname === p);
  };

  return createPortal(
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-zinc-950/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      aria-label="Cafe navigation"
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
                  "relative flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-lg touch-manipulation transition-colors",
                  active
                    ? "text-orange-400"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-label={tab.label}
              className={cn(
                "relative flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-lg touch-manipulation transition-colors",
                active ? "text-orange-400" : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <div className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 h-4 min-w-[16px] rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white flex items-center justify-center">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
}
