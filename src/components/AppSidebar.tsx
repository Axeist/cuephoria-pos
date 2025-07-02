
import React from "react";
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
      title: "Gaming Stations",
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
    <div className="w-64 bg-cuephoria-darker border-r border-cuephoria-lightpurple/20 flex flex-col h-screen">
      <div className="p-4 border-b border-cuephoria-lightpurple/20">
        <Logo />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                location.pathname === item.url
                  ? 'bg-cuephoria-lightpurple/20 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-cuephoria-lightpurple/10'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </button>
          ))}
        </nav>
        
        <div className="px-4 py-2">
          <div className="border-t border-cuephoria-lightpurple/20 pt-4 space-y-2">
            {supportItems.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.url)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  location.pathname === item.url
                    ? 'bg-cuephoria-lightpurple/20 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-cuephoria-lightpurple/10'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-cuephoria-lightpurple/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-cuephoria-lightpurple rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-white text-sm font-medium">admin</div>
            <div className="text-cuephoria-lightpurple text-xs">(Administrator)</div>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full bg-red-600/10 border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
        >
          Logout
        </Button>
      </div>
    </div>
  );
};

export default AppSidebar;
