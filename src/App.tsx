
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ExpenseProvider } from '@/context/ExpenseContext';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Customers from '@/pages/Customers';
import Stations from '@/pages/Stations';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
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
                  <main className="flex-1 w-full">
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/stations" element={<Stations />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </main>
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
