import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { Tag, Zap, Users, CreditCard } from 'lucide-react';
import { getStationTheme, stationPricingBadge, themeIconBgProps, themeText, type StationPhase } from '@/utils/stationTheme';
import SessionRateBadge from '@/components/station/SessionRateBadge';
import { isPrepaidSession, formatBookingSlotLabel } from '@/utils/prepaidBooking.utils';

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
  const nameText = themeText(theme, 'primary', 'font-heading text-base font-bold leading-snug break-words');
  const labelText = themeText(theme, 'muted', 'text-[10px] font-semibold uppercase tracking-widest');
  const pricingText = themeText(theme, 'muted', 'mt-1 text-xs leading-snug');
  const iconText = themeText(theme, 'primary', 'h-4 w-4');
  const iconBg = themeIconBgProps(theme);
  const nowPlayingText = themeText(theme, 'primary', 'text-xs font-medium');
  const isPaused = station.currentSession?.isPaused;
  const sessionPlayers = station.currentSession?.playerCount ?? 1;
  const hasCoupon = station.currentSession?.couponCode;
  const isStarting = phase === 'starting';
  const prepaid = station.currentSession?.prepaidBooking;
  const isPrepaid = isPrepaidSession(station.currentSession);

  const statusBadge = isPaused
    ? 'bg-amber-500/30 text-amber-100 border-amber-400/50'
    : isPrepaid
      ? 'bg-teal-500/25 text-teal-100 border-teal-400/45'
      : station.isOccupied || phase === 'live' || isStarting
        ? theme.badgeOccupied
        : theme.textPalette
          ? ''
          : theme.badgeAvailable;

  const statusBadgeStyle =
    !isPaused &&
    !isPrepaid &&
    !station.isOccupied &&
    phase !== 'live' &&
    !isStarting &&
    theme.textPalette
      ? theme.textPalette.badgeOpen
      : undefined;

  const statusLabel = isPaused
    ? 'Paused'
    : isPrepaid
      ? 'Pre-paid'
      : isStarting
        ? 'Booting'
        : station.isOccupied
          ? 'Live'
          : 'Open';

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2.5">
        <div
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg.className}`}
          style={iconBg.style}
        >
          <Icon className={iconText.className} style={iconText.style} />
          {(station.isOccupied || isStarting) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${
                  isPrepaid ? 'bg-teal-400' : 'bg-orange-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isPrepaid ? 'bg-teal-500' : 'bg-orange-500'
                }`}
              />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={nameText.className} style={nameText.style}>
                {station.name}
              </p>
              <p className={labelText.className} style={labelText.style}>
                {theme.label}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 gap-0.5 px-1.5 py-0 text-[9px] uppercase tracking-wider ${statusBadge}`}
              style={statusBadgeStyle}
            >
              {(station.isOccupied || isStarting) && !isPaused && !isPrepaid && (
                <Zap className="h-2.5 w-2.5 fill-current" />
              )}
              {isPrepaid && !isPaused && <CreditCard className="h-2.5 w-2.5" />}
              {statusLabel}
            </Badge>
          </div>
          <p className={pricingText.className} style={pricingText.style}>
            {stationPricingBadge(station)}
          </p>
        </div>
      </div>

      {station.isOccupied && station.currentSession && customerName && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-fade-in">
          <span className={nowPlayingText.className} style={nowPlayingText.style}>
            Now playing
          </span>
          <span className="max-w-full rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white break-words">
            {customerName}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums bg-white/5 ${
              theme.textPalette ? '' : `${theme.border} ${theme.accent}`
            }`}
            style={
              theme.textPalette
                ? {
                    borderColor: theme.textPalette.border,
                    color: theme.textPalette.primary,
                  }
                : undefined
            }
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
          {prepaid && (
            <span className="inline-flex items-center gap-1 rounded-md border border-teal-400/50 bg-teal-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-50 ring-1 ring-teal-400/35 shadow-[0_0_12px_rgba(45,212,191,0.25)]">
              <CreditCard className="h-3 w-3 shrink-0" />
              Online pre-paid · ₹{prepaid.paidAmount} · {formatBookingSlotLabel(prepaid.slotStartTime, prepaid.slotEndTime)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StationInfo;
