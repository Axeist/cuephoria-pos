import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { Tag, Zap } from 'lucide-react';
import { getStationTheme, stationPricingBadge, type StationPhase } from '@/utils/stationTheme';

interface StationInfoProps {
  station: Station;
  customerName?: string;
  phase?: StationPhase;
  compact?: boolean;
}

const StationInfo: React.FC<StationInfoProps> = ({
  station,
  customerName,
  phase = 'idle',
  compact = false,
}) => {
  const theme = getStationTheme(station);
  const Icon = theme.icon;
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
        : 'Open';

  if (compact) {
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${theme.iconBg}`}
          >
            <Icon className={`h-4 w-4 ${theme.accent}`} />
            {(station.isOccupied || isStarting) && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-1 ring-black" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`truncate font-heading text-sm font-bold leading-tight ${theme.accent}`}>
              {station.name}
            </p>
            <p className={`truncate text-[9px] font-semibold uppercase tracking-wider ${theme.accentMuted}`}>
              {theme.label}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 gap-0.5 px-1.5 py-0 text-[8px] uppercase tracking-wider ${statusBadge}`}
          >
            {(station.isOccupied || isStarting) && !isPaused && (
              <Zap className="h-2 w-2 fill-current" />
            )}
            {statusLabel}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-start gap-3">
        <div
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 ${theme.iconBg}`}
        >
          <Icon className={`h-7 w-7 ${theme.accent}`} />
          {(station.isOccupied || isStarting) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate font-heading text-xl font-bold leading-tight ${theme.accent}`}>
                {station.name}
              </p>
              <p className={`text-xs font-semibold uppercase tracking-widest ${theme.accentMuted}`}>
                {theme.label}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge}`}
            >
              {(station.isOccupied || isStarting) && !isPaused && (
                <Zap className="h-3 w-3 fill-current" />
              )}
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {!compact && (
        <p
          className={`rounded-lg border border-white/8 bg-black/25 px-3 py-1.5 text-sm leading-snug ${theme.accentMuted}`}
        >
          {stationPricingBadge(station)}
        </p>
      )}

      {station.isOccupied && station.currentSession && customerName && (
        <div className="flex flex-wrap items-center gap-2 text-sm animate-fade-in">
          <span className={`font-medium ${theme.accent}`}>Now playing</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 font-semibold text-white">
            {customerName}
          </span>
          {sessionPlayers != null && sessionPlayers > 1 && (
            <span className="rounded-md border border-white/8 bg-white/5 px-2 py-0.5 text-muted-foreground">
              {sessionPlayers} players
            </span>
          )}
          {hasCoupon && (
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-2 py-0.5 text-orange-300 ring-1 ring-orange-500/30">
              <Tag className="h-3 w-3" />
              {hasCoupon}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StationInfo;
