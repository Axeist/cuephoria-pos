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
    <div className="min-w-0 space-y-3">
      <div className="flex items-start gap-3">
        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${theme.iconBg}`}
        >
          <Icon className={`h-6 w-6 ${theme.accent}`} />
          {(station.isOccupied || isStarting) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`font-heading text-lg font-bold leading-snug break-words sm:text-xl ${theme.accent}`}
              >
                {station.name}
              </p>
              <p className={`mt-0.5 text-xs font-semibold uppercase tracking-widest ${theme.accentMuted}`}>
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
          className={`rounded-lg border border-white/8 bg-black/25 px-3 py-2 text-sm leading-relaxed ${theme.accentMuted}`}
        >
          {stationPricingBadge(station)}
        </p>
      )}

      {station.isOccupied && station.currentSession && customerName && (
        <div className="space-y-2.5 rounded-lg border border-white/8 bg-black/20 p-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`font-medium ${theme.accent}`}>Now playing</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 font-semibold text-white break-words">
              {customerName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold tabular-nums ${theme.border} bg-white/5 ${theme.accent}`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              {sessionPlayers} {sessionPlayers === 1 ? 'player' : 'players'}
            </span>
            <SessionRateBadge station={station} session={station.currentSession} theme={theme} />
            {hasCoupon && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-2 py-1 text-xs text-orange-300 ring-1 ring-orange-500/30">
                <Tag className="h-3 w-3" />
                {hasCoupon}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StationInfo;
