import React from 'react';
import { useLocation } from '@/context/LocationContext';
import TournamentTVDisplay from '@/components/tournaments/TournamentTVDisplay';
import { TournamentMotionProvider } from '@/components/tournaments/animations/TournamentMotionProvider';

/** Fullscreen staff TV — opened from /tournaments/tv */
export default function TournamentTVPage() {
  const { activeLocationId, activeLocation } = useLocation();

  return (
    <TournamentMotionProvider intensity="full">
      <div className="min-h-screen bg-black">
        <TournamentTVDisplay locationId={activeLocationId} branchSlug={activeLocation?.slug} />
      </div>
    </TournamentMotionProvider>
  );
}
