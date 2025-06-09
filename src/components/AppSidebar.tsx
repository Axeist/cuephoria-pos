
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, BarChart2, Settings, Package, Clock, Users, Joystick, Menu, Shield, Zap } from 'lucide-react';
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
  useSidebar
} from '@/components/ui/sidebar';
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
        <div className="fixed top-0 left-0 w-full z-30 bg-gradient-to-r from-cyber-dark via-cyber-darker to-cyber-dark p-4 flex justify-between items-center shadow-lg neon-border animate-slide-in-top">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-cyber-purple/20 gaming-button">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[80%] max-w-[280px] gaming-sidebar border-r-0">
                <div className="h-full flex flex-col circuit-pattern">
                  <div className="p-4 flex items-center gap-3 border-b border-cyber-purple/30">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-br from-cyber-purple to-neon-blue shadow-lg animate-cyber-pulse relative">
                      <Joystick className="h-7 w-7 text-white absolute animate-float" />
                      <Zap className="h-4 w-4 text-neon-orange absolute top-1 right-1 animate-pulse" />
                    </div>
                    <span className="text-2xl font-bold holographic-text font-orbitron">Cuephoria</span>
                  </div>
                  
                  <div className="flex-1 overflow-auto py-4">
                    <div className="px-3 space-y-1">
                      {menuItems.map((item, index) => (
                        <Link 
                          key={item.path}
                          to={item.path} 
                          className={`gaming-nav-item flex items-center py-3 px-4 rounded-lg my-1 transition-all duration-300 ${
                            location.pathname === item.path 
                              ? 'active bg-gradient-to-r from-cyber-purple/30 to-transparent text-white border-l-2 border-cyber-purple' 
                              : 'text-gray-300 hover:text-white hover:bg-cyber-purple/10'
                          } animate-slide-in-left`}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <item.icon className={`mr-3 h-5 w-5 ${
                            location.pathname === item.path 
                              ? 'text-neon-blue animate-neon-glow' 
                              : 'text-gray-400'
                          }`} />
                          <span className="font-rajdhani text-base font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-cyber-purple/30">
                    <div className="cyber-card rounded-lg p-3 animate-fade-in-scale">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {isAdmin ? (
                            <Shield className="h-5 w-5 text-neon-orange animate-pulse" />
                          ) : (
                            <User className="h-5 w-5 text-neon-blue animate-pulse" />
                          )}
                          <span className="ml-2 text-sm font-medium font-rajdhani text-white">
                            {user.username}
                          </span>
                          <span className="ml-1 text-xs text-cyber-purple font-orbitron">
                            {isAdmin ? '(Admin)' : '(Staff)'}
                          </span>
                        </div>
                        <button 
                          onClick={logout}
                          className="text-xs gaming-button px-3 py-1 rounded-md font-orbitron text-white"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-xl font-bold holographic-text font-orbitron">Cuephoria</span>
          </div>
        </div>
        <div className="pt-20"></div>
      </>
    );
  }

  // Desktop version with Sidebar
  return (
    <Sidebar className="border-r-0 gaming-sidebar w-[280px] animate-slide-in-left">
      <SidebarHeader className="p-6 flex items-center gap-3 border-b border-cyber-purple/30">
        <div className="h-14 w-14 rounded-full flex items-center justify-center bg-gradient-to-br from-cyber-purple to-neon-blue shadow-xl animate-cyber-pulse relative">
          <Joystick className="h-8 w-8 text-white absolute animate-float" />
          <Zap className="h-5 w-5 text-neon-orange absolute top-1 right-1 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold holographic-text font-orbitron">Cuephoria</span>
          <span className="text-xs text-neon-blue font-rajdhani">Gaming Cafe System</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="mt-4 circuit-pattern">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-3">
              {menuItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.path} 
                  className={`animate-slide-in-left delay-${index * 100} text-base`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.path}
                    className="gaming-nav-item py-3 px-4 rounded-lg"
                  >
                    <Link 
                      to={item.path} 
                      className={`flex items-center transition-all duration-300 ${
                        location.pathname === item.path 
                          ? 'active bg-gradient-to-r from-cyber-purple/30 to-transparent text-white border-l-2 border-cyber-purple' 
                          : 'text-gray-300 hover:text-white hover:bg-cyber-purple/10'
                      }`}
                    >
                      <item.icon className={`mr-3 h-6 w-6 ${
                        location.pathname === item.path 
                          ? 'text-neon-blue animate-neon-glow' 
                          : 'text-gray-400'
                      }`} />
                      <span className="font-rajdhani font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-6 border-t border-cyber-purple/30">
        <div className="cyber-card rounded-lg p-4 animate-fade-in-scale">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isAdmin ? (
                <Shield className="h-6 w-6 text-neon-orange animate-pulse" />
              ) : (
                <User className="h-6 w-6 text-neon-blue animate-pulse" />
              )}
              <div className="ml-3">
                <span className="text-sm font-medium font-rajdhani text-white block">
                  {user.username}
                </span>
                <span className="text-xs text-cyber-purple font-orbitron">
                  {isAdmin ? 'Admin Access' : 'Staff Member'}
                </span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-xs gaming-button px-3 py-2 rounded-md font-orbitron text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
