import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from "@/utils/dataCache";
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

const STORAGE_KEY = "cuephoria_active_location_id";

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
  setActiveLocationId: (id: string) => void;
  loading: boolean;
  isSwitching: boolean;
  reportScope: ReportScope;
  setReportScope: (s: ReportScope) => void;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<VenueLocation | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [reportScope, setReportScope] = useState<ReportScope>("location");

  useEffect(() => {
    if (!user) {
      setLocations([]);
      setLoading(false);
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
  }, [user]);

  useEffect(() => {
    if (loading) return;

    // No franchise branches exposed (wrong account, revoked links, stale cache):
    // clear stored branch ID so POS queries never run with an orphan UUID.
    if (!locations.length) {
      if (activeLocationId !== null) {
        setActiveLocationIdState(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const valid = locations.some((l) => l.id === activeLocationId);
    if (!valid) {
      const first = locations[0].id;
      setActiveLocationIdState(first);
      try {
        localStorage.setItem(STORAGE_KEY, first);
      } catch {
        /* ignore */
      }
    }
  }, [locations, activeLocationId, loading]);

  const setActiveLocationId = useCallback((id: string) => {
    // Find the target location for overlay display
    setLocations(prev => {
      const target = prev.find(l => l.id === id) ?? null;
      setSwitchingTo(target);
      return prev;
    });
    setIsSwitching(true);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setIsSwitching(false), 2000);

    setActiveLocationIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    invalidateCache(cacheKeyWithLocation(CACHE_KEYS.STATIONS, id));
    invalidateCache(cacheKeyWithLocation(CACHE_KEYS.PRODUCTS, id));
    invalidateCache(cacheKeyWithLocation(CACHE_KEYS.BILLS, id));
    invalidateCache(cacheKeyWithLocation(CACHE_KEYS.SESSIONS, id));
    invalidateCache(cacheKeyWithLocation(CACHE_KEYS.BOOKINGS, id));
    // Clear per-location customer cache for the new branch so a fresh fetch is triggered
    localStorage.removeItem(`cuephoria_customers_cache_${id}`);
    localStorage.removeItem(`cuephoria_customers_cache_ts_${id}`);
  }, []);

  const activeLocation = useMemo(
    () => locations.find((l) => l.id === activeLocationId) || null,
    [locations, activeLocationId]
  );

  const value = useMemo<LocationContextValue>(
    () => ({
      locations,
      activeLocationId,
      activeLocation,
      setActiveLocationId,
      loading,
      isSwitching,
      reportScope,
      setReportScope,
    }),
    [locations, activeLocationId, activeLocation, setActiveLocationId, loading, isSwitching, reportScope]
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
