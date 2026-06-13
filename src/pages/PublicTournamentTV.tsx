import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPublicLocation } from '@/utils/publicLocationResolve';
import { returnContextFromSearchParams } from '@/utils/publicTournamentUrl';
import TournamentTVDisplay from '@/components/tournaments/TournamentTVDisplay';
import { usePublicBookingBrand } from '@/hooks/usePublicBookingBrand';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const PublicTournamentTV = ({ branchSlug = 'main' }: { branchSlug?: string }) => {
  const [searchParams] = useSearchParams();
  const ctx = returnContextFromSearchParams(searchParams, { branchSlug });
  const [locationId, setLocationId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const row = await fetchPublicLocation({
          branchSlug: ctx.branchSlug ?? branchSlug,
          locationId: ctx.locationId,
          orgSlug: ctx.orgSlug ?? undefined,
        });
        if (!cancelled) setLocationId(row?.id ?? null);
      } catch {
        if (!cancelled) setLocationId(null);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.branchSlug, ctx.locationId, ctx.orgSlug, branchSlug]);

  usePublicBookingBrand(locationId);

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b12] via-black to-[#0a1628]">
      <TournamentTVDisplay locationId={locationId} publicMode />
    </div>
  );
};

export default PublicTournamentTV;
