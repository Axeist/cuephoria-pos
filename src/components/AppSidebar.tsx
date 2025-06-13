
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, BarChart2, Settings, Package, Clock, Users, Menu, Shield } from 'lucide-react';
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
        <div className="fixed top-0 left-0 w-full z-30 bg-[#1A1F2C] p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[80%] max-w-[280px] bg-[#1A1F2C] border-r-0">
                <div className="h-full flex flex-col">
                  <div className="p-4 flex items-center gap-3">
                    <img
                      src="/lovable-uploads/56498ee3-f6fc-4420-b803-bae0e8dc6168.png"
                      alt="Cuephoria Logo"
                      className="h-12 w-12 object-contain animate-bounce filter drop-shadow-[0_0_15px_rgba(155,135,245,0.8)] animate-neon-pulse"
                    />
                    <span className="text-xl font-bold gradient-text font-heading">Cuephoria</span>
                  </div>
                  <div className="mx-4 h-px bg-cuephoria-purple/30" />
                  <div className="flex-1 overflow-auto py-2">
                    <div className="px-2">
                      {menuItems.map((item, index) => (
                        <Link 
                          key={item.path}
                          to={item.path} 
                          className={`flex items-center py-3 px-3 rounded-md my-1 ${location.pathname === item.path ? 'bg-cuephoria-dark text-cuephoria-lightpurple' : 'text-white hover:bg-cuephoria-dark/50'}`}
                        >
                          <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-cuephoria-lightpurple animate-pulse-soft' : ''}`} />
                          <span className="font-quicksand text-base">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t border-cuephoria-purple/20">
                    <div className="relative overflow-hidden bg-gradient-to-br from-cuephoria-dark via-cuephoria-darker to-cuephoria-dark rounded-xl p-4 shadow-xl border border-cuephoria-purple/30">
                      {/* Background glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cuephoria-purple/10 to-transparent animate-pulse" />
                      
                      {/* Content container */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Icon with enhanced styling */}
                          <div className={`p-2 rounded-lg ${isAdmin ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30' : 'bg-gradient-to-br from-cuephoria-blue/20 to-cuephoria-lightpurple/20 border border-cuephoria-blue/30'} shadow-md`}>
                            {isAdmin ? (
                              <Shield className="h-5 w-5 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                            ) : (
                              <User className="h-5 w-5 text-cuephoria-blue filter drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                            )}
                          </div>
                          
                          {/* User info */}
                          <div className="flex flex-col">
                            <span className="font-medium font-quicksand text-white text-sm leading-tight">
                              {user.username}
                            </span>
                            <span className={`text-xs font-heading ${isAdmin ? 'text-amber-300 bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent' : 'text-cuephoria-blue'} font-semibold tracking-wide`}>
                              {isAdmin ? 'ADMIN' : 'STAFF'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Logout button */}
                        <button 
                          onClick={logout}
                          className="px-3 py-1.5 bg-gradient-to-r from-cuephoria-darker to-cuephoria-purple/80 hover:from-cuephoria-purple to-cuephoria-lightpurple rounded-lg transition-all duration-300 font-heading text-white text-xs font-medium shadow-md hover:shadow-lg hover:scale-105 border border-cuephoria-purple/40 hover:border-cuephoria-lightpurple/60"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-xl font-bold gradient-text font-heading">Cuephoria</span>
          </div>
        </div>
        <div className="pt-16"></div> {/* Space for the fixed header */}
      </>
    );
  }

  // Desktop version with Sidebar
  return (
    <Sidebar className="border-r-0 bg-[#1A1F2C] text-white w-[250px]">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <img
          src="/lovable-uploads/56498ee3-f6fc-4420-b803-bae0e8dc6168.png"
          alt="Cuephoria Logo"
          className="h-14 w-14 object-contain animate-bounce filter drop-shadow-[0_0_15px_rgba(155,135,245,0.8)] animate-neon-pulse"
        />
        <span className="text-2xl font-bold gradient-text font-heading">Cuephoria</span>
      </SidebarHeader>
      <SidebarSeparator className="mx-4 bg-cuephoria-purple/30" />
      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={item.path} className={`animate-fade-in delay-${index * 100} text-base`}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                    <Link to={item.path} className="flex items-center menu-item py-2.5">
                      <item.icon className={`mr-3 h-6 w-6 ${location.pathname === item.path ? 'text-cuephoria-lightpurple animate-pulse-soft' : ''}`} />
                      <span className="font-quicksand">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-cuephoria-purple/20">
        <div className="relative overflow-hidden bg-gradient-to-br from-cuephoria-dark via-cuephoria-darker to-cuephoria-dark rounded-xl p-4 shadow-xl border border-cuephoria-purple/30 animate-scale-in">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cuephoria-purple/10 to-transparent animate-pulse" />
          
          {/* Content container */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Icon with enhanced styling */}
              <div className={`p-2.5 rounded-lg ${isAdmin ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30' : 'bg-gradient-to-br from-cuephoria-blue/20 to-cuephoria-lightpurple/20 border border-cuephoria-blue/30'} shadow-md`}>
                {isAdmin ? (
                  <Shield className="h-6 w-6 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                ) : (
                  <User className="h-6 w-6 text-cuephoria-blue filter drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}
              </div>
              
              {/* User info */}
              <div className="flex flex-col">
                <span className="font-medium font-quicksand text-white text-sm leading-tight">
                  {user.username}
                </span>
                <span className={`text-xs font-heading ${isAdmin ? 'text-amber-300 bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent' : 'text-cuephoria-blue'} font-semibold tracking-wide`}>
                  {isAdmin ? 'ADMIN' : 'STAFF'}
                </span>
              </div>
            </div>
            
            {/* Logout button */}
            <button 
              onClick={logout}
              className="px-3 py-1.5 bg-gradient-to-r from-cuephoria-darker to-cuephoria-purple/80 hover:from-cuephoria-purple to-cuephoria-lightpurple rounded-lg transition-all duration-300 font-heading text-white text-xs font-medium shadow-md hover:shadow-lg hover:scale-105 border border-cuephoria-purple/40 hover:border-cuephoria-lightpurple/60"
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
