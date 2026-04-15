// src/App.tsx
import React, { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { POSProvider } from "@/context/POSContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { BookingNotificationProvider } from "@/context/BookingNotificationContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { initializeMobileApp, isNativePlatform } from "@/utils/capacitor";
import SplashScreen from "@/components/SplashScreen";
import AppLoadingOverlay from "@/components/loading/AppLoadingOverlay";
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

// Cafe pages
import CafeLogin from "./pages/cafe/CafeLogin";
import CafePOS from "./pages/cafe/CafePOS";
import CafeMenu from "./pages/cafe/CafeMenu";
import CafeOrders from "./pages/cafe/CafeOrders";
import CafeKitchen from "./pages/cafe/CafeKitchen";
import CafeDashboard from "./pages/cafe/CafeDashboard";
import CafeReports from "./pages/cafe/CafeReports";
import CafeCustomerOrder from "./pages/cafe/CafeCustomerOrder";
const CafeStaff = React.lazy(() => import("./pages/cafe/CafeStaff"));
import CafeCustomers from "./pages/cafe/CafeCustomers";
import { CafeAuthProvider, useCafeAuth } from "@/context/CafeAuthContext";
import CafeSidebar from "@/components/cafe/CafeSidebar";

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
    <LocationProvider>
      <POSProvider>
        <ExpenseProvider>
          <BookingNotificationProvider>
            <SidebarProvider>
              <div className="flex min-h-screen w-full overflow-x-hidden relative">
                <AppSidebar />
                <div className="flex-1 flex flex-col overflow-x-hidden">
                  <div className="hidden md:flex items-center justify-between px-4 py-2 border-b gap-3">
                    <SidebarTrigger />
                    <div className="flex items-center gap-3 ml-auto">
                      <LocationSwitcher />
                      <GlobalNotificationBell />
                    </div>
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
          </BookingNotificationProvider>
        </ExpenseProvider>
      </POSProvider>
    </LocationProvider>
  );
};

// Cafe Protected Route — wraps cafe pages with sidebar + auth
const CafeProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useCafeAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <>
        <div className="cafe-ambient min-h-screen" aria-hidden />
        <AppLoadingOverlay
          visible
          variant="cafe"
          title="Restoring your session"
          subtitle="Checking secure credentials and syncing your workspace…"
        />
      </>
    );
  }

  if (!user) {
    return <Navigate to="/cafe/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'cafe_admin' ? '/cafe/dashboard' : '/cafe/pos';
    return <Navigate to={fallback} replace />;
  }

  return (
    <SidebarProvider>
      <div className="cafe-shell cafe-ambient flex min-h-screen w-full overflow-x-hidden">
        <CafeSidebar />
        <div className="flex-1 flex flex-col overflow-x-hidden min-w-0">
          <div className={`flex-1 ${isMobile ? 'pb-4' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

const LOGIN_SPLASH_FLAG = "gh_show_login_splash_v1";

const SplashController = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [variant, setVariant] = useState<"boot" | "login_success">("boot");

  // Always show on full page load/refresh
  useEffect(() => {
    setVariant("boot");
    setShow(true);
  }, []);

  // Optionally show after login success (flag set before navigation)
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(LOGIN_SPLASH_FLAG) !== "1") return;
    sessionStorage.removeItem(LOGIN_SPLASH_FLAG);
    setVariant("login_success");
    setShow(true);
  }, [user]);

  if (!show) return null;
  return <SplashScreen variant={variant} onDone={() => setShow(false)} />;
};

const App = () => {
  // Initialize mobile features on app start
  useEffect(() => {
    if (isNativePlatform()) {
      // Initialize mobile app features
      initializeMobileApp();
    }
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CafeAuthProvider>
        <TooltipProvider>
          <SplashController />
          <Toaster />
          <Sonner />
          {/* REMOVED: <AutoRefreshApp> wrapper */}
          <BrowserRouter>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/login-logs"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <LoginLogs />
                    </ProtectedRoute>
                  }
                />

                {/* Public routes */}
                <Route path="/public/tournaments" element={<PublicTournaments />} />
                <Route path="/public/stations" element={<PublicStations />} />
                <Route path="/public/booking" element={<PublicBooking />} />
                <Route path="/lite/public/booking" element={<PublicBooking branchSlug="lite" />} />
                <Route path="/lite/public/stations" element={<PublicStations branchSlug="lite" />} />
                <Route path="/lite/public/tournaments" element={<PublicTournaments branchSlug="lite" />} />

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

                {/* Cafe routes */}
                <Route path="/cafe/login" element={<CafeLogin />} />
                <Route path="/cafe/order" element={<CafeCustomerOrder />} />
                <Route path="/cafe/dashboard" element={<CafeProtectedRoute allowedRoles={['cafe_admin']}><CafeDashboard /></CafeProtectedRoute>} />
                <Route path="/cafe/workspace" element={<CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}><Navigate to="/cafe/pos" replace /></CafeProtectedRoute>} />
                <Route path="/cafe/pos" element={<CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}><CafePOS /></CafeProtectedRoute>} />
                <Route path="/cafe/kitchen" element={<CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}><CafeKitchen /></CafeProtectedRoute>} />
                <Route path="/cafe/menu" element={<CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}><CafeMenu /></CafeProtectedRoute>} />
                <Route path="/cafe/orders" element={<CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}><CafeOrders /></CafeProtectedRoute>} />
                <Route path="/cafe/reports" element={<CafeProtectedRoute allowedRoles={['cafe_admin']}><CafeReports /></CafeProtectedRoute>} />
                <Route path="/cafe/customers" element={<CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}><CafeCustomers /></CafeProtectedRoute>} />
                <Route path="/cafe/staff" element={<CafeProtectedRoute allowedRoles={['cafe_admin']}><React.Suspense fallback={<div />}><CafeStaff /></React.Suspense></CafeProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          {/* REMOVED: </AutoRefreshApp> wrapper */}
        </TooltipProvider>
        </CafeAuthProvider>
      </AuthProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
