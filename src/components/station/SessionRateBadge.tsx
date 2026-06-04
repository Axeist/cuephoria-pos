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
      className={`inline-flex max-w-full flex-wrap items-center gap-x-0.5 gap-y-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${theme.border} bg-cuephoria-orange/15 text-cuephoria-orange ${className}`}
    >
      <CurrencyDisplay amount={totalRate} className="text-inherit font-bold" />
      <span className="font-semibold opacity-95">{suffix}</span>
      {detail && <span className="font-medium opacity-85">· {detail}</span>}
    </span>
  );
};

export default SessionRateBadge;
