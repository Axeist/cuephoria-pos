import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationOptional } from "@/context/OrganizationContext";
import { invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from "@/utils/dataCache";
import {
  clearAllCustomerCaches,
  onOrganizationChanged,
  readStoredActiveLocationId,
  removeLegacyGlobalLocationKey,
  writeStoredActiveLocationId,
} from "@/utils/tenantIsolation";
import { BranchSwitchOverlay } from "@/components/BranchSwitchOverlay";

export type VenueLocation = {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  sort_order: number;
  is_active: boolean;
};

export type ReportScope = "location" | "all";

/**
 * Cafe is a distinct product with its own login flow (/cafe) and its own
 * user/data management. The admin dashboard models "locations" as gaming
 * franchise branches only, so any cafe row returned by the API must be
 * filtered out before reaching any consumer of `useLocation()`.
 */
const isFranchiseLocation = (l: VenueLocation) =>
  l.slug !== "cafe" && l.short_code?.toLowerCase() !== "cafe";

type LocationContextValue = {
  locations: VenueLocation[];
  activeLocationId: string | null;
  activeLocation: VenueLocation | null;
  /** True once activeLocationId belongs to the current workspace's location list. */
  locationResolved: boolean;
  setActiveLocationId: (id: string) => void;
  loading: boolean;
  isSwitching: boolean;
  reportScope: ReportScope;
  setReportScope: (s: ReportScope) => void;
  /** Refetch branch list after renames (e.g. Settings → Branches). */
  reloadLocations: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const orgCtx = useOrganizationOptional();
  const organizationId = orgCtx?.organization?.id ?? null;

  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<VenueLocation | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOrgIdRef = useRef<string | null>(null);

  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(null);
  const [reportScope, setReportScope] = useState<ReportScope>("location");

  // Reset branch + caches when workspace changes so a stale Cuephoria location id
  // never drives customer queries for a new tenant.
  useEffect(() => {
    onOrganizationChanged(organizationId, prevOrgIdRef.current);
    prevOrgIdRef.current = organizationId;
    setActiveLocationIdState(null);
    removeLegacyGlobalLocationKey();
  }, [organizationId]);

  useEffect(() => {
    if (!user) {
      setLocations([]);
      setLoading(false);
      setActiveLocationIdState(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/locations");
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "Failed to load locations");
        if (!cancelled) {
          const raw: VenueLocation[] = Array.isArray(json.locations)
            ? json.locations
            : [];
          setLocations(raw.filter(isFranchiseLocation));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, organizationId]);

  useEffect(() => {
    if (loading || !organizationId) return;

    if (!locations.length) {
      if (activeLocationId !== null) setActiveLocationIdState(null);
      return;
    }

    const stored = readStoredActiveLocationId(organizationId);
    const candidate = stored && locations.some((l) => l.id === stored) ? stored : null;
    const valid = activeLocationId && locations.some((l) => l.id === activeLocationId);

    if (valid) return;

    const next = candidate ?? locations[0].id;
    setActiveLocationIdState(next);
    writeStoredActiveLocationId(organizationId, next);
  }, [locations, activeLocationId, loading, organizationId]);

  const locationResolved = useMemo(() => {
    if (loading || !organizationId) return false;
    if (!locations.length) return true;
    if (!activeLocationId) return false;
    return locations.some((l) => l.id === activeLocationId);
  }, [loading, organizationId, locations, activeLocationId]);

  const reloadLocations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/admin/locations");
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to load locations");
      const raw: VenueLocation[] = Array.isArray(json.locations) ? json.locations : [];
      setLocations(raw.filter(isFranchiseLocation));
    } catch (e) {
      console.error("reloadLocations:", e);
    }
  }, [user]);

  const setActiveLocationId = useCallback(
    (id: string) => {
      if (!organizationId) return;
      if (!locations.some((l) => l.id === id)) return;

      setLocations((prev) => {
        const target = prev.find((l) => l.id === id) ?? null;
        setSwitchingTo(target);
        return prev;
      });
      setIsSwitching(true);
      if (switchTimer.current) clearTimeout(switchTimer.current);
      switchTimer.current = setTimeout(() => setIsSwitching(false), 2000);

      setActiveLocationIdState(id);
      writeStoredActiveLocationId(organizationId, id);

      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.STATIONS, id));
      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.PRODUCTS, id));
      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.BILLS, id));
      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.SESSIONS, id));
      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.BOOKINGS, id));

      clearAllCustomerCaches();
    },
    [organizationId, locations]
  );

  const activeLocation = useMemo(
    () => locations.find((l) => l.id === activeLocationId) || null,
    [locations, activeLocationId]
  );

  const value = useMemo<LocationContextValue>(
    () => ({
      locations,
      activeLocationId: locationResolved ? activeLocationId : null,
      activeLocation,
      locationResolved,
      setActiveLocationId,
      loading,
      isSwitching,
      reportScope,
      setReportScope,
      reloadLocations,
    }),
    [
      locations,
      activeLocationId,
      activeLocation,
      locationResolved,
      setActiveLocationId,
      loading,
      isSwitching,
      reportScope,
      reloadLocations,
    ]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
      <BranchSwitchOverlay isVisible={isSwitching} targetLocation={switchingTo} />
    </LocationContext.Provider>
  );
};

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}

/** Safe outside LocationProvider (returns null). */
export function useLocationOptional(): LocationContextValue | null {
  return useContext(LocationContext) ?? null;
}
