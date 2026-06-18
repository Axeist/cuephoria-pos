import React, { createContext, useContext } from 'react';
import { useLocationAnalytics, type LocationAnalytics } from '@/hooks/useLocationAnalytics';

type SummaryAnalyticsContextValue = ReturnType<typeof useLocationAnalytics>;

const SummaryAnalyticsContext = createContext<SummaryAnalyticsContextValue | null>(null);

export function SummaryAnalyticsProvider({
  startDate,
  endDate,
  children,
}: {
  startDate?: Date;
  endDate?: Date;
  children: React.ReactNode;
}) {
  const value = useLocationAnalytics({ startDate, endDate, enabled: true });
  return (
    <SummaryAnalyticsContext.Provider value={value}>
      {children}
    </SummaryAnalyticsContext.Provider>
  );
}

export function useSummaryAnalytics(): SummaryAnalyticsContextValue {
  const ctx = useContext(SummaryAnalyticsContext);
  if (!ctx) {
    throw new Error('useSummaryAnalytics must be used within SummaryAnalyticsProvider');
  }
  return ctx;
}

export function useOptionalSummaryAnalytics(): SummaryAnalyticsContextValue | null {
  return useContext(SummaryAnalyticsContext);
}

export type { LocationAnalytics };
