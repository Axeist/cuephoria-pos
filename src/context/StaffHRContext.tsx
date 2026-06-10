import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { useLocation } from '@/context/LocationContext';
import {
  fetchActiveShifts,
  fetchPendingLeaves,
  fetchStaffProfiles,
  fetchStaffStats,
} from '@/services/staff/staffApi';
import type {
  ActiveShift,
  PendingLeave,
  StaffProfile,
  StaffReportScope,
  StaffScope,
  StaffStats,
  StaffTabId,
} from '@/types/staff.types';

type StaffHRContextValue = {
  staffScope: StaffScope | null;
  profiles: StaffProfile[];
  activeShifts: ActiveShift[];
  pendingLeaves: PendingLeave[];
  stats: StaffStats;
  isLoading: boolean;
  locationResolved: boolean;
  reportScope: StaffReportScope;
  setReportScope: (s: StaffReportScope) => void;
  activeTab: StaffTabId;
  setActiveTab: (tab: StaffTabId) => void;
  refresh: () => Promise<void>;
};

const defaultStats: StaffStats = {
  totalStaff: 0,
  activeStaff: 0,
  inactiveStaff: 0,
  activeNow: 0,
  pendingLeaves: 0,
  pendingRequests: 0,
  monthlyPayroll: 0,
};

const StaffHRContext = createContext<StaffHRContextValue | undefined>(undefined);

export const StaffHRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const orgCtx = useOrganizationOptional();
  const {
    activeLocationId,
    locations,
    locationResolved,
    reportScope,
    setReportScope,
  } = useLocation();

  const organizationId = orgCtx?.organization?.id ?? null;
  const locationIds = useMemo(() => locations.map((l) => l.id), [locations]);

  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [stats, setStats] = useState<StaffStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StaffTabId>('overview');
  const abortRef = useRef<AbortController | null>(null);

  const staffScope = useMemo<StaffScope | null>(() => {
    if (!organizationId || !locationResolved) return null;
    return {
      organizationId,
      locationId: activeLocationId,
      locationIds,
      scope: reportScope,
    };
  }, [organizationId, activeLocationId, locationIds, locationResolved, reportScope]);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (!staffScope || !staffScope.locationId) {
      setProfiles([]);
      setActiveShifts([]);
      setPendingLeaves([]);
      setStats(defaultStats);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const loadedProfiles = await fetchStaffProfiles(staffScope);
      if (ac.signal.aborted) return;

      const profileIds = loadedProfiles.map((p) => p.user_id);
      const [shifts, leaves, computedStats] = await Promise.all([
        fetchActiveShifts(profileIds),
        fetchPendingLeaves(profileIds),
        fetchStaffStats(staffScope, loadedProfiles),
      ]);
      if (ac.signal.aborted) return;

      setProfiles(loadedProfiles);
      setActiveShifts(shifts);
      setPendingLeaves(leaves);
      setStats(computedStats);
    } catch (err: unknown) {
      if (ac.signal.aborted) return;
      console.error('StaffHR refresh:', err);
      toast({
        title: 'Error',
        description: 'Failed to load staff data',
        variant: 'destructive',
      });
    } finally {
      if (!ac.signal.aborted) setIsLoading(false);
    }
  }, [staffScope, toast]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  const value = useMemo<StaffHRContextValue>(
    () => ({
      staffScope,
      profiles,
      activeShifts,
      pendingLeaves,
      stats,
      isLoading,
      locationResolved,
      reportScope,
      setReportScope,
      activeTab,
      setActiveTab,
      refresh,
    }),
    [
      staffScope,
      profiles,
      activeShifts,
      pendingLeaves,
      stats,
      isLoading,
      locationResolved,
      reportScope,
      setReportScope,
      activeTab,
      refresh,
    ],
  );

  return <StaffHRContext.Provider value={value}>{children}</StaffHRContext.Provider>;
};

export function useStaffHR(): StaffHRContextValue {
  const ctx = useContext(StaffHRContext);
  if (!ctx) throw new Error('useStaffHR must be used within StaffHRProvider');
  return ctx;
}

export function useStaffHROptional(): StaffHRContextValue | null {
  return useContext(StaffHRContext) ?? null;
}
