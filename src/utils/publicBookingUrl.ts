/** Build tenant-scoped public booking URLs (branch path + optional location id). */

import { DEFAULT_PUBLIC_ORG_SLUG } from '@/utils/publicLocationResolve';

export type PublicBookingReturnContext = {
  branchSlug?: string;
  locationId?: string | null;
  orgSlug?: string | null;
};

export function publicBookingPathForBranchSlug(branchSlug: string): string {
  return branchSlug === 'lite' ? '/lite/public/booking' : '/public/booking';
}

export function resolvePublicBookingReturnPath(
  ctx: PublicBookingReturnContext & { bookingSuccess?: boolean },
): string {
  const branchSlug = ctx.branchSlug ?? 'main';
  const path = publicBookingPathForBranchSlug(branchSlug);
  const params = new URLSearchParams();
  if (ctx.locationId) {
    params.set('location', ctx.locationId);
  } else if (ctx.orgSlug && ctx.orgSlug !== DEFAULT_PUBLIC_ORG_SLUG) {
    params.set('org', ctx.orgSlug);
  }
  if (ctx.bookingSuccess) {
    params.set('booking_success', 'true');
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Append location/org/profile to Razorpay payment callback query string. */
export function paymentCallbackQuery(ctx: PublicBookingReturnContext): string {
  const params = new URLSearchParams();
  if (ctx.locationId) {
    params.set('location', ctx.locationId);
  } else if (ctx.orgSlug && ctx.orgSlug !== DEFAULT_PUBLIC_ORG_SLUG) {
    params.set('org', ctx.orgSlug);
  }
  if (ctx.branchSlug === 'lite') {
    params.set('profile', 'lite');
  }
  const qs = params.toString();
  return qs ? `&${qs}` : '';
}

export function returnContextFromSearchParams(
  searchParams: URLSearchParams,
  fallback?: PublicBookingReturnContext | null,
): PublicBookingReturnContext {
  const profile = searchParams.get('profile');
  return {
    branchSlug:
      fallback?.branchSlug ?? (profile === 'lite' ? 'lite' : 'main'),
    locationId: searchParams.get('location') || fallback?.locationId || null,
    orgSlug: searchParams.get('org') || fallback?.orgSlug || null,
  };
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
