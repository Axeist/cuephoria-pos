import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from "@/utils/dataCache";

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

type LocationContextValue = {
  locations: VenueLocation[];
  activeLocationId: string | null;
  activeLocation: VenueLocation | null;
  setActiveLocationId: (id: string) => void;
  loading: boolean;
  reportScope: ReportScope;
  setReportScope: (s: ReportScope) => void;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [loading, setLoading] = useState(true);
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
          setLocations(Array.isArray(json.locations) ? json.locations : []);
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
    if (!locations.length) return;
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
  }, [locations, activeLocationId]);

  const setActiveLocationId = useCallback((id: string) => {
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
      reportScope,
      setReportScope,
    }),
    [locations, activeLocationId, activeLocation, setActiveLocationId, loading, reportScope]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
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
