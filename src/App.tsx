// src/App.tsx
import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { POSProvider } from "@/context/POSContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// Pages
import Login from "./pages/Login";
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

// Payment routes
import PublicPaymentSuccess from "./pages/PublicPaymentSuccess";
import PublicPaymentFailed from "./pages/PublicPaymentFailed";

// Lazy load HowToUse for code splitting
const HowToUsePage = lazy(() => import("./pages/HowToUse"));

// Create a new QueryClient instance outside of the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// App auto-refresh wrapper component
const AutoRefreshApp = ({ children }: { children: React.ReactNode }) => {
  useAutoRefresh(); // Apply auto-refresh to the entire app
  return <>{children}</>;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Enhanced Protected route component that checks for authentication
const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cuephoria-dark">
        <div className="animate-spin-slow h-10 w-10 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page while preserving the intended destination
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If route requires admin access and user is not admin, redirect to dashboard
  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-x-hidden">
          <div className="hidden md:block">
            <SidebarTrigger />
          </div>
          {children}
          {/* Branding footer */}
          <footer className="mt-auto w-full py-2 text-center text-xs text-muted-foreground bg-cuephoria-darker border-t border-cuephoria-lightpurple/20 font-semibold tracking-wide z-50">
            Designed & Developed by RK.
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <POSProvider>
        <ExpenseProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AutoRefreshApp>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />

                  {/* Public routes */}
                  <Route path="/public/tournaments" element={<PublicTournaments />} />
                  <Route path="/public/stations" element={<PublicStations />} />
                  <Route path="/public/booking" element={<PublicBooking />} />

                  {/* Payment routes */}
                  <Route path="/public/payment/success" element={<PublicPaymentSuccess />} />
                  <Route path="/public/payment/failed" element={<PublicPaymentFailed />} />

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

                  {/* Staff Portal - All Users */}
                  <Route
                    path="/staff-portal"
                    element={
                      <ProtectedRoute>
                        <StaffPortal />
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
            </AutoRefreshApp>
          </TooltipProvider>
        </ExpenseProvider>
      </POSProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
