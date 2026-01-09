// src/App.tsx
import React, { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { POSProvider } from "@/context/POSContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { BookingNotificationProvider } from "@/context/BookingNotificationContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { initializeMobileApp, isNativePlatform, hideSplashScreen } from "@/utils/capacitor";
import SplashScreen from "@/components/SplashScreen";
// REMOVED: import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// Pages
import Login from "./pages/Login";
import LoginLogs from "./pages/LoginLogs";
import Dashboard from "./pages/Dashboard";
import Stations from "./pages/Stations";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import PublicTournaments from "./pages/PublicTournaments";
import PublicStations from "./pages/PublicStations";
import PublicBooking from "./pages/PublicBooking";
import BookingPage from "./pages/BookingPage";
import BookingManagement from "./pages/BookingManagement";
import StaffManagement from "./pages/StaffManagement";
import StaffPortal from "./pages/StaffPortal";
import ChatAI from "./pages/ChatAI";

// Customer pages
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboardEnhanced";
import CustomerBookings from "./pages/CustomerBookings";
import CustomerOffers from "./pages/CustomerOffers";
import CustomerProfile from "./pages/CustomerProfile";

// Payment routes
import PublicPaymentSuccess from "./pages/PublicPaymentSuccess";
import PublicPaymentFailed from "./pages/PublicPaymentFailed";
import PublicTournamentPaymentSuccess from "./pages/PublicTournamentPaymentSuccess";

// Policy pages
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import ShippingAndDelivery from "./pages/ShippingAndDelivery";

// Lazy load HowToUse for code splitting
const HowToUsePage = lazy(() => import("./pages/HowToUse"));

// ✅ OPTIMIZED: Aggressive caching to reduce egress by 60-80%
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh longer
      cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      refetchOnMount: false, // Don't refetch when component remounts
      retry: 1,
    },
  },
});

// REMOVED: AutoRefreshApp wrapper component - replaced with targeted Realtime subscriptions

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireStaffOnly?: boolean;
}

// Enhanced Protected route component that checks for authentication
const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  requireStaffOnly = false 
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cuephoria-dark">
        <div className="animate-spin-slow h-10 w-10 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireStaffOnly && user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-x-hidden">
          <div className="hidden md:flex items-center justify-between px-4 py-2 border-b">
            <SidebarTrigger />
            <GlobalNotificationBell />
          </div>
          <div className={`flex-1 pb-16 sm:pb-0 ${isMobile ? 'pt-[64px]' : ''}`}>
            {children}
          </div>
          <footer className="fixed sm:relative bottom-0 left-0 right-0 w-full py-2 text-center text-xs text-muted-foreground bg-cuephoria-darker border-t border-cuephoria-lightpurple/20 font-semibold tracking-wide z-40 sm:z-50">
            Designed & Developed by RK.
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => {
  // Only show React splash on web, not on native platforms
  const [showSplash, setShowSplash] = useState(!isNativePlatform());

  // Initialize mobile features and handle native splash screen
  useEffect(() => {
    if (isNativePlatform()) {
      // Initialize mobile app features (without hiding splash)
      initializeMobileApp();
      
      // Hide native splash after 3 seconds with smooth fade
      const timer = setTimeout(() => {
        hideSplashScreen();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      {showSplash && (
        <SplashScreen 
          onComplete={() => setShowSplash(false)} 
          duration={3000}
        />
      )}
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <POSProvider>
          <ExpenseProvider>
            <BookingNotificationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* REMOVED: <AutoRefreshApp> wrapper */}
                <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login-logs" element={<LoginLogs />} />

                {/* Public routes */}
                <Route path="/public/tournaments" element={<PublicTournaments />} />
                <Route path="/public/stations" element={<PublicStations />} />
                <Route path="/public/booking" element={<PublicBooking />} />

                {/* Customer routes */}
                <Route path="/customer/login" element={<CustomerLogin />} />
                <Route path="/customer/dashboard" element={<CustomerDashboard />} />
                <Route path="/customer/bookings" element={<CustomerBookings />} />
                <Route path="/customer/offers" element={<CustomerOffers />} />
                <Route path="/customer/profile" element={<CustomerProfile />} />

                {/* Policy pages - Public routes for Razorpay compliance */}
                <Route path="/privacy-policy" element={<Privacy />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms-and-conditions" element={<Terms />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact-us" element={<Contact />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/shipping-delivery" element={<ShippingAndDelivery />} />
                <Route path="/shipping-and-delivery" element={<ShippingAndDelivery />} />

                {/* Payment routes */}
                <Route path="/public/payment/success" element={<PublicPaymentSuccess />} />
                <Route path="/public/payment/failed" element={<PublicPaymentFailed />} />
                <Route path="/public/payment/tournament-success" element={<PublicTournamentPaymentSuccess />} />

                {/* Debug routes */}

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pos"
                  element={
                    <ProtectedRoute>
                      <POS />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stations"
                  element={
                    <ProtectedRoute>
                      <Stations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute>
                      <Products />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <Customers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/booking-management"
                  element={
                    <ProtectedRoute>
                      <BookingManagement />
                    </ProtectedRoute>
                  }
                />

                {/* How to Use page */}
                <Route
                  path="/how-to-use"
                  element={
                    <ProtectedRoute>
                      <Suspense
                        fallback={
                          <div className="min-h-screen flex items-center justify-center">
                            Loading...
                          </div>
                        }
                      >
                        <HowToUsePage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />

                {/* Staff Management - Admin Only */}
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <StaffManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Portal - Staff Only (NOT Admin) */}
                <Route
                  path="/staff-portal"
                  element={
                    <ProtectedRoute requireStaffOnly={true}>
                      <StaffPortal />
                    </ProtectedRoute>
                  }
                />

                {/* Chat AI */}
                <Route
                  path="/chat-ai"
                  element={
                    <ProtectedRoute>
                      <ChatAI />
                    </ProtectedRoute>
                  }
                />

                {/* Settings */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
              {/* REMOVED: </AutoRefreshApp> wrapper */}
            </TooltipProvider>
          </BookingNotificationProvider>
        </ExpenseProvider>
      </POSProvider>
    </AuthProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
