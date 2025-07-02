
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Monitor, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings, 
  HelpCircle,
  TrendingUp,
  Shield,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "POS",
      url: "/pos", 
      icon: ShoppingCart,
    },
    {
      title: "Stations",
      url: "/stations",
      icon: Monitor,
    },
    {
      title: "Products",
      url: "/products",
      icon: Package,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Investments",
      url: "/investments",
      icon: TrendingUp,
    },
  ];

  const supportItems = [
    {
      title: "How to Use",
      url: "/how-to-use",
      icon: HelpCircle,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar className="bg-cuephoria-darker border-r border-cuephoria-lightpurple/20">
      <SidebarContent>
        <div className="p-6 flex flex-col items-center space-y-4">
          <div className="animate-pulse">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cuephoria-lightpurple/20 to-cuephoria-lightpurple/40 shadow-lg shadow-cuephoria-lightpurple/30">
              <Logo />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-cuephoria-lightpurple">Cuephoria</h1>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-cuephoria-lightpurple">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                    className="text-gray-300 hover:text-white hover:bg-cuephoria-lightpurple/20 data-[state=open]:bg-cuephoria-lightpurple/20"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-cuephoria-lightpurple">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                    className="text-gray-300 hover:text-white hover:bg-cuephoria-lightpurple/20 data-[state=open]:bg-cuephoria-lightpurple/20"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cuephoria-lightpurple/20 border border-cuephoria-lightpurple rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-cuephoria-lightpurple" />
            </div>
            <div>
              <div className="text-white font-medium text-sm">admin</div>
              <div className="text-gray-400 text-xs">(Administrator)</div>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
