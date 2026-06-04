import React from 'react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { formatLiveSessionRate } from '@/utils/stationPricing';
import type { Session, Station } from '@/types/pos.types';
import type { StationTheme } from '@/utils/stationTheme';

interface SessionRateBadgeProps {
  station: Station;
  session: Session;
  theme: StationTheme;
  className?: string;
}

/** Prominent locked-in session rate badge (matches player count styling). */
const SessionRateBadge: React.FC<SessionRateBadgeProps> = ({
  station,
  session,
  theme,
  className = '',
}) => {
  const { totalRate, suffix, detail } = formatLiveSessionRate(station, session);

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md border px-2 py-0.5 text-[10px] font-bold tabular-nums sm:text-xs ${theme.border} bg-cuephoria-orange/15 text-cuephoria-orange shadow-[0_0_12px_rgba(249,115,22,0.12)] ${className}`}
    >
      <CurrencyDisplay amount={totalRate} className="text-inherit font-bold" />
      <span className="font-semibold opacity-95">{suffix}</span>
      {detail && <span className="font-medium opacity-85">· {detail}</span>}
    </span>
  );
};

export default SessionRateBadge;
