
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
    { icon: BarChart2, label: 'Reports', path: '/reports' }, // Now accessible to staff
    { icon: Settings, label: 'Settings', path: '/settings' }, // Now accessible to staff
  ];
  
  // All users now have access to all menu items
  const menuItems = baseMenuItems;

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
                  <div className="p-4">
                    <div className="group bg-cuephoria-dark rounded-lg p-4 shadow-lg border border-cuephoria-purple/20 hover:border-cuephoria-purple/60 hover:shadow-[0_0_20px_rgba(155,135,245,0.3)] transition-all duration-300 ease-in-out">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isAdmin ? (
                            <Shield className="h-6 w-6 text-cuephoria-lightpurple" />
                          ) : (
                            <User className="h-6 w-6 text-cuephoria-blue" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium font-quicksand text-white">
                              {user.username}
                            </span>
                            <span className="text-xs text-cuephoria-lightpurple font-quicksand">
                              {isAdmin ? '(Administrator)' : '(Staff)'}
                            </span>
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
      <SidebarFooter className="p-4">
        <div className="group bg-cuephoria-dark rounded-lg p-4 shadow-lg border border-cuephoria-purple/20 hover:border-cuephoria-purple/60 hover:shadow-[0_0_20px_rgba(155,135,245,0.3)] transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isAdmin ? (
                <Shield className="h-6 w-6 text-cuephoria-lightpurple" />
              ) : (
                <User className="h-6 w-6 text-cuephoria-blue" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium font-quicksand text-white">
                  {user.username}
                </span>
                <span className="text-xs text-cuephoria-lightpurple font-quicksand">
                  {isAdmin ? '(Administrator)' : '(Staff)'}
                </span>
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

export default AppSidebar;
