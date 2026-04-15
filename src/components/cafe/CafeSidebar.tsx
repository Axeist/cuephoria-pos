import { useState, useMemo, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ClipboardList,
  BarChart3,
  UserCog,
  Menu,
  LogOut,
  ShoppingCart,
  CookingPot,
} from "lucide-react";
import { useCafeAuth } from "@/context/CafeAuthContext";
import { useCafeOrders } from "@/hooks/cafe/useCafeOrders";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const badge = item.badge ?? 0;

  const inner = (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-150",
        collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5",
        active
          ? "bg-gradient-to-r from-orange-500/20 to-transparent text-white ring-1 ring-white/[0.08]"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
      )}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          collapsed ? "h-5 w-5" : "h-5 w-5"
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.6} />
        {badge > 0 && collapsed && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-zinc-950" />
        )}
      </span>

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <span className="flex h-4.5 min-w-[1.1rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {active && (
            <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-orange-400 to-amber-500" />
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="border-white/10 bg-zinc-900/95 font-quicksand text-xs"
        >
          {item.label}
          {badge > 0 ? ` (${badge})` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export function CafeSidebar() {
  const location = useLocation();
  const { user, logout } = useCafeAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expanded = hovered;
  const collapsed = !expanded;

  const { activeOrders } = useCafeOrders(user?.locationId);
  const orderBadge = activeOrders.length;

  const onEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);

  const onLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), 250);
  }, []);

  const navItems: NavItem[] = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role === "cafe_admin";
    if (isAdmin) {
      return [
        { label: "Dashboard", href: "/cafe/dashboard", icon: LayoutDashboard },
        { label: "POS", href: "/cafe/pos", icon: ShoppingCart },
        { label: "Kitchen (KOT)", href: "/cafe/kitchen", icon: CookingPot },
        { label: "Menu & Tables", href: "/cafe/menu", icon: UtensilsCrossed },
        { label: "Customers", href: "/cafe/customers", icon: Users },
        { label: "Orders", href: "/cafe/orders", icon: ClipboardList, badge: orderBadge },
        { label: "Reports", href: "/cafe/reports", icon: BarChart3 },
        { label: "Staff", href: "/cafe/staff", icon: UserCog },
      ];
    }
    return [
      { label: "POS", href: "/cafe/pos", icon: ShoppingCart },
      { label: "Kitchen (KOT)", href: "/cafe/kitchen", icon: CookingPot },
      { label: "Menu & Tables", href: "/cafe/menu", icon: UtensilsCrossed },
      { label: "Customers", href: "/cafe/customers", icon: Users },
      { label: "Orders", href: "/cafe/orders", icon: ClipboardList, badge: orderBadge },
    ];
  }, [user, orderBadge]);

  if (!user) return null;

  const closeMobile = () => setMobileOpen(false);

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

  /* ── shared inner layout ── */
  const sidebarInner = (opts: { mobile?: boolean }) => {
    const isCollapsed = !opts.mobile && collapsed;
    return (
      <TooltipProvider delayDuration={120}>
        <div className="flex h-full min-h-0 flex-col">
          {/* Header / brand */}
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-white/[0.06]",
              isCollapsed ? "justify-center px-1.5 py-3" : "gap-2 px-3 py-3"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e0] p-0.5 shadow-md ring-1 ring-white/10">
              <img src="/choco-loca-logo.png" alt="" className="h-full w-full rounded-md object-contain" />
            </div>
            {!isCollapsed && (
              <>
                <span className="text-zinc-600 text-[10px] shrink-0">×</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 p-0.5 shadow-md ring-1 ring-white/10">
                  <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="" className="h-full w-full rounded-md object-contain" />
                </div>
                <div className="min-w-0 ml-0.5">
                  <p className="font-heading text-sm font-bold leading-tight text-transparent bg-gradient-to-r from-orange-400 to-[hsl(270_60%_65%)] bg-clip-text truncate">
                    Choco Loca
                  </p>
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-500 truncate">
                    Cakes & Cafe × Cuephoria
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="min-h-0 flex-1 px-1.5 py-2">
            {!isCollapsed && (
              <p className="mb-1 px-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                Navigate
              </p>
            )}
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={location.pathname === item.href}
                  collapsed={isCollapsed}
                  onNavigate={opts.mobile ? closeMobile : undefined}
                />
              ))}
            </nav>
          </ScrollArea>

          {/* Footer / user */}
          <div className={cn("shrink-0 border-t border-white/[0.06]", isCollapsed ? "p-1.5" : "p-2.5 space-y-1.5")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10 cursor-default">
                    {user.displayName?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="border-white/10 bg-zinc-900/95 font-quicksand text-xs">
                  {user.displayName} · {roleLabel}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10">
                    {user.displayName?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-zinc-100">{user.displayName}</p>
                    <p className="truncate text-[10px] capitalize text-zinc-500">{roleLabel}</p>
                  </div>
                </div>
              </div>
            )}

            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { closeMobile(); logout(); }}
                    className="mt-1.5 flex w-full items-center justify-center rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="border-white/10 bg-zinc-900/95 font-quicksand text-xs">
                  Sign out
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 rounded-lg text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 h-8 text-xs"
                onClick={() => { closeMobile(); logout(); }}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span>Sign out</span>
              </Button>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  };

  /* ── mobile: top bar + sheet ── */
  if (isMobile) {
    return (
      <>
        <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.08] bg-zinc-950/90 px-4 backdrop-blur-xl lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-300 hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-white/10 bg-zinc-950/98 p-0 backdrop-blur-2xl">
              {sidebarInner({ mobile: true })}
            </SheetContent>
          </Sheet>
          <span className="font-display text-base font-semibold text-white">Choco Loca</span>
          <div className="w-10" />
        </div>
        <div className="h-14 shrink-0 lg:hidden" aria-hidden />
      </>
    );
  }

  /* ── desktop sidebar ── */
  return (
    <aside
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "relative z-20 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-zinc-950/98 shadow-[4px_0_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-[width] duration-200 ease-out lg:flex",
        expanded ? "w-[236px]" : "w-[52px]"
      )}
    >
      {/* no collapse button — hover auto-expands */}
      {sidebarInner({})}
    </aside>
  );
}

export default CafeSidebar;
