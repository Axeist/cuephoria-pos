import { useMemo } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ClipboardList,
  BarChart3,
  UserCog,
  ShoppingCart,
  CookingPot,
  type LucideIcon,
} from "lucide-react";
import { useCafeAuth } from "@/context/CafeAuthContext";
import { useCafeOrders } from "@/hooks/cafe/useCafeOrders";

export type CafeNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export function useCafeNavItems() {
  const { user } = useCafeAuth();
  const { activeOrders } = useCafeOrders(user?.locationId);
  const orderBadge = activeOrders.length;

  const navItems: CafeNavItem[] = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role === "cafe_admin";
    if (isAdmin) {
      return [
        { label: "Dashboard", href: "/cafe/dashboard", icon: LayoutDashboard },
        { label: "POS", href: "/cafe/pos", icon: ShoppingCart },
        { label: "Kitchen (KOT)", href: "/cafe/kitchen", icon: CookingPot },
        { label: "Menu & Tables", href: "/cafe/menu", icon: UtensilsCrossed },
        { label: "Customers", href: "/cafe/customers", icon: Users },
        {
          label: "Orders",
          href: "/cafe/orders",
          icon: ClipboardList,
          badge: orderBadge,
        },
        { label: "Reports", href: "/cafe/reports", icon: BarChart3 },
        { label: "Staff", href: "/cafe/staff", icon: UserCog },
      ];
    }
    return [
      { label: "POS", href: "/cafe/pos", icon: ShoppingCart },
      { label: "Kitchen (KOT)", href: "/cafe/kitchen", icon: CookingPot },
      { label: "Menu & Tables", href: "/cafe/menu", icon: UtensilsCrossed },
      { label: "Customers", href: "/cafe/customers", icon: Users },
      {
        label: "Orders",
        href: "/cafe/orders",
        icon: ClipboardList,
        badge: orderBadge,
      },
    ];
  }, [user, orderBadge]);

  const isAdmin = user?.role === "cafe_admin";

  return { navItems, isAdmin, orderBadge };
}
