import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ExpenseProvider } from '@/context/ExpenseContext';
import AppSidebar from '@/components/layout/AppSidebar';
import SidebarTrigger from '@/components/layout/SidebarTrigger';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Customers from '@/pages/Customers';
import Stations from '@/pages/Stations';
import Expenses from '@/pages/Expenses';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Bookings from '@/pages/Bookings';
import Tournaments from '@/pages/Tournaments';
import Rewards from '@/pages/Rewards';
import Promotions from '@/pages/Promotions';
import { CashDeposits } from '@/pages/CashDeposits';
import { CashTransactions } from '@/pages/CashTransactions';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { NoAuth } from '@/components/auth/NoAuth';
import { POSProvider } from '@/context/POSContext';
import { CashProvider } from '@/context/CashContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExpenseProvider>
        <POSProvider>
          <CashProvider>
            <AuthProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-[#1A1F2C]">
                  <Toaster />
                  <SidebarProvider>
                    <AppSidebar />
                    <main className="flex-1 w-full">
                      <SidebarTrigger />
                      <Routes>
                        <Route path="/login" element={<NoAuth><Login /></NoAuth>} />
                        <Route path="/register" element={<NoAuth><Register /></NoAuth>} />
                        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                        <Route path="/products" element={<RequireAuth><Products /></RequireAuth>} />
                        <Route path="/customers" element={<RequireAuth><Customers /></RequireAuth>} />
                        <Route path="/stations" element={<RequireAuth><Stations /></RequireAuth>} />
                        <Route path="/expenses" element={<RequireAuth><Expenses /></RequireAuth>} />
                        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                        <Route path="/bookings" element={<RequireAuth><Bookings /></RequireAuth>} />
                        <Route path="/tournaments" element={<RequireAuth><Tournaments /></RequireAuth>} />
                        <Route path="/rewards" element={<RequireAuth><Rewards /></RequireAuth>} />
                        <Route path="/promotions" element={<RequireAuth><Promotions /></RequireAuth>} />
                        <Route path="/cash-deposits" element={<RequireAuth><CashDeposits /></RequireAuth>} />
                        <Route path="/cash-transactions" element={<RequireAuth><CashTransactions /></RequireAuth>} />
                      </Routes>
                    </main>
                  </SidebarProvider>
                </div>
              </BrowserRouter>
            </AuthProvider>
          </CashProvider>
        </POSProvider>
      </ExpenseProvider>
    </QueryClientProvider>
  );
}

export default App;
