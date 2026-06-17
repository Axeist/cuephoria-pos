import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";
import { useCafeAuth } from "@/context/CafeAuthContext";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import { useCafeNavItems } from "@/hooks/useCafeNavItems";
import { useCafeMobileNav } from "./CafeMobileNavContext";

export function CafeMobileNavSheet() {
  const { isMobile } = useViewMode();
  const { sheetOpen, setSheetOpen, closeSheet } = useCafeMobileNav();
  const location = useLocation();
  const { user, logout } = useCafeAuth();
  const { navItems } = useCafeNavItems();

  if (!isMobile || !user) return null;

  const roleLabel =
    user.role === "cafe_admin"
      ? "Cafe admin"
      : user.role === "staff"
        ? "Staff"
        : user.role === "cashier"
          ? "Cashier"
          : user.role === "kitchen"
            ? "Kitchen"
            : user.role;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="left"
        className="w-[86%] max-w-[300px] border-white/10 bg-zinc-950/98 p-0 backdrop-blur-2xl lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f0e0] p-0.5 ring-1 ring-white/10">
              <img
                src="/choco-loca-logo.png"
                alt=""
                className="h-full w-full rounded-md object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Choco Loca</div>
              <div className="text-[11px] text-zinc-500">{roleLabel}</div>
            </div>
          </div>
          <nav className="flex-1 overflow-auto p-3 space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={closeSheet}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-orange-500/20 text-white ring-1 ring-white/[0.08]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/[0.06] p-3">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs text-zinc-500">
              <img
                src={CUETRONIX_ASSETS.iconUrl}
                alt=""
                className="h-5 w-5 rounded"
              />
              <span>Powered by Cuetronix</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-zinc-400 hover:text-zinc-200"
              onClick={() => {
                closeSheet();
                logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
