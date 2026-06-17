// src/App.tsx
import React, { Suspense, useEffect, useState } from "react";
import { lazyWithRetry as lazy } from "@/utils/lazyWithRetry";
import { AppBootRecovery } from "@/components/AppBootRecovery";
import { markAppBootSuccessful } from "@/utils/chunkRecovery";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PermissionsProvider, usePermissions } from "@/context/PermissionsContext";
import { SIDEBAR_PERMISSIONS } from "@/constants/permissionCatalog";
import { LocationProvider } from "@/context/LocationContext";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import { POSHydrationObserver } from "@/context/POSHydrationContext";
import { OrganizationProvider, useOrganization } from "@/context/OrganizationContext";
import { BrandingProvider } from "@/branding/BrandingProvider";
import { PlatformAuthProvider } from "@/context/PlatformAuthContext";
import { PlatformProtectedRoute } from "@/components/platform/PlatformProtectedRoute";
import PlatformLogin from "@/pages/platform/PlatformLogin";
const PlatformDashboard = lazy(() => import("@/pages/platform/PlatformDashboard"));
const PlatformAudit = lazy(() => import("@/pages/platform/PlatformAudit"));
const PlatformAdmins = lazy(() => import("@/pages/platform/PlatformAdmins"));
const PlatformOrgDetail = lazy(() => import("@/pages/platform/PlatformOrgDetail"));
const PlatformPlans = lazy(() => import("@/pages/platform/PlatformPlans"));
const PlatformBroadcasts = lazy(() => import("@/pages/platform/PlatformBroadcasts"));
const PlatformSandbox = lazy(() => import("@/pages/platform/PlatformSandbox"));
import { flags } from "@/config/featureFlags";
import { AppHeader } from "@/components/AppHeader";
import { POSProvider } from "@/context/POSContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { BookingNotificationProvider } from "@/context/BookingNotificationContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import SidebarTourOverlay from "@/components/onboarding/SidebarTourOverlay";
import SubscriptionGate from "@/components/SubscriptionGate";
import { PlanFeatureGate } from "@/components/PlanFeatureGate";
import { isInternalOrganization } from "@/types/tenancy";
import { useViewMode, ViewModeProvider } from "@/context/ViewModeContext";
import { cn } from "@/lib/utils";
import { initializeMobileApp, isNativePlatform } from "@/utils/capacitor";
import SplashScreen from "@/components/SplashScreen";
import AppLoadingOverlay from "@/components/loading/AppLoadingOverlay";
import PostLoginViewModeDialog from "@/components/PostLoginViewModeDialog";
import PageTransition from "@/components/layout/PageTransition";
import { MobileNavProvider } from "@/components/mobile/MobileNavContext";
import { AppScreenHeader } from "@/components/mobile/AppScreenHeader";
import { AppBottomNav } from "@/components/mobile/AppBottomNav";
import { MobileNavSheet } from "@/components/mobile/MobileNavSheet";
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
import CompareHub from "./pages/CompareHub";
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
const TournamentsPage = lazy(() => import("./pages/Tournaments"));
const PublicTournamentTV = lazy(() => import("./pages/PublicTournamentTV"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const ShippingAndDelivery = lazy(() => import("./pages/ShippingAndDelivery"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const AcceptableUse = lazy(() => import("./pages/AcceptableUse"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
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
import { useViewMode } from "@/context/ViewModeContext";
import { CafeMobileNavProvider } from "@/components/cafe/mobile/CafeMobileNavContext";
import { CafeScreenHeader } from "@/components/cafe/mobile/CafeScreenHeader";
import { CafeBottomNav } from "@/components/cafe/mobile/CafeBottomNav";
import { CafeMobileNavSheet } from "@/components/cafe/mobile/CafeMobileNavSheet";
import CafeSidebar from "@/components/cafe/CafeSidebar";

const HowToUsePage = lazy(() => import("./pages/HowToUse"));

/** Lightweight chunk loader — skeleton instead of a blocking spinner. */
const RouteChunkFallback = () => (
  <div
    className="flex-1 animate-pulse space-y-4 p-4 sm:p-6 md:p-8"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="h-8 w-40 rounded-lg bg-white/5" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="h-36 rounded-xl bg-white/5" />
      <div className="h-36 rounded-xl bg-white/5" />
      <div className="h-36 rounded-xl bg-white/5 hidden sm:block" />
    </div>
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
  requireAdmin?: boolean;
  requireStaffOnly?: boolean;
  /** Minimum workspace permission key (e.g. `hr.view`). Super-admin bypass applies. */
  permission?: string;
  /**
   * Render children with all data providers (Auth/POS/Location/etc.) but
   * WITHOUT the sidebar + top header chrome. Used by the AI pop-out window
   * (opened via `?focus=1`) so the chat fills the whole viewport.
   */
  bare?: boolean;
}

function rbacEnforceMode(): "off" | "log" | "enforce" {
  const v = import.meta.env.VITE_RBAC_ENFORCE_ROUTES;
  if (v === "0" || v === "false") return "off";
  if (v === "1" || v === "true") return "enforce";
  return "log";
}

/** Runs inside PermissionsProvider — route + module permission gates. */
const ProtectedAppShell: React.FC<{ permission?: string; bare?: boolean }> = ({
  permission,
  bare = false,
}) => {
  const { user } = useAuth();
  const { can, isLoading, bypass } = usePermissions();
  const location = useLocation();
  const { isMobile } = useViewMode();

  const firstSegment = location.pathname.split("/").filter(Boolean)[0];
  const modulePath = firstSegment ? `/${firstSegment}` : "";
  const modulePerm = modulePath ? SIDEBAR_PERMISSIONS[modulePath] : undefined;
  const requiredPerm = permission ?? modulePerm;

  if (requiredPerm && !bypass) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cuephoria-dark">
          <div className="animate-spin-slow h-10 w-10 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent" />
        </div>
      );
    }
    if (!can(requiredPerm)) {
      const mode = rbacEnforceMode();
      if (mode === "enforce") {
        return <Navigate to="/dashboard" replace />;
      }
      if (mode === "log") {
        console.warn("[RBAC] denied path (log-only):", location.pathname, requiredPerm);
      }
    }
  }

  if (user?.mustChangePassword && location.pathname !== "/account/change-password") {
    return <Navigate to="/account/change-password" replace />;
  }

  return (
    <OnboardingGate>
      <SubscriptionGate>
        <BrandingProvider>
          <LocationProvider>
            <AppSettingsProvider>
              <POSHydrationObserver>
                <POSProvider>
                  <ExpenseProvider>
                    <BookingNotificationProvider>
                      {bare ? (
                        <div className="app-ambient min-h-screen w-full overflow-x-clip">
                          <PageTransition />
                        </div>
                      ) : (
                        <SidebarProvider
                          defaultOpen={false}
                          className={cn(
                            isMobile && "min-w-0 w-full max-w-full",
                          )}
                          style={
                            {
                              "--sidebar-width-icon": "3.75rem",
                            } as React.CSSProperties
                          }
                        >
                          <MobileNavProvider>
                            {isMobile ? (
                              <div className="app-mobile-shell app-ambient flex h-svh w-full min-w-0 max-w-full flex-col overflow-hidden">
                                <main
                                  id="app-main"
                                  tabIndex={-1}
                                  className="app-screen-mobile flex min-h-0 w-full max-w-full flex-col outline-none"
                                >
                                  <AppScreenHeader />
                                  <PageTransition />
                                </main>
                                <AppBottomNav />
                                <MobileNavSheet />
                                <PostLoginViewModeDialog />
                              </div>
                            ) : (
                              <div className="app-ambient flex min-h-screen w-full overflow-x-clip relative">
                                <AppSidebar />
                                <SidebarTourOverlay />
                                <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
                                  <AppHeader />
                                  <main
                                    id="app-main"
                                    tabIndex={-1}
                                    className="min-w-0 w-full flex-1 outline-none"
                                  >
                                    <PageTransition />
                                  </main>
                                </div>
                                <PostLoginViewModeDialog />
                              </div>
                            )}
                          </MobileNavProvider>
                        </SidebarProvider>
                      )}
                    </BookingNotificationProvider>
                  </ExpenseProvider>
                </POSProvider>
              </POSHydrationObserver>
            </AppSettingsProvider>
          </LocationProvider>
        </BrandingProvider>
      </SubscriptionGate>
    </OnboardingGate>
  );
};

// Enhanced Protected route component that checks for authentication
const ProtectedRoute = ({
  requireAdmin = false,
  requireStaffOnly = false,
  permission,
  bare = false,
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const bareFromQuery = new URLSearchParams(location.search).get("focus") === "1";
  const isBare = bare || bareFromQuery;

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
    <OrganizationProvider>
      <PermissionsProvider>
        <ProtectedAppShell permission={permission} bare={isBare} />
      </PermissionsProvider>
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
  if (isInternalOrganization(organization.slug, organization.isInternal)) return <>{children}</>;
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
  if (user.mustChangePassword && location.pathname !== "/account/change-password") {
    return <Navigate to="/account/change-password" replace />;
  }
  return <OrganizationProvider>{children}</OrganizationProvider>;
};

// Cafe Protected Route — wraps cafe pages with sidebar + auth
const CafeProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useCafeAuth();
  const location = useLocation();
  const { isMobile } = useViewMode();

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
    <SidebarProvider
      className={cn(isMobile && "min-w-0 w-full max-w-full")}
    >
      <CafeMobileNavProvider>
        {isMobile ? (
          <div className="cafe-mobile-shell cafe-shell cafe-ambient flex h-svh w-full min-w-0 max-w-full flex-col overflow-hidden">
            <main
              id="cafe-main"
              className="cafe-screen-mobile flex min-h-0 w-full max-w-full flex-col outline-none"
            >
              <CafeScreenHeader />
              {children}
            </main>
            <CafeBottomNav />
            <CafeMobileNavSheet />
            <PostLoginViewModeDialog />
          </div>
        ) : (
          <div className="cafe-shell cafe-ambient flex min-h-screen w-full overflow-x-clip">
            <CafeSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
              <main id="cafe-main" className="min-w-0 w-full flex-1 outline-none">
                {children}
              </main>
            </div>
            <PostLoginViewModeDialog />
          </div>
        )}
      </CafeMobileNavProvider>
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
  return (
    <SplashScreen
      variant={variant}
      onDone={() => {
        setShow(false);
        markAppBootSuccessful();
      }}
    />
  );
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
      <AppBootRecovery />
      <QueryClientProvider client={queryClient}>
      <ViewModeProvider>
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
                <Route path="/compare" element={<CompareHub />} />
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
                            path="admins"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformAdmins />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route
                            path="broadcasts"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformBroadcasts />
                                </LazyPage>
                              </PlatformProtectedRoute>
                            }
                          />
                          <Route
                            path="sandbox"
                            element={
                              <PlatformProtectedRoute>
                                <LazyPage>
                                  <PlatformSandbox />
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
                <Route element={<ProtectedRoute permission="audit.login_logs.view" />}>
                  <Route
                    path="/login-logs"
                    element={
                      <LazyPage>
                        <LoginLogs />
                      </LazyPage>
                    }
                  />
                </Route>

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
                  path="/public/tournaments/tv"
                  element={
                    <LazyPage>
                      <PublicTournamentTV />
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
                <Route
                  path="/lite/public/tournaments/tv"
                  element={
                    <LazyPage>
                      <PublicTournamentTV branchSlug="lite" />
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

                {/* Protected routes — shared shell; only main content animates */}
                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/dashboard"
                    element={
                      <LazyPage>
                        <Dashboard />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/pos"
                    element={
                      <LazyPage>
                        <POS />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/stations"
                    element={
                      <LazyPage>
                        <Stations />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <LazyPage>
                        <Products />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <LazyPage>
                        <Customers />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <LazyPage>
                        <Reports />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/booking-management"
                    element={
                      <LazyPage>
                        <PlanFeatureGate feature="bookings_enabled">
                          <BookingManagement />
                        </PlanFeatureGate>
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/tournaments"
                    element={
                      <LazyPage>
                        <PlanFeatureGate feature="tournaments_enabled">
                          <TournamentsPage />
                        </PlanFeatureGate>
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/how-to-use"
                    element={
                      <LazyPage>
                        <HowToUsePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/chat-ai"
                    element={
                      <LazyPage>
                        <PlanFeatureGate feature="premium_modules_enabled">
                          <ChatAI />
                        </PlanFeatureGate>
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <LazyPage>
                        <Settings />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/organization"
                    element={
                      <LazyPage>
                        <OrganizationSettings />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/billing"
                    element={
                      <LazyPage>
                        <Billing />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/subscription"
                    element={
                      <LazyPage>
                        <Billing />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/account/security"
                    element={
                      <LazyPage>
                        <AccountSecurity />
                      </LazyPage>
                    }
                  />
                </Route>

                <Route element={<ProtectedRoute permission="hr.view" />}>
                  <Route
                    path="/staff"
                    element={
                      <LazyPage>
                        <PlanFeatureGate feature="staff_hr_enabled">
                          <StaffManagement />
                        </PlanFeatureGate>
                      </LazyPage>
                    }
                  />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/staff-portal"
                    element={
                      <LazyPage>
                        <PlanFeatureGate feature="staff_hr_enabled">
                          <StaffPortal />
                        </PlanFeatureGate>
                      </LazyPage>
                    }
                  />
                </Route>

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
      </ViewModeProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
