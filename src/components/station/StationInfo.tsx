import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { UserCheck, User, Tag } from 'lucide-react';
import { Customer } from '@/types/pos.types';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';
import { getStationTheme, stationPricingBadge } from '@/utils/stationTheme';

interface StationInfoProps {
  station: Station;
  customerName: string;
  customerData?: Customer | null;
}

const StationInfo: React.FC<StationInfoProps> = ({ station, customerName, customerData }) => {
  const theme = getStationTheme(station);
  const Icon = theme.icon;
  const isMember = customerData ? isMembershipActive(customerData) : false;
  const membershipText =
    customerData && customerData.isMember ? getMembershipBadgeText(customerData) : 'Guest';
  const isPaused = station.currentSession?.isPaused;
  const sessionPlayers = station.currentSession?.playerCount;
  const hasCoupon = station.currentSession?.couponCode;

  const statusBadge = isPaused
    ? 'bg-amber-500/25 text-amber-200 border-amber-400/40'
    : station.isOccupied
      ? theme.badgeOccupied
      : theme.badgeAvailable;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${theme.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${theme.accent}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate font-heading text-sm font-bold leading-tight ${theme.accent}`}>
                {station.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{theme.label}</p>
            </div>
            <Badge variant="outline" className={`shrink-0 text-[10px] uppercase tracking-wide ${statusBadge}`}>
              {isPaused ? 'Paused' : station.isOccupied ? 'Live' : 'Open'}
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">{stationPricingBadge(station)}</p>

      {station.isOccupied && station.currentSession && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-foreground/90 truncate max-w-[140px]">
            {customerName}
          </span>
          {sessionPlayers != null && sessionPlayers > 1 && (
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-muted-foreground">
              {sessionPlayers} players
            </span>
          )}
          <Badge
            variant="outline"
            className={`h-5 gap-0.5 px-1.5 text-[10px] ${
              isMember
                ? 'border-green-500/40 bg-green-500/10 text-green-300'
                : 'border-white/10 bg-white/5 text-muted-foreground'
            }`}
          >
            {isMember ? <UserCheck className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
            {membershipText}
          </Badge>
          {hasCoupon && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-orange-300">
              <Tag className="h-2.5 w-2.5" />
              {hasCoupon}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StationInfo;
