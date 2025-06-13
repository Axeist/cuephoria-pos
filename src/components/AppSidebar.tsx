
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, BarChart2, Settings, Package, Clock, Users, Menu, Shield, PowerOff } from 'lucide-react';
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
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const hideOnPaths = ['/receipt'];
  const shouldHide = hideOnPaths.some(path => location.pathname.includes(path));
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  
  const isAdmin = user?.isAdmin || false;

  if (!user || shouldHide) return null;

  // Base menu items that both admin and staff can see
  const baseMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCart, label: 'POS', path: '/pos' },
    { icon: Clock, label: 'Gaming Stations', path: '/stations' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: Users, label: 'Customers', path: '/customers' },
  ];
  
  // Admin-only menu items
  const adminOnlyMenuItems = [
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];
  
  // Combine menu items based on user role
  const menuItems = isAdmin ? 
    [...baseMenuItems, ...adminOnlyMenuItems] : 
    baseMenuItems;

  // Mobile version with sheet
  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 w-full z-30 bg-gradient-to-r from-[#1A1F2C] to-[#252A3A] p-4 flex justify-between items-center shadow-lg border-b border-cuephoria-purple/20">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-cuephoria-purple/20 transition-all duration-300">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[85%] max-w-[300px] bg-gradient-to-b from-[#1A1F2C] to-[#252A3A] border-r border-cuephoria-purple/30">
                <div className="h-full flex flex-col">
                  <div className="p-6 flex items-center gap-3 border-b border-cuephoria-purple/20 bg-gradient-to-r from-cuephoria-purple/10 to-transparent">
                    <div className="relative">
                      <img
                        src="/lovable-uploads/56498ee3-f6fc-4420-b803-bae0e8dc6168.png"
                        alt="Cuephoria Logo"
                        className="h-12 w-12 object-contain animate-bounce filter drop-shadow-[0_0_15px_rgba(155,135,245,0.8)]"
                      />
                      <div className="absolute inset-0 animate-pulse bg-cuephoria-purple/20 rounded-full blur-lg"></div>
                    </div>
                    <span className="text-xl font-bold gradient-text font-heading tracking-wide">Cuephoria</span>
                  </div>
                  
                  <div className="flex-1 overflow-auto py-4 px-2">
                    <div className="space-y-2">
                      {menuItems.map((item, index) => (
                        <Link 
                          key={item.path}
                          to={item.path} 
                          className={`group flex items-center gap-4 py-3.5 px-4 rounded-xl mx-2 transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                            location.pathname === item.path 
                              ? 'bg-gradient-to-r from-cuephoria-purple/20 to-cuephoria-lightpurple/10 text-cuephoria-lightpurple shadow-lg border border-cuephoria-purple/30' 
                              : 'text-gray-300 hover:bg-gradient-to-r hover:from-cuephoria-purple/10 hover:to-transparent hover:text-white'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className={`p-2 rounded-lg transition-all duration-300 ${
                            location.pathname === item.path 
                              ? 'bg-cuephoria-purple/30 shadow-inner' 
                              : 'group-hover:bg-cuephoria-purple/20'
                          }`}>
                            <item.icon className={`h-5 w-5 transition-all duration-300 ${
                              location.pathname === item.path 
                                ? 'text-cuephoria-lightpurple animate-pulse' 
                                : 'group-hover:text-cuephoria-lightpurple'
                            }`} />
                          </div>
                          <span className="font-quicksand text-base font-medium tracking-wide group-hover:translate-x-1 transition-transform duration-300">
                            {item.label}
                          </span>
                          {location.pathname === item.path && (
                            <div className="ml-auto w-1 h-8 bg-gradient-to-b from-cuephoria-lightpurple to-cuephoria-purple rounded-full shadow-lg"></div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-cuephoria-purple/20 bg-gradient-to-r from-cuephoria-purple/5 to-transparent">
                    <div className="group bg-gradient-to-br from-cuephoria-dark to-[#1A1F2C] rounded-xl p-4 shadow-xl border border-cuephoria-purple/30 hover:border-cuephoria-purple/60 hover:shadow-[0_0_25px_rgba(155,135,245,0.4)] transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isAdmin ? 'bg-cuephoria-purple/20' : 'bg-cuephoria-blue/20'} transition-all duration-300`}>
                            {isAdmin ? (
                              <Shield className="h-5 w-5 text-cuephoria-lightpurple" />
                            ) : (
                              <User className="h-5 w-5 text-cuephoria-blue" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold font-quicksand text-white tracking-wide">
                              {user.username}
                            </span>
                            <span className={`text-xs font-quicksand tracking-wide ${isAdmin ? 'text-cuephoria-lightpurple' : 'text-cuephoria-blue'}`}>
                              {isAdmin ? 'Administrator' : 'Staff'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={logout}
                          className="p-2.5 rounded-lg bg-cuephoria-darker hover:bg-red-500 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
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
            <span className="text-xl font-bold gradient-text font-heading tracking-wide">Cuephoria</span>
          </div>
        </div>
        <div className="pt-20"></div>
      </>
    );
  }

  // Desktop version with Sidebar
  return (
    <Sidebar className="border-r-0 bg-gradient-to-b from-[#1A1F2C] via-[#1E2332] to-[#252A3A] text-white w-[280px] shadow-2xl">
      <SidebarHeader className="p-6 flex items-center gap-3 border-b border-cuephoria-purple/20 bg-gradient-to-r from-cuephoria-purple/10 to-transparent">
        <div className="relative">
          <img
            src="/lovable-uploads/56498ee3-f6fc-4420-b803-bae0e8dc6168.png"
            alt="Cuephoria Logo"
            className="h-14 w-14 object-contain animate-bounce filter drop-shadow-[0_0_20px_rgba(155,135,245,0.8)]"
          />
          <div className="absolute inset-0 animate-pulse bg-cuephoria-purple/30 rounded-full blur-xl"></div>
        </div>
        <span className="text-2xl font-bold gradient-text font-heading tracking-wide">Cuephoria</span>
      </SidebarHeader>
      
      <SidebarSeparator className="mx-6 bg-gradient-to-r from-transparent via-cuephoria-purple/50 to-transparent" />
      
      <SidebarContent className="mt-4 px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.path} 
                  className={`animate-fade-in transform transition-all duration-300 hover:scale-[1.02]`}
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                    <Link 
                      to={item.path} 
                      className={`group flex items-center gap-4 py-3.5 px-4 rounded-xl transition-all duration-300 ease-out relative overflow-hidden ${
                        location.pathname === item.path 
                          ? 'bg-gradient-to-r from-cuephoria-purple/25 to-cuephoria-lightpurple/15 text-cuephoria-lightpurple shadow-lg border border-cuephoria-purple/40' 
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-cuephoria-purple/15 hover:to-transparent hover:text-white'
                      }`}
                    >
                      {location.pathname === item.path && (
                        <div className="absolute inset-0 bg-gradient-to-r from-cuephoria-purple/10 to-transparent animate-pulse"></div>
                      )}
                      
                      <div className={`relative z-10 p-2.5 rounded-lg transition-all duration-300 ${
                        location.pathname === item.path 
                          ? 'bg-cuephoria-purple/30 shadow-inner' 
                          : 'group-hover:bg-cuephoria-purple/20'
                      }`}>
                        <item.icon className={`h-6 w-6 transition-all duration-300 ${
                          location.pathname === item.path 
                            ? 'text-cuephoria-lightpurple animate-pulse' 
                            : 'group-hover:text-cuephoria-lightpurple group-hover:scale-110'
                        }`} />
                      </div>
                      
                      <span className="relative z-10 font-quicksand text-base font-semibold tracking-wide group-hover:translate-x-1 transition-all duration-300">
                        {item.label}
                      </span>
                      
                      {location.pathname === item.path && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-cuephoria-lightpurple to-cuephoria-purple rounded-l-full shadow-lg"></div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-cuephoria-purple/20 bg-gradient-to-r from-cuephoria-purple/5 to-transparent">
        <div className="group bg-gradient-to-br from-cuephoria-dark via-[#1A1F2C] to-cuephoria-darker rounded-xl p-5 shadow-2xl border border-cuephoria-purple/30 hover:border-cuephoria-purple/60 hover:shadow-[0_0_30px_rgba(155,135,245,0.4)] transition-all duration-500 ease-in-out transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl transition-all duration-300 ${
                isAdmin 
                  ? 'bg-gradient-to-br from-cuephoria-purple/30 to-cuephoria-lightpurple/20' 
                  : 'bg-gradient-to-br from-cuephoria-blue/30 to-cuephoria-blue/10'
              }`}>
                {isAdmin ? (
                  <Shield className="h-6 w-6 text-cuephoria-lightpurple drop-shadow-lg" />
                ) : (
                  <User className="h-6 w-6 text-cuephoria-blue drop-shadow-lg" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold font-quicksand text-white tracking-wide">
                  {user.username}
                </span>
                <span className={`text-xs font-quicksand tracking-wide font-medium ${
                  isAdmin ? 'text-cuephoria-lightpurple' : 'text-cuephoria-blue'
                }`}>
                  {isAdmin ? 'Administrator' : 'Staff'}
                </span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-3 rounded-xl bg-gradient-to-br from-cuephoria-darker to-gray-800 hover:from-red-500 hover:to-red-600 transition-all duration-300 transform hover:scale-110 hover:shadow-xl group-hover:shadow-lg border border-gray-700 hover:border-red-400"
              title="Logout"
            >
              <PowerOff className="h-5 w-5 text-white transition-transform duration-300 hover:rotate-180" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
