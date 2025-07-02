
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
  TrendingUp
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
        <div className="p-4 flex items-center space-x-3">
          <Logo />
          <h1 className="text-2xl font-bold text-white">Cuephoria</h1>
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-cuephoria-lightpurple rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <div className="text-white font-medium">admin</div>
              <div className="text-gray-400 text-sm">(Administrator)</div>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
