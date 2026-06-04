import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { Tag, Zap, Users } from 'lucide-react';
import { getStationTheme, stationPricingBadge, type StationPhase } from '@/utils/stationTheme';
import SessionRateBadge from '@/components/station/SessionRateBadge';

interface StationInfoProps {
  station: Station;
  customerName?: string;
  phase?: StationPhase;
}

const StationInfo: React.FC<StationInfoProps> = ({
  station,
  customerName,
  phase = 'idle',
}) => {
  const theme = getStationTheme(station);
  const Icon = theme.icon;
  const isPaused = station.currentSession?.isPaused;
  const sessionPlayers = station.currentSession?.playerCount ?? 1;
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
        : 'Open';

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2.5">
        <div
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${theme.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${theme.accent}`} />
          {(station.isOccupied || isStarting) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={`font-heading text-base font-bold leading-snug break-words ${theme.accent}`}>
                {station.name}
              </p>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${theme.accentMuted}`}>
                {theme.label}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 gap-0.5 px-1.5 py-0 text-[9px] uppercase tracking-wider ${statusBadge}`}
            >
              {(station.isOccupied || isStarting) && !isPaused && (
                <Zap className="h-2.5 w-2.5 fill-current" />
              )}
              {statusLabel}
            </Badge>
          </div>
          <p className={`mt-1 text-xs leading-snug ${theme.accentMuted}`}>
            {stationPricingBadge(station)}
          </p>
        </div>
      </div>

      {station.isOccupied && station.currentSession && customerName && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-fade-in">
          <span className={`text-xs font-medium ${theme.accent}`}>Now playing</span>
          <span className="max-w-full rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white break-words">
            {customerName}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${theme.border} bg-white/5 ${theme.accent}`}
          >
            <Users className="h-3 w-3 shrink-0" />
            {sessionPlayers}p
          </span>
          <SessionRateBadge station={station} session={station.currentSession} theme={theme} />
          {hasCoupon && (
            <span className="inline-flex items-center gap-0.5 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-300 ring-1 ring-orange-500/30">
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
