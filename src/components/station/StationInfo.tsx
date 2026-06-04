import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { UserCheck, User, Tag, Zap } from 'lucide-react';
import { Customer } from '@/types/pos.types';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';
import { getStationTheme, stationPricingBadge, type StationPhase } from '@/utils/stationTheme';

interface StationInfoProps {
  station: Station;
  customerName: string;
  customerData?: Customer | null;
  phase?: StationPhase;
}

const StationInfo: React.FC<StationInfoProps> = ({
  station,
  customerName,
  customerData,
  phase = 'idle',
}) => {
  const theme = getStationTheme(station);
  const Icon = theme.icon;
  const isMember = customerData ? isMembershipActive(customerData) : false;
  const membershipText =
    customerData && customerData.isMember ? getMembershipBadgeText(customerData) : 'Guest';
  const isPaused = station.currentSession?.isPaused;
  const sessionPlayers = station.currentSession?.playerCount;
  const hasCoupon = station.currentSession?.couponCode;
  const isStarting = phase === 'starting';

  const statusBadge = isPaused
    ? 'bg-amber-500/30 text-amber-100 border-amber-400/50'
    : station.isOccupied || phase === 'live' || isStarting
      ? theme.badgeOccupied
      : theme.badgeAvailable;

  const statusLabel = isPaused
    ? 'Paused'
    : isStarting
      ? 'Booting'
      : station.isOccupied
        ? 'Live'
        : 'Ready';

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-start gap-2.5">
        <div
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 ${theme.iconBg}`}
        >
          <Icon className={`h-[18px] w-[18px] ${theme.accent}`} />
          {(station.isOccupied || isStarting) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p
                className={`truncate font-heading text-sm font-bold leading-tight bg-clip-text ${theme.accent}`}
              >
                {station.name}
              </p>
              <p className={`text-[10px] font-medium uppercase tracking-wider ${theme.accentMuted}`}>
                {theme.label}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 gap-0.5 text-[9px] uppercase tracking-wider ${statusBadge}`}
            >
              {(station.isOccupied || isStarting) && !isPaused && (
                <Zap className="h-2.5 w-2.5 fill-current" />
              )}
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      <p
        className={`rounded-md border border-white/5 bg-black/20 px-2 py-0.5 text-[10px] leading-snug ${theme.accentMuted}`}
      >
        {stationPricingBadge(station)}
      </p>

      {station.isOccupied && station.currentSession && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] animate-fade-in">
          <span
            className={`rounded-md px-2 py-0.5 truncate max-w-[130px] border border-white/10 bg-white/5 ${theme.accent}`}
          >
            {customerName}
          </span>
          {sessionPlayers != null && sessionPlayers > 1 && (
            <span className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-muted-foreground">
              {sessionPlayers}p
            </span>
          )}
          <Badge
            variant="outline"
            className={`h-4 gap-0.5 px-1 text-[9px] ${
              isMember
                ? 'border-green-500/40 bg-green-500/15 text-green-300'
                : 'border-white/10 bg-white/5 text-muted-foreground'
            }`}
          >
            {isMember ? <UserCheck className="h-2 w-2" /> : <User className="h-2 w-2" />}
            {membershipText}
          </Badge>
          {hasCoupon && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/20 px-1.5 py-0.5 text-orange-300 ring-1 ring-orange-500/30">
              <Tag className="h-2 w-2" />
              {hasCoupon}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StationInfo;
