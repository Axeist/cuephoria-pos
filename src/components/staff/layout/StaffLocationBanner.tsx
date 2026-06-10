import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Settings, Users } from 'lucide-react';
import type { VenueLocation } from '@/context/LocationContext';

type Props = {
  location: VenueLocation | null;
  organizationName?: string | null;
};

const StaffLocationBanner: React.FC<Props> = ({ location, organizationName }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-2.5 rounded-xl border bg-purple-500/8 border-purple-400/25 text-purple-200">
    <Users className="h-4 w-4 flex-shrink-0 text-purple-300" />
    <span className="text-sm">
      {organizationName ? (
        <>
          <strong>{organizationName}</strong>
          {' · '}
        </>
      ) : null}
      Showing staff for{' '}
      <strong className="inline-flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        {location?.name ?? 'this branch'}
      </strong>
      . Add logins in <strong>Settings → Team</strong> and assign branch access there.
    </span>
    <Link
      to="/settings?tab=team"
      className="sm:ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-purple-100 hover:text-white underline-offset-2 hover:underline"
    >
      <Settings className="h-3.5 w-3.5" />
      Open Settings
    </Link>
  </div>
);

export default StaffLocationBanner;
