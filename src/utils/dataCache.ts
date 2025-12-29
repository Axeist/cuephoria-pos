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
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes (for background refresh)

/**
 * Get cached data from memory or localStorage
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
        const parsed = JSON.parse(cachedData);
        // Update memory cache
        memoryCache[key] = { data: parsed, timestamp: Date.now() };
        return parsed as T;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting cached data for ${key}:`, error);
    return null;
  }
}

/**
 * Save data to both memory and localStorage cache
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    // Save to memory cache
    memoryCache[key] = { data, timestamp: Date.now() };

    // Save to localStorage cache
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error(`Error saving to cache for ${key}:`, error);
    // If localStorage is full, clear old cache entries
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearOldCacheEntries();
      // Retry once
      try {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(`${key}_timestamp`, Date.now().toString());
      } catch (retryError) {
        console.error('Failed to save to cache after cleanup:', retryError);
      }
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

