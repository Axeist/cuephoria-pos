import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Controls which heavy POS datasets load from Supabase. Screens that don't need
 * full customer/bill lists (Settings, Staff, Bookings admin, etc.) skip work so
 * the app stays responsive.
 */
export type POSHydrationFlags = {
  loadCustomers: boolean;
  loadBills: boolean;
  /** When true, allow deeper bill pagination in the background (Reports / heavy analytics). */
  billsDeepSync: boolean;
};

const defaultWhenNoProvider: POSHydrationFlags = {
  loadCustomers: true,
  loadBills: true,
  billsDeepSync: true,
};

const POSHydrationContext = createContext<POSHydrationFlags | null>(null);

function flagsForPath(pathname: string): POSHydrationFlags {
  const p = pathname.split('?')[0] || '';

  // Customers must be available everywhere the operator can start a session,
  // look up a member, or process cart actions (stations, cafe, bookings, POS,
  // dashboard, reports, etc.). Keeping this always-on avoids "No Customers
  // Available" on Stations and similar screens.
  const loadCustomers = true;

  const loadBills =
    p.startsWith('/dashboard') ||
    p.startsWith('/pos') ||
    p.startsWith('/reports');

  const billsDeepSync = p.startsWith('/reports');

  return { loadCustomers, loadBills, billsDeepSync };
}

/**
 * Place inside the router, wrapping {@link POSProvider}.
 */
export function POSHydrationObserver({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const value = useMemo(() => flagsForPath(pathname), [pathname]);

  return <POSHydrationContext.Provider value={value}>{children}</POSHydrationContext.Provider>;
}

export function usePOSHydration(): POSHydrationFlags {
  const ctx = useContext(POSHydrationContext);
  return ctx ?? defaultWhenNoProvider;
}
