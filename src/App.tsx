
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { POSProvider } from "@/context/POSContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy load components for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const Products = lazy(() => import("./pages/Products"));
const Customers = lazy(() => import("./pages/Customers"));
const Stations = lazy(() => import("./pages/Stations"));
const PublicStations = lazy(() => import("./pages/PublicStations"));
const PublicTournaments = lazy(() => import("./pages/PublicTournaments"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <POSProvider>
          <ExpenseProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SidebarProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/public-stations" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <PublicStations />
                    </Suspense>
                  } />
                  <Route path="/tournaments" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <PublicTournaments />
                    </Suspense>
                  } />
                  <Route path="/dashboard" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="/pos" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <POS />
                    </Suspense>
                  } />
                  <Route path="/products" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Products />
                    </Suspense>
                  } />
                  <Route path="/customers" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Customers />
                    </Suspense>
                  } />
                  <Route path="/stations" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Stations />
                    </Suspense>
                  } />
                  <Route path="/reports" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Reports />
                    </Suspense>
                  } />
                  <Route path="/settings" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Settings />
                    </Suspense>
                  } />
                  <Route path="/terms" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Terms />
                    </Suspense>
                  } />
                  <Route path="/privacy" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Privacy />
                    </Suspense>
                  } />
                  <Route path="/contact" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Contact />
                    </Suspense>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SidebarProvider>
            </BrowserRouter>
          </ExpenseProvider>
        </POSProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
