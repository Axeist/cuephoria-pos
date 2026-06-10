/**
 * Tenant isolation helpers — prevent cross-workspace data bleed in browser caches.
 */

/** Module-level customer memory cache lives in useCustomers; cleared on org switch. */
let clearCustomerMemoryCache: (() => void) | null = null;

export function registerCustomerMemoryCacheClear(fn: () => void): void {
  clearCustomerMemoryCache = fn;
}

const CUSTOMER_CACHE_PREFIX = 'cuephoria_customers_cache_';
const CUSTOMER_TS_PREFIX = 'cuephoria_customers_cache_ts_';
const LEGACY_CUSTOMERS_KEY = 'cuephoriaCustomers';
const LEGACY_LOCATION_KEY = 'cuephoria_active_location_id';

/** Remove all per-branch customer caches and legacy unscoped customer blobs. */
export function clearAllCustomerCaches(): void {
  clearCustomerMemoryCache?.();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith(CUSTOMER_CACHE_PREFIX) ||
        key.startsWith(CUSTOMER_TS_PREFIX) ||
        key === LEGACY_CUSTOMERS_KEY
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore quota / private mode */
  }
}

export { clearAllStaffCaches } from '@/utils/staffCache';

export function activeLocationStorageKey(organizationId: string): string {
  return `${LEGACY_LOCATION_KEY}_${organizationId}`;
}

/** Drop pre–multi-tenant global location id (not org-scoped). */
export function removeLegacyGlobalLocationKey(): void {
  try {
    localStorage.removeItem(LEGACY_LOCATION_KEY);
  } catch {
    /* ignore */
  }
}

export function readStoredActiveLocationId(organizationId: string | null): string | null {
  if (!organizationId) return null;
  try {
    return localStorage.getItem(activeLocationStorageKey(organizationId));
  } catch {
    return null;
  }
}

export function writeStoredActiveLocationId(organizationId: string, locationId: string): void {
  try {
    localStorage.setItem(activeLocationStorageKey(organizationId), locationId);
  } catch {
    /* ignore */
  }
}

export function clearStoredActiveLocationId(organizationId: string | null): void {
  if (!organizationId) return;
  try {
    localStorage.removeItem(activeLocationStorageKey(organizationId));
  } catch {
    /* ignore */
  }
}

/** Called when the active workspace (organization) changes. */
export function onOrganizationChanged(nextOrgId: string | null, prevOrgId: string | null): void {
  if (nextOrgId === prevOrgId) return;
  clearAllCustomerCaches();
  clearAllStaffCaches();
  removeLegacyGlobalLocationKey();
  if (prevOrgId) clearStoredActiveLocationId(prevOrgId);
}
