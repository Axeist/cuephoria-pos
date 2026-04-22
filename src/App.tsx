// src/App.tsx
import React, { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { POSHydrationObserver } from "@/context/POSHydrationContext";
import { OrganizationProvider, useOrganization } from "@/context/OrganizationContext";
import { BrandingProvider } from "@/branding/BrandingProvider";
import { PlatformAuthProvider } from "@/context/PlatformAuthContext";
import { PlatformProtectedRoute } from "@/components/platform/PlatformProtectedRoute";
import PlatformLogin from "@/pages/platform/PlatformLogin";
const PlatformDashboard = lazy(() => import("@/pages/platform/PlatformDashboard"));
const PlatformAudit = lazy(() => import("@/pages/platform/PlatformAudit"));
const PlatformOrgDetail = lazy(() => import("@/pages/platform/PlatformOrgDetail"));
const PlatformPlans = lazy(() => import("@/pages/platform/PlatformPlans"));
import { flags } from "@/config/featureFlags";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { POSProvider } from "@/context/POSContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { BookingNotificationProvider } from "@/context/BookingNotificationContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { initializeMobileApp, isNativePlatform } from "@/utils/capacitor";
import SplashScreen from "@/components/SplashScreen";
import AppLoadingOverlay from "@/components/loading/AppLoadingOverlay";
// REMOVED: import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// Auth & first paint (keep eager — small or entry routes)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SignupGoogle from "./pages/SignupGoogle";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import CustomerLogin from "./pages/CustomerLogin";
import CafeLogin from "./pages/cafe/CafeLogin";

const LoginLogs = lazy(() => import("./pages/LoginLogs"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Stations = lazy(() => import("./pages/Stations"));
const Products = lazy(() => import("./pages/Products"));
const POS = lazy(() => import("./pages/POS"));
const Customers = lazy(() => import("./pages/Customers"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const Billing = lazy(() => import("./pages/Billing"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const TenantWorkspace = lazy(() => import("./pages/TenantWorkspace"));
const BrandedLogin = lazy(() => import("./pages/BrandedLogin"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const PublicTournaments = lazy(() => import("./pages/PublicTournaments"));
const PublicStations = lazy(() => import("./pages/PublicStations"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const BookingManagement = lazy(() => import("./pages/BookingManagement"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const StaffPortal = lazy(() => import("./pages/StaffPortal"));
const ChatAI = lazy(() => import("./pages/ChatAI"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboardEnhanced"));
const CustomerBookings = lazy(() => import("./pages/CustomerBookings"));
const CustomerOffers = lazy(() => import("./pages/CustomerOffers"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const PublicPaymentSuccess = lazy(() => import("./pages/PublicPaymentSuccess"));
const PublicPaymentFailed = lazy(() => import("./pages/PublicPaymentFailed"));
const PublicTournamentPaymentSuccess = lazy(() => import("./pages/PublicTournamentPaymentSuccess"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const ShippingAndDelivery = lazy(() => import("./pages/ShippingAndDelivery"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const AcceptableUse = lazy(() => import("./pages/AcceptableUse"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const CompareHub = lazy(() => import("./pages/CompareHub"));
const VsCompetitor = lazy(() => import("./pages/VsCompetitor"));
const CafePOS = lazy(() => import("./pages/cafe/CafePOS"));
const CafeMenu = lazy(() => import("./pages/cafe/CafeMenu"));
const CafeOrders = lazy(() => import("./pages/cafe/CafeOrders"));
const CafeKitchen = lazy(() => import("./pages/cafe/CafeKitchen"));
const CafeDashboard = lazy(() => import("./pages/cafe/CafeDashboard"));
const CafeReports = lazy(() => import("./pages/cafe/CafeReports"));
const CafeCustomerOrder = lazy(() => import("./pages/cafe/CafeCustomerOrder"));
const CafeCustomers = lazy(() => import("./pages/cafe/CafeCustomers"));
const CafeStaff = lazy(() => import("./pages/cafe/CafeStaff"));
import { CafeAuthProvider, useCafeAuth } from "@/context/CafeAuthContext";
import CafeSidebar from "@/components/cafe/CafeSidebar";

const HowToUsePage = lazy(() => import("./pages/HowToUse"));

/** Lightweight chunk loader — keeps the main bundle smaller for faster first interaction. */
const RouteChunkFallback = () => (
  <div
    className="flex min-h-[40vh] w-full flex-1 items-center justify-center py-12"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-cuephoria-lightpurple border-t-transparent" />
    <span className="sr-only">Loading page</span>
  </div>
);

const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<RouteChunkFallback />}>{children}</Suspense>
);

// ✅ OPTIMIZED: Aggressive caching to reduce egress by 60-80%
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache
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

  // Force a password rotation before anything else is reachable.
  if (user.mustChangePassword && location.pathname !== "/account/change-password") {
    return <Navigate to="/account/change-password" replace />;
  }

  return (
    <OrganizationProvider>
      <OnboardingGate>
        <BrandingProvider>
          <LocationProvider>
            <POSHydrationObserver>
            <POSProvider>
            <ExpenseProvider>
              <BookingNotificationProvider>
                <SidebarProvider
                  defaultOpen={false}
                  style={
                    {
                      "--sidebar-width-icon": "3.75rem",
                    } as React.CSSProperties
                  }
                >
                  <div className="app-ambient flex min-h-screen w-full overflow-x-hidden relative">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col overflow-x-hidden min-w-0">
                      <div
                        className="hidden md:flex items-center justify-end px-5 py-2.5 gap-3 sticky top-0 z-20"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(10,6,22,0.78) 0%, rgba(10,6,22,0.3) 100%)',
                          backdropFilter: 'blur(14px) saturate(140%)',
                          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <LocationSwitcher />
                          <GlobalNotificationBell />
                        </div>
                      </div>
                      <main
                        id="app-main"
                        tabIndex={-1}
                        className={`flex-1 pb-16 sm:pb-0 outline-none ${isMobile ? 'pt-[64px]' : ''}`}
                      >
                        {children}
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </BookingNotificationProvider>
            </ExpenseProvider>
            </POSProvider>
            </POSHydrationObserver>
          </LocationProvider>
        </BrandingProvider>
      </OnboardingGate>
    </OrganizationProvider>
  );
};

/**
 * Redirects first-time owners to /onboarding until they finish the wizard.
 * Runs inside OrganizationProvider so we can read live tenant state. Internal
 * organizations (Cuephoria) are always allowed through unconditionally.
 */
const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { organization, status } = useOrganization();
  const location = useLocation();

  if (status === "loading") return <>{children}</>;
  if (!organization) return <>{children}</>;
  if (organization.isInternal) return <>{children}</>;
  if (organization.onboardingCompletedAt) return <>{children}</>;

  // Owners + admins get redirected to the wizard; lower roles just see the
  // app (they shouldn't block the business from operating while the owner
  // finishes first-run setup).
  const privileged = organization.role === "owner" || organization.role === "admin";
  if (!privileged) return <>{children}</>;
  if (location.pathname.startsWith("/onboarding")) return <>{children}</>;
  if (location.pathname.startsWith("/account/")) return <>{children}</>;
  return <Navigate to="/onboarding" replace />;
};

/**
 * Minimal protected wrapper for the onboarding wizard and signup-adjacent
 * screens — only provides auth + org context, no sidebar / POS / Location
 * providers, so the wizard UI isn't wrapped in the app shell.
 */
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="animate-spin-slow h-10 w-10 rounded-full border-4 border-fuchsia-500 border-t-transparent"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <OrganizationProvider>{children}</OrganizationProvider>;
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
          <main className={`flex-1 outline-none ${isMobile ? 'pb-4' : ''}`} id="cafe-main">
            {children}
          </main>
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
                <Route path="/signup" element={<Signup />} />
                <Route path="/signup/google" element={<SignupGoogle />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/account/verify-email" element={<VerifyEmail />} />

                {/* SEO comparison pages (public marketing) */}
                <Route
                  path="/compare"
                  element={
                    <LazyPage>
                      <CompareHub />
                    </LazyPage>
                  }
                />
                <Route
                  path="/vs/:slug"
                  element={
                    <LazyPage>
                      <VsCompetitor />
                    </LazyPage>
                  }
                />

                {/* First-run onboarding wizard (post-signup).
                    Runs in a minimal shell — no sidebar, no POS provider. */}
                <Route
                  path="/onboarding"
                  element={
                    <OnboardingRoute>
                      <LazyPage>
                        <Onboarding />
                      </LazyPage>
                    </OnboardingRoute>
                  }
                />

                {/* Cuetronix platform-admin console (separate auth) */}
                {flags.platformAdminEnabled && (
                  <Route
                    path="/platform/*"
                    element={
                      <PlatformAuthProvider>
                        <Routes>
                          <Route path="login" element={<PlatformLogin />} />
                          <Route
                            path=""
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformDashboard />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route
                            path="organizations"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformDashboard />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route
                            path="organizations/:id"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformOrgDetail />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route
                            path="plans"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformPlans />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route
                            path="audit"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformAudit />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route path="*" element={<Navigate to="/platform" replace />} />
                        </Routes>
                      </PlatformAuthProvider>
                    }
                  />
                )}
                <Route
                  path="/login-logs"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <LazyPage>
                        <LoginLogs />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* Public routes */}
                <Route
                  path="/public/tournaments"
                  element={
                    <LazyPage>
                      <PublicTournaments />
                    </LazyPage>
                  }
                />
                <Route
                  path="/public/stations"
                  element={
                    <LazyPage>
                      <PublicStations />
                    </LazyPage>
                  }
                />
                <Route
                  path="/public/booking"
                  element={
                    <LazyPage>
                      <PublicBooking />
                    </LazyPage>
                  }
                />
                <Route
                  path="/lite/public/booking"
                  element={
                    <LazyPage>
                      <PublicBooking branchSlug="lite" />
                    </LazyPage>
                  }
                />
                <Route
                  path="/lite/public/stations"
                  element={
                    <LazyPage>
                      <PublicStations branchSlug="lite" />
                    </LazyPage>
                  }
                />
                <Route
                  path="/lite/public/tournaments"
                  element={
                    <LazyPage>
                      <PublicTournaments branchSlug="lite" />
                    </LazyPage>
                  }
                />

                {/* Customer routes */}
                <Route path="/customer/login" element={<CustomerLogin />} />
                <Route
                  path="/customer/dashboard"
                  element={
                    <LazyPage>
                      <CustomerDashboard />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer/bookings"
                  element={
                    <LazyPage>
                      <CustomerBookings />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer/offers"
                  element={
                    <LazyPage>
                      <CustomerOffers />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer/profile"
                  element={
                    <LazyPage>
                      <CustomerProfile />
                    </LazyPage>
                  }
                />

                {/* Policy pages - Public routes for Razorpay compliance */}
                <Route
                  path="/privacy-policy"
                  element={
                    <LazyPage>
                      <Privacy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/privacy"
                  element={
                    <LazyPage>
                      <Privacy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/terms-and-conditions"
                  element={
                    <LazyPage>
                      <Terms />
                    </LazyPage>
                  }
                />
                <Route
                  path="/terms"
                  element={
                    <LazyPage>
                      <Terms />
                    </LazyPage>
                  }
                />
                <Route
                  path="/contact-us"
                  element={
                    <LazyPage>
                      <Contact />
                    </LazyPage>
                  }
                />
                <Route
                  path="/contact"
                  element={
                    <LazyPage>
                      <Contact />
                    </LazyPage>
                  }
                />
                <Route
                  path="/shipping-delivery"
                  element={
                    <LazyPage>
                      <ShippingAndDelivery />
                    </LazyPage>
                  }
                />
                <Route
                  path="/shipping-and-delivery"
                  element={
                    <LazyPage>
                      <ShippingAndDelivery />
                    </LazyPage>
                  }
                />
                <Route
                  path="/service-delivery"
                  element={
                    <LazyPage>
                      <ShippingAndDelivery />
                    </LazyPage>
                  }
                />
                <Route
                  path="/refund-policy"
                  element={
                    <LazyPage>
                      <RefundPolicy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/refunds"
                  element={
                    <LazyPage>
                      <RefundPolicy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/cancellation-policy"
                  element={
                    <LazyPage>
                      <RefundPolicy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/acceptable-use"
                  element={
                    <LazyPage>
                      <AcceptableUse />
                    </LazyPage>
                  }
                />
                <Route
                  path="/acceptable-use-policy"
                  element={
                    <LazyPage>
                      <AcceptableUse />
                    </LazyPage>
                  }
                />
                <Route
                  path="/cookies"
                  element={
                    <LazyPage>
                      <CookiePolicy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/cookie-policy"
                  element={
                    <LazyPage>
                      <CookiePolicy />
                    </LazyPage>
                  }
                />

                {/* Payment routes */}
                <Route
                  path="/public/payment/success"
                  element={
                    <LazyPage>
                      <PublicPaymentSuccess />
                    </LazyPage>
                  }
                />
                <Route
                  path="/public/payment/failed"
                  element={
                    <LazyPage>
                      <PublicPaymentFailed />
                    </LazyPage>
                  }
                />
                <Route
                  path="/public/payment/tournament-success"
                  element={
                    <LazyPage>
                      <PublicTournamentPaymentSuccess />
                    </LazyPage>
                  }
                />

                {/* Debug routes */}

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Dashboard />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pos"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <POS />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stations"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Stations />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Products />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Customers />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Reports />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/booking-management"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <BookingManagement />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* How to Use page */}
                <Route
                  path="/how-to-use"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <HowToUsePage />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* Staff Management - Admin Only */}
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <LazyPage>
                        <StaffManagement />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* Staff Portal - Staff Only (NOT Admin) */}
                <Route
                  path="/staff-portal"
                  element={
                    <ProtectedRoute requireStaffOnly={true}>
                      <LazyPage>
                        <StaffPortal />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* Chat AI */}
                <Route
                  path="/chat-ai"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <ChatAI />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* Settings */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Settings />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/organization"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <OrganizationSettings />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/billing"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <Billing />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/security"
                  element={
                    <ProtectedRoute>
                      <LazyPage>
                        <AccountSecurity />
                      </LazyPage>
                    </ProtectedRoute>
                  }
                />

                {/* Tenant workspace landing (deep-link, multi-tenant ready) */}
                <Route
                  path="/app/t/:slug"
                  element={
                    <LazyPage>
                      <TenantWorkspace />
                    </LazyPage>
                  }
                />
                {/* Brand-aware sign-in for a specific workspace. Falls back to
                    /login internally if the slug can't be resolved. */}
                <Route
                  path="/app/t/:slug/login"
                  element={
                    <LazyPage>
                      <BrandedLogin />
                    </LazyPage>
                  }
                />

                {/* Self-service password rotation (first-login + voluntary).
                    Deliberately outside ProtectedRoute so the sidebar / context
                    providers don't render — the forced-rotation UX stays minimal. */}
                <Route
                  path="/account/change-password"
                  element={
                    <LazyPage>
                      <ChangePassword />
                    </LazyPage>
                  }
                />

                {/* Cafe routes */}
                <Route path="/cafe/login" element={<CafeLogin />} />
                <Route
                  path="/cafe/order"
                  element={
                    <LazyPage>
                      <CafeCustomerOrder />
                    </LazyPage>
                  }
                />
                <Route
                  path="/cafe/dashboard"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin']}>
                      <LazyPage>
                        <CafeDashboard />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/workspace"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}>
                      <Navigate to="/cafe/pos" replace />
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/pos"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}>
                      <LazyPage>
                        <CafePOS />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/kitchen"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}>
                      <LazyPage>
                        <CafeKitchen />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/menu"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}>
                      <LazyPage>
                        <CafeMenu />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/orders"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}>
                      <LazyPage>
                        <CafeOrders />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/reports"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin']}>
                      <LazyPage>
                        <CafeReports />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/customers"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin', 'cashier', 'kitchen', 'staff']}>
                      <LazyPage>
                        <CafeCustomers />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />
                <Route
                  path="/cafe/staff"
                  element={
                    <CafeProtectedRoute allowedRoles={['cafe_admin']}>
                      <LazyPage>
                        <CafeStaff />
                      </LazyPage>
                    </CafeProtectedRoute>
                  }
                />

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
