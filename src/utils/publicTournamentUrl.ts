/** Build tenant-scoped public tournament URLs (branch path + optional location id). */

import {
  DEFAULT_PUBLIC_ORG_SLUG,
  type PublicLocationRow,
} from '@/utils/publicLocationResolve';
import {
  paymentCallbackQuery,
  returnContextFromSearchParams,
  type PublicBookingReturnContext,
} from '@/utils/publicBookingUrl';

export type PublicTournamentReturnContext = PublicBookingReturnContext;

export function publicTournamentPathForBranchSlug(branchSlug: string): string {
  return branchSlug === 'lite' ? '/lite/public/tournaments' : '/public/tournaments';
}

export function publicTournamentTVPathForBranchSlug(branchSlug: string): string {
  return branchSlug === 'lite'
    ? '/lite/public/tournaments/tv'
    : '/public/tournaments/tv';
}

export function resolvePublicTournamentReturnPath(
  ctx: PublicTournamentReturnContext & { registrationSuccess?: boolean; regId?: string },
): string {
  const branchSlug = ctx.branchSlug ?? 'main';
  const path = publicTournamentPathForBranchSlug(branchSlug);
  const params = new URLSearchParams();
  if (ctx.locationId) {
    params.set('location', ctx.locationId);
  } else if (ctx.orgSlug && ctx.orgSlug !== DEFAULT_PUBLIC_ORG_SLUG) {
    params.set('org', ctx.orgSlug);
  }
  if (ctx.registrationSuccess) {
    params.set('registration_success', 'true');
  }
  if (ctx.regId) {
    params.set('reg_id', ctx.regId);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function buildPublicTournamentUrl(options: {
  branchSlug: string;
  locationId?: string | null;
  orgSlug?: string;
  origin?: string;
}): string {
  const origin =
    options.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const path = publicTournamentPathForBranchSlug(options.branchSlug);
  const url = new URL(path, origin || 'http://localhost');
  if (options.locationId) {
    url.searchParams.set('location', options.locationId);
  } else if (options.orgSlug && options.orgSlug !== DEFAULT_PUBLIC_ORG_SLUG) {
    url.searchParams.set('org', options.orgSlug);
  }
  return url.toString();
}

export function buildPublicTournamentTVUrl(options: {
  branchSlug: string;
  locationId?: string | null;
  orgSlug?: string;
  origin?: string;
}): string {
  const origin =
    options.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const path = publicTournamentTVPathForBranchSlug(options.branchSlug);
  const url = new URL(path, origin || 'http://localhost');
  if (options.locationId) {
    url.searchParams.set('location', options.locationId);
  } else if (options.orgSlug && options.orgSlug !== DEFAULT_PUBLIC_ORG_SLUG) {
    url.searchParams.set('org', options.orgSlug);
  }
  return url.toString();
}

export function tournamentPaymentCallbackQuery(ctx: PublicTournamentReturnContext): string {
  return paymentCallbackQuery(ctx);
}

export { returnContextFromSearchParams };

export function returnContextFromLocation(
  location: PublicLocationRow | null | undefined,
  branchSlugFallback = 'main',
): PublicTournamentReturnContext {
  if (!location) {
    return { branchSlug: branchSlugFallback };
  }
  return {
    branchSlug: location.slug || branchSlugFallback,
    locationId: location.id,
    orgSlug: location.organizationSlug,
  };
}
