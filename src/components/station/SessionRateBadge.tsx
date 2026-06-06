import React from 'react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { CreditCard } from 'lucide-react';
import { formatLiveSessionRate } from '@/utils/stationPricing';
import { isPrepaidSession } from '@/utils/prepaidBooking.utils';
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
  const prepaid = session.prepaidBooking;

  if (isPrepaidSession(session) && prepaid) {
    return (
      <span
        className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded border border-teal-400/45 bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-teal-100 ring-1 ring-teal-400/30 ${className}`}
      >
        <CreditCard className="h-2.5 w-2.5 shrink-0" />
        <span>Pre-paid</span>
        <CurrencyDisplay amount={prepaid.paidAmount} className="text-inherit font-bold" />
        <span className="font-medium opacity-90">· {prepaid.durationMinutes}m</span>
      </span>
    );
  }

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
