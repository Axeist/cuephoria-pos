// ✅ CENTRALIZED CACHE UTILITY FOR ALL DATA TYPES
// Reduces egress usage and improves performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface MemoryCache {
  [key: string]: CacheEntry<any>;
}

// Memory cache (fastest - in-memory)
const memoryCache: MemoryCache = {};

// Cache configuration
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes — Pro plan has ample egress headroom
const STALE_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes (background refresh window)

/**
 * Runs once on app boot to evict any cache entries whose JSON is unparseable
 * or whose timestamp is missing/malformed. Half-written entries (data present
 * but no timestamp, or vice-versa) are the main source of "Database Error"
 * toasts that previously required clearing all browser storage to resolve.
 */
export function sweepCorruptedCacheEntries(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('cuephoria_')) continue;
      if (key.endsWith('_timestamp') || key.endsWith('_ts_')) continue;

      // Every cuephoria_ data key must have a sibling timestamp and valid JSON.
      const tsKey = `${key}_timestamp`;
      const raw = localStorage.getItem(key);
      const ts = localStorage.getItem(tsKey);

      const tsMissing = !ts || isNaN(parseInt(ts, 10));
      let jsonBad = false;
      if (raw) {
        try { JSON.parse(raw); } catch { jsonBad = true; }
      }

      if (tsMissing || jsonBad) {
        keysToRemove.push(key, tsKey);
      }
    }
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
        delete memoryCache[k];
      });
      console.warn(
        `[cache-sweep] Evicted ${Math.ceil(keysToRemove.length / 2)} corrupted cache entry/entries. ` +
        'This prevents stale-cache database errors without requiring a manual cache clear.'
      );
    }
  } catch {
    /* ignore — private mode or storage disabled */
  }
}

/**
 * Get cached data from memory or localStorage.
 * Auto-evicts the entry if JSON is malformed (prevents database errors from
 * corrupted cache being served to Supabase queries).
 */
export function getCachedData<T>(key: string): T | null {
  try {
    // Check memory cache first (fastest)
    if (memoryCache[key] && Date.now() - memoryCache[key].timestamp < CACHE_DURATION_MS) {
      return memoryCache[key].data as T;
    }

    // Check localStorage cache
    const cachedTimestamp = localStorage.getItem(`${key}_timestamp`);
    const cachedData = localStorage.getItem(key);

    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);

      if (cacheAge < CACHE_DURATION_MS) {
        let parsed: T;
        try {
          parsed = JSON.parse(cachedData) as T;
        } catch (parseErr) {
          // Corrupted JSON — evict immediately so the app falls through to a
          // fresh DB fetch instead of crashing with a "Database Error" toast.
          console.warn(`[cache] Evicting corrupted entry for key "${key}"`  , parseErr);
          try {
            localStorage.removeItem(key);
            localStorage.removeItem(`${key}_timestamp`);
            delete memoryCache[key];
          } catch { /* ignore */ }
          return null;
        }
        // Update memory cache
        memoryCache[key] = { data: parsed, timestamp: Date.now() };
        return parsed;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting cached data for ${key}:`, error);
    return null;
  }
}

/**
 * Save data to both memory and localStorage cache.
 * Uses atomic-style writes: if either localStorage.setItem throws, both the
 * data key and the timestamp key are removed to avoid half-written state that
 * would later be served as corrupted data.
 */
export function saveToCache<T>(key: string, data: T): void {
  // Always update memory cache — it never throws QuotaExceededError
  memoryCache[key] = { data, timestamp: Date.now() };

  const tsKey = `${key}_timestamp`;
  const serialized = JSON.stringify(data);
  const nowStr = Date.now().toString();

  const writeToLocalStorage = () => {
    localStorage.setItem(key, serialized);
    localStorage.setItem(tsKey, nowStr);
  };

  const rollbackLocalStorage = () => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { localStorage.removeItem(tsKey); } catch { /* ignore */ }
  };

  try {
    writeToLocalStorage();
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      // Roll back any partial write before clearing space
      rollbackLocalStorage();
      clearOldCacheEntries();
      try {
        writeToLocalStorage();
      } catch (retryError) {
        // Quota still full after cleanup — roll back and give up on localStorage.
        // Memory cache still has the data so the current session is unaffected.
        rollbackLocalStorage();
        console.warn('[cache] localStorage still full after cleanup — cache will be memory-only for this key:', key);
      }
    } else {
      rollbackLocalStorage();
      console.error(`Error saving to cache for ${key}:`, error);
    }
  }
}

/**
 * Check if cache is stale (needs background refresh)
 */
export function isCacheStale(key: string): boolean {
  try {
    const cachedTimestamp = localStorage.getItem(`${key}_timestamp`);
    if (!cachedTimestamp) return true;

    const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);
    return cacheAge > STALE_CACHE_DURATION_MS && cacheAge < CACHE_DURATION_MS;
  } catch {
    return true;
  }
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
  delete memoryCache[key];
  localStorage.removeItem(key);
  localStorage.removeItem(`${key}_timestamp`);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  // Clear localStorage cache entries (keep other localStorage items)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.endsWith('_timestamp') || key.startsWith('cuephoria_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries(): void {
  const keysToRemove: string[] = [];
  const now = Date.now();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.endsWith('_timestamp')) {
      const timestamp = parseInt(localStorage.getItem(key) || '0', 10);
      if (now - timestamp > CACHE_DURATION_MS * 2) {
        // Remove cache entries older than 10 minutes
        const dataKey = key.replace('_timestamp', '');
        keysToRemove.push(key);
        keysToRemove.push(dataKey);
      }
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    delete memoryCache[key];
  });

  console.log(`Cleared ${keysToRemove.length / 2} old cache entries`);
}

/**
 * Cache keys for different data types
 */
export const CACHE_KEYS = {
  CUSTOMERS: 'cuephoria_customers_cache',
  PRODUCTS: 'cuephoria_products_cache',
  BILLS: 'cuephoria_bills_cache',
  STATIONS: 'cuephoria_stations_cache',
  SESSIONS: 'cuephoria_sessions_cache',
  BOOKINGS: 'cuephoria_bookings_cache',
} as const;

/** Namespaces cache keys per venue so switching branches does not show stale data. */
export function cacheKeyWithLocation(base: string, locationId: string | null | undefined): string {
  if (!locationId) return base;
  return `${base}__${locationId}`;
}

