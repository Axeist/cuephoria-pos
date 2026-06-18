import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  ShoppingCart,
  Clock,
  Package,
  Users,
  BarChart2,
  Calendar,
  Trophy,
  Users2,
  UserCircle,
  Bot,
  CreditCard,
  Settings,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { SIDEBAR_PERMISSIONS } from "@/constants/permissionCatalog";
import { useEntitlements } from "@/hooks/useEntitlements";

export type AppNavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

/**
 * Shared staff-app nav items for sidebar + mobile bottom nav / sheet.
 */
export function useAppNavItems() {
  const queryClient = useQueryClient();
  const { can, showStaffManagement, showMyPortal, isLoading: permsLoading } =
    usePermissions();
  const { can: canPlan } = useEntitlements();

  const prefetchBilling = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: ["tenant-billing"],
      queryFn: async () => {
        const res = await fetch("/api/tenant/billing", {
          credentials: "same-origin",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) {
          throw new Error(
            json?.error || `Billing prefetch failed (${res.status})`,
          );
        }
        return json;
      },
      staleTime: 60_000,
    });
  }, [queryClient]);

  const filterByPermission = <T extends { path: string }>(items: T[]): T[] => {
    if (permsLoading) return items;
    return items.filter((item) => {
      const required = SIDEBAR_PERMISSIONS[item.path];
      return !required || can(required);
    });
  };

  const baseMenuItems = filterByPermission([
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: ShoppingCart, label: "POS", path: "/pos" },
    { icon: Clock, label: "Gaming Stations", path: "/stations" },
    { icon: Package, label: "Products", path: "/products" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: BarChart2, label: "Reports", path: "/reports" },
    ...(canPlan("bookings_enabled")
      ? [{ icon: Calendar, label: "Bookings", path: "/booking-management" }]
      : []),
    ...(canPlan("tournaments_enabled")
      ? [{ icon: Trophy, label: "Tournaments", path: "/tournaments" }]
      : []),
  ]);

  const hrItems = canPlan("staff_hr_enabled")
    ? [
        ...(showStaffManagement
          ? [{ icon: Users2, label: "Staff Management", path: "/staff" as const }]
          : []),
        ...(showMyPortal
          ? [{ icon: UserCircle, label: "My Portal", path: "/staff-portal" as const }]
          : []),
      ]
    : [];

  const tailItems = filterByPermission([
    ...(canPlan("premium_modules_enabled")
      ? [{ icon: Bot, label: "Cuetronix AI", path: "/chat-ai" }]
      : []),
    ...(can("settings.subscription.view")
      ? [{ icon: CreditCard, label: "Subscription", path: "/subscription" }]
      : []),
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: BookOpen, label: "How to Use", path: "/how-to-use" },
  ]);

  const menuItems: AppNavItem[] = [...baseMenuItems, ...hrItems, ...tailItems];

  const bookingsEnabled = canPlan("bookings_enabled");

  return {
    menuItems,
    baseMenuItems,
    hrItems,
    tailItems,
    bookingsEnabled,
    prefetchBilling,
    permsLoading,
  };
}
