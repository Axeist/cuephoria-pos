/** Build tenant-scoped public booking URLs (branch path + optional location id). */

import { DEFAULT_PUBLIC_ORG_SLUG } from '@/utils/publicLocationResolve';

export function publicBookingPathForBranchSlug(branchSlug: string): string {
  return branchSlug === 'lite' ? '/lite/public/booking' : '/public/booking';
}

export function buildPublicBookingUrl(options: {
  branchSlug: string;
  locationId?: string | null;
  orgSlug?: string;
  origin?: string;
}): string {
  const origin =
    options.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const path = publicBookingPathForBranchSlug(options.branchSlug);
  const url = new URL(path, origin || 'http://localhost');
  if (options.locationId) {
    url.searchParams.set('location', options.locationId);
  } else if (options.orgSlug && options.orgSlug !== DEFAULT_PUBLIC_ORG_SLUG) {
    url.searchParams.set('org', options.orgSlug);
  }
  return url.toString();
}
