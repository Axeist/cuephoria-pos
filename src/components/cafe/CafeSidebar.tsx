import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, ChefHat, UtensilsCrossed, ClipboardList, BarChart2, PowerOff, Menu, Coffee, User, Bell, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const CafeSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useCafeAuth();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { activeOrders } = useCafeOrders(user?.locationId);
  const { pendingKots } = useCafeKOT(user?.locationId);

  if (!user) return null;

  const isCafeAdmin = user.role === 'cafe_admin';
  const isKitchen = user.role === 'kitchen';

  const roleLabel = isCafeAdmin ? 'Cafe Admin' : isKitchen ? 'Kitchen' : 'Cashier';
  const activeOrderCount = activeOrders.length;
  const pendingKotCount = pendingKots.length;

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/cafe/dashboard', roles: ['cafe_admin'], badge: 0 },
    { icon: ShoppingCart, label: 'POS', path: '/cafe/pos', roles: ['cafe_admin', 'cashier'], badge: 0 },
    { icon: ChefHat, label: 'Kitchen', path: '/cafe/kitchen', roles: ['cafe_admin', 'kitchen'], badge: pendingKotCount },
    { icon: UtensilsCrossed, label: 'Menu & Tables', path: '/cafe/menu', roles: ['cafe_admin'], badge: 0 },
    { icon: Users, label: 'Customers', path: '/cafe/customers', roles: ['cafe_admin', 'cashier'], badge: 0 },
    { icon: ClipboardList, label: 'Orders', path: '/cafe/orders', roles: ['cafe_admin', 'cashier'], badge: activeOrderCount },
    { icon: BarChart2, label: 'Reports', path: '/cafe/reports', roles: ['cafe_admin'], badge: 0 },
  ].filter(item => item.roles.includes(user.role));

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 w-full z-30 bg-[#1A1F2C] p-3 sm:p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[85%] sm:w-[80%] max-w-[280px] bg-[#1A1F2C] border-r-0">
                <div className="h-full flex flex-col">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-[#f5f0e0] flex items-center justify-center shadow-md p-0.5 flex-shrink-0">
                        <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-md" />
                      </div>
                      <span className="text-xs text-gray-600">&times;</span>
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-md p-0.5 flex-shrink-0">
                        <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-md" />
                      </div>
                      <div className="flex flex-col ml-1">
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading leading-tight">
                          Choco Loca
                        </span>
                        <span className="text-xs text-gray-500 font-quicksand">&times; Cuephoria</span>
                      </div>
                    </div>
                  </div>
                  <div className="mx-4 h-px bg-orange-500/30" />
                  <div className="flex-1 overflow-auto py-2">
                    <div className="px-2">
                      {menuItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSheetOpen(false)}
                          className={`flex items-center py-3 px-3 rounded-md my-1 ${
                            location.pathname === item.path
                              ? 'bg-cuephoria-dark text-orange-400'
                              : 'text-white hover:bg-cuephoria-dark/50'
                          }`}
                        >
                          <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-orange-400 animate-pulse-soft' : ''}`} />
                          <span className="font-quicksand text-base flex-1">{item.label}</span>
                          {item.badge > 0 && (
                            <span className="ml-auto h-5 min-w-[20px] px-1 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="group bg-cuephoria-dark rounded-lg p-4 shadow-lg border border-orange-500/20 hover:border-orange-500/60 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ease-in-out">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <User className="h-6 w-6 text-orange-400" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium font-quicksand text-white">{user.displayName}</span>
                            <span className="text-xs text-orange-400 font-quicksand">{roleLabel}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSheetOpen(false); logout(); }}
                          className="p-2 rounded-md bg-cuephoria-darker hover:bg-red-500 transition-all duration-300"
                          title="Logout"
                        >
                          <PowerOff className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-[#f5f0e0] flex items-center justify-center p-0.5">
                <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-sm" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading">
                Choco Loca
              </span>
            </div>
          </div>
        </div>
        <div className="pt-[64px] sm:pt-16"></div>
      </>
    );
  }

  return (
    <Sidebar className="border-r-0 bg-[#1A1F2C] text-white w-[250px]">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 rounded-xl bg-[#f5f0e0] flex items-center justify-center shadow-lg shadow-orange-500/20 p-1 flex-shrink-0">
            <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-lg" />
          </div>
          <span className="text-gray-600 text-xs">&times;</span>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-lg shadow-purple-500/15 p-0.5 flex-shrink-0">
            <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-lg" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading leading-tight">
            Choco Loca
          </span>
          <span className="text-xs text-gray-500 font-quicksand block">Cakes and Cafe &times; Cuephoria</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator className="mx-4 bg-orange-500/30" />
      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={item.path} className={`animate-fade-in delay-${index * 100} text-sm`}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                    <Link to={item.path} className="flex items-center menu-item py-2.5 relative">
                      <item.icon className={`mr-3 h-6 w-6 ${location.pathname === item.path ? 'text-orange-400 animate-pulse-soft' : ''}`} />
                      <span className="font-quicksand flex-1">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="ml-auto h-5 min-w-[20px] px-1 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse-soft">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="group bg-cuephoria-dark rounded-lg p-4 shadow-lg border border-orange-500/20 hover:border-orange-500/60 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-orange-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium font-quicksand text-white">{user.displayName}</span>
                <span className="text-xs text-orange-400 font-quicksand">{roleLabel}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md bg-cuephoria-darker hover:bg-red-500 transition-all duration-300 group-hover:shadow-lg"
              title="Logout"
            >
              <PowerOff className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default CafeSidebar;
