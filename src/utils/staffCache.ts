import { invalidateCache } from '@/utils/dataCache';

const STAFF_PREFIX = 'cuephoria_staff_';

export const STAFF_CACHE_KEYS = {
  PROFILES: `${STAFF_PREFIX}profiles`,
  STATS: `${STAFF_PREFIX}stats`,
  ATTENDANCE: `${STAFF_PREFIX}attendance`,
  REQUESTS: `${STAFF_PREFIX}requests`,
  PAYROLL: `${STAFF_PREFIX}payroll`,
} as const;

export function staffCacheKey(
  base: string,
  organizationId: string | null | undefined,
  locationId: string | null | undefined,
  scope: 'location' | 'all' = 'location',
): string {
  const org = organizationId ?? 'none';
  const loc = scope === 'all' ? 'all' : (locationId ?? 'none');
  return `${base}__${org}__${loc}`;
}

export function invalidateStaffCache(
  organizationId: string | null | undefined,
  locationId?: string | null,
): void {
  if (!organizationId) return;
  Object.values(STAFF_CACHE_KEYS).forEach((base) => {
    invalidateCache(staffCacheKey(base, organizationId, locationId, 'location'));
    invalidateCache(staffCacheKey(base, organizationId, locationId, 'all'));
  });
}

export function clearAllStaffCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STAFF_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
