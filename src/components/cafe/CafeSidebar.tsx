import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, UtensilsCrossed, ClipboardList, BarChart2, PowerOff, Menu, User, Users, UserPlus } from 'lucide-react';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const CafeSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useCafeAuth();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { activeOrders } = useCafeOrders(user?.locationId);

  if (!user) return null;

  const isCafeAdmin = user.role === 'cafe_admin';
  const isUnifiedStaff = user.role === 'cashier' || user.role === 'kitchen' || user.role === 'staff';
  const roleLabel = isCafeAdmin ? 'Cafe Admin' : 'Staff';
  const activeOrderCount = activeOrders.length;

  const adminMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/cafe/dashboard', roles: ['cafe_admin'], badge: 0 },
    { icon: ShoppingCart, label: 'POS', path: '/cafe/pos', roles: ['cafe_admin'], badge: 0 },
    { icon: UtensilsCrossed, label: 'Menu & Tables', path: '/cafe/menu', roles: ['cafe_admin'], badge: 0 },
    { icon: Users, label: 'Customers', path: '/cafe/customers', roles: ['cafe_admin'], badge: 0 },
    { icon: ClipboardList, label: 'Orders', path: '/cafe/orders', roles: ['cafe_admin'], badge: activeOrderCount },
    { icon: BarChart2, label: 'Reports', path: '/cafe/reports', roles: ['cafe_admin'], badge: 0 },
    { icon: UserPlus, label: 'Staff', path: '/cafe/staff', roles: ['cafe_admin'], badge: 0 },
  ];

  /** Same operational sections as admin (no dashboard / reports / staff management). */
  const staffMenuItems = [
    { icon: ShoppingCart, label: 'POS', path: '/cafe/pos', badge: 0 },
    { icon: UtensilsCrossed, label: 'Menu & Tables', path: '/cafe/menu', badge: 0 },
    { icon: Users, label: 'Customers', path: '/cafe/customers', badge: 0 },
    { icon: ClipboardList, label: 'Orders', path: '/cafe/orders', badge: activeOrderCount },
  ];

  const menuItems = isUnifiedStaff
    ? staffMenuItems
    : adminMenuItems.filter(item => item.roles.includes(user.role));

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
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`${
        expanded ? 'w-[250px]' : 'w-[60px]'
      } transition-all duration-300 ease-in-out bg-[#1A1F2C] text-white h-screen sticky top-0 flex-shrink-0 overflow-hidden flex flex-col z-20`}
    >
      {/* Header: logo row clips naturally at 60px, brand text fades in/out */}
      <div className="px-[10px] pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-[#f5f0e0] flex items-center justify-center shadow-lg shadow-orange-500/20 p-0.5 flex-shrink-0">
            <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-lg" />
          </div>
          <span className="text-gray-600 text-xs flex-shrink-0">&times;</span>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-lg shadow-purple-500/15 p-0.5 flex-shrink-0">
            <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-lg" />
          </div>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-16 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading leading-tight whitespace-nowrap block">
            Choco Loca
          </span>
          <span className="text-xs text-gray-500 font-quicksand whitespace-nowrap block">
            Cakes and Cafe &times; Cuephoria
          </span>
        </div>
      </div>

      <div className="mx-3 h-px bg-orange-500/30 flex-shrink-0" />

      {/* Menu: icon container is 44px = exactly fills the collapsed 60px minus 8px padding each side */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center py-2.5 rounded-md my-0.5 whitespace-nowrap ${
                isActive
                  ? 'bg-cuephoria-dark text-orange-400'
                  : 'text-white hover:bg-cuephoria-dark/50'
              } transition-colors duration-200`}
            >
              <div className="w-[44px] flex items-center justify-center flex-shrink-0 relative">
                <item.icon
                  className={`h-5 w-5 ${isActive ? 'text-orange-400 animate-pulse-soft' : ''}`}
                />
                {item.badge > 0 && (
                  <span
                    className={`absolute -top-1 right-1 h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse-soft transition-opacity duration-300 ${
                      expanded ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                )}
              </div>
              <span
                className={`font-quicksand text-sm transition-opacity duration-300 ${
                  expanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {item.label}
              </span>
              {item.badge > 0 && (
                <span
                  className={`ml-auto mr-2 h-5 min-w-[20px] px-1 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse-soft transition-opacity duration-300 ${
                    expanded ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: cross-fade between collapsed avatar and expanded user card */}
      <div className="flex-shrink-0 p-2">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="h-8 w-8 rounded-full bg-cuephoria-dark flex items-center justify-center border border-orange-500/30">
              <User className="h-4 w-4 text-orange-400" />
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-red-500/80 transition-colors"
              title="Logout"
            >
              <PowerOff className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="group bg-cuephoria-dark rounded-lg p-3 shadow-lg border border-orange-500/20 hover:border-orange-500/60 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <User className="h-5 w-5 text-orange-400 flex-shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium font-quicksand text-white truncate">
                    {user.displayName}
                  </span>
                  <span className="text-xs text-orange-400 font-quicksand">{roleLabel}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-md bg-cuephoria-darker hover:bg-red-500 transition-all duration-300 group-hover:shadow-lg flex-shrink-0"
                title="Logout"
              >
                <PowerOff className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeSidebar;
