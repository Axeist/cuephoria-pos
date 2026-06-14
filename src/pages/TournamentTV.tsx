import React from 'react';
import { useLocation } from '@/context/LocationContext';
import TournamentTVDisplay from '@/components/tournaments/TournamentTVDisplay';

/** Fullscreen staff TV — opened from /tournaments/tv */
export default function TournamentTVPage() {
  const { activeLocationId, activeLocation } = useLocation();

  return (
    <div className="min-h-screen bg-[#030712]">
      <TournamentTVDisplay locationId={activeLocationId} branchSlug={activeLocation?.slug} />
    </div>
  );
}
