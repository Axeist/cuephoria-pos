import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { useCafeAuth } from "@/context/CafeAuthContext";
import { useCafeOrders } from "@/hooks/cafe/useCafeOrders";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  expanded,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const badge = item.badge ?? 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.href}
          onClick={onNavigate}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-lg py-1.5 text-[13px] font-medium transition-all duration-200",
            expanded ? "px-2.5" : "justify-center px-0",
            active
              ? "bg-gradient-to-r from-orange-500/[0.18] via-orange-500/[0.08] to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.1]"
              : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
          )}
        >
          <span
            className={cn(
              "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-orange-500/25 text-orange-200 shadow-inner"
                : "text-zinc-500 group-hover:text-zinc-300"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {badge > 0 && !expanded && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-zinc-950" />
            )}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate transition-[opacity,width] duration-200",
              expanded ? "opacity-100" : "w-0 overflow-hidden opacity-0"
            )}
          >
            {item.label}
          </span>
          {badge > 0 && expanded && (
            <span className="mr-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {active && expanded && (
            <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-orange-400 to-amber-500 shadow-[0_0_12px_rgba(251,146,60,0.45)]" />
          )}
        </Link>
      </TooltipTrigger>
      {!expanded && (
        <TooltipContent side="right" className="border-white/10 bg-zinc-900/95 font-quicksand text-xs">
          {item.label}
          {badge > 0 ? ` (${badge} active)` : ""}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export function CafeSidebar() {
  const location = useLocation();
  const { user, logout } = useCafeAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(() => {
    try {
      const v = localStorage.getItem("cafe-sidebar-expanded");
      return v !== "false";
    } catch {
      return true;
    }
  });
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expanded = pinned || hovered;

  const { activeOrders } = useCafeOrders(user?.locationId);
  const orderBadge = activeOrders.length;

  useEffect(() => {
    try {
      localStorage.setItem("cafe-sidebar-expanded", String(pinned));
    } catch {
      /* ignore */
    }
  }, [pinned]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!pinned) setHovered(true);
  }, [pinned]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const navItems: NavItem[] = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role === "cafe_admin";
    if (isAdmin) {
      return [
        { label: "Dashboard", href: "/cafe/dashboard", icon: LayoutDashboard },
        { label: "POS", href: "/cafe/pos", icon: ShoppingCart },
        { label: "Menu & Tables", href: "/cafe/menu", icon: UtensilsCrossed },
        { label: "Customers", href: "/cafe/customers", icon: Users },
        { label: "Orders", href: "/cafe/orders", icon: ClipboardList, badge: orderBadge },
        { label: "Reports", href: "/cafe/reports", icon: BarChart3 },
        { label: "Staff", href: "/cafe/staff", icon: UserCog },
      ];
    }
    return [
      { label: "POS", href: "/cafe/pos", icon: ShoppingCart },
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

  const sidebarInner = (opts: { mobile?: boolean }) => (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-white/[0.06] px-3 py-3",
            !expanded && !opts.mobile && "justify-center px-2"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-2",
              !expanded && !opts.mobile && "justify-center"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e0] p-0.5 shadow-md shadow-orange-500/15 ring-1 ring-white/10">
              <img
                src="/choco-loca-logo.png"
                alt=""
                className="h-full w-full rounded-md object-contain"
              />
            </div>
            {(expanded || opts.mobile) && (
              <>
                <span className="text-zinc-600 text-[10px] flex-shrink-0">×</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 p-0.5 shadow-md shadow-purple-500/15 ring-1 ring-white/10">
                  <img
                    src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                    alt=""
                    className="h-full w-full rounded-md object-contain"
                  />
                </div>
                <div className="min-w-0 ml-1">
                  <p className="font-heading text-sm font-bold leading-tight text-transparent bg-gradient-to-r from-orange-400 to-[hsl(270_60%_65%)] bg-clip-text">
                    Choco Loca
                  </p>
                  <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                    Cakes & Cafe × Cuephoria
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2 py-2.5">
          <p
            className={cn(
              "mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-600",
              !expanded && !opts.mobile && "sr-only"
            )}
          >
            Navigate
          </p>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={location.pathname === item.href}
                expanded={opts.mobile ? true : expanded}
                onNavigate={opts.mobile ? closeMobile : undefined}
              />
            ))}
          </nav>
        </ScrollArea>

        <div className="shrink-0 space-y-1.5 border-t border-white/[0.06] p-2.5">
          <div
            className={cn(
              "rounded-xl border border-white/[0.06] bg-white/[0.03] p-2 backdrop-blur-sm",
              !expanded && !opts.mobile && "px-1.5 py-2"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2",
                !expanded && !opts.mobile && "justify-center"
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10">
                {user.displayName?.charAt(0).toUpperCase() ?? "?"}
              </div>
              {(expanded || opts.mobile) && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-100">{user.displayName}</p>
                  <p className="truncate text-[10px] capitalize text-zinc-500">{roleLabel}</p>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2 rounded-lg text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 h-8 text-xs",
              !expanded && !opts.mobile && "justify-center px-0"
            )}
            onClick={() => {
              closeMobile();
              logout();
            }}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {(expanded || opts.mobile) && <span>Sign out</span>}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );

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

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative z-20 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/98 shadow-[4px_0_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-[width] duration-200 ease-out lg:flex",
        expanded ? "w-[240px]" : "w-[60px]"
      )}
    >
      <div className="absolute -right-3 top-16 z-10">
        <Button
          size="icon"
          variant="secondary"
          className="h-6 w-6 rounded-full border border-white/10 bg-zinc-900/95 shadow-lg backdrop-blur-sm hover:bg-zinc-800"
          onClick={() => setPinned(!pinned)}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          {pinned ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {sidebarInner({})}
    </aside>
  );
}

export default CafeSidebar;
