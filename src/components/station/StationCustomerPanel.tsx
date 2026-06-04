import React from 'react';
import { Customer, Station } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Badge } from '@/components/ui/badge';
import {
  User,
  UserCheck,
  Phone,
  Clock,
  Star,
  CreditCard,
  Gamepad2,
  History,
} from 'lucide-react';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';
import { formatPlayTimeMinutes } from '@/utils/formatPlayTime';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import type { CustomerRecentSession } from '@/hooks/stations/useStationCustomerIntel';
import type { StationTheme } from '@/utils/stationTheme';

interface StationCustomerPanelProps {
  station: Station;
  customer: Customer | null | undefined;
  recentSessions?: CustomerRecentSession[];
  intelLoading?: boolean;
  theme: StationTheme;
  /** Stretch to fill card body height on live sessions */
  expanded?: boolean;
}

const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const StationCustomerPanel: React.FC<StationCustomerPanelProps> = ({
  station,
  customer,
  recentSessions = [],
  intelLoading,
  theme,
  expanded = false,
}) => {
  if (!station.isOccupied || !customer) {
    return (
      <div
        className={`rounded-lg border border-white/8 bg-black/30 px-3 py-2.5 ${
          expanded ? 'flex min-h-[130px] flex-col justify-center' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Max {station.maxPlayers ?? 1}p</span>
          <span>·</span>
          <span>{station.slotDuration ?? 60} min slots</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          Start a session to load player intel
        </p>
      </div>
    );
  }

  const isMember = isMembershipActive(customer);
  const membershipText = customer.isMember ? getMembershipBadgeText(customer) : 'Guest';
  const initials = customer.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const recent = recentSessions.slice(0, expanded ? 3 : 2);

  const statBoxClass = expanded
    ? 'flex flex-1 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-2 py-3 min-h-[72px]'
    : 'rounded border border-white/8 bg-white/5 px-1.5 py-1 text-center';

  const statLabelClass = expanded
    ? 'mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
    : 'mt-0.5 text-[9px] uppercase text-muted-foreground';

  const statValueClass = expanded ? 'text-base font-bold tabular-nums' : 'text-xs font-bold tabular-nums';

  return (
    <div
      className={`rounded-lg border border-white/10 bg-black/35 ${
        expanded
          ? 'flex h-full min-h-[130px] flex-col px-3 py-3'
          : 'px-3 py-2.5'
      }`}
    >
      <div className="flex items-start gap-2.5 shrink-0">
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg font-bold ring-1 ring-white/10 ${theme.iconBg} ${
            expanded ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
          }`}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={`font-semibold leading-snug break-words text-white ${
                expanded ? 'text-base' : 'text-sm'
              }`}
            >
              {customer.name}
            </p>
            <Badge
              variant="outline"
              className={`gap-0.5 ${
                expanded ? 'h-6 px-2 text-[11px]' : 'h-5 px-1.5 text-[10px]'
              } ${
                isMember
                  ? 'border-green-500/40 bg-green-500/15 text-green-300'
                  : 'border-white/10 text-muted-foreground'
              }`}
            >
              {isMember ? <UserCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {membershipText}
            </Badge>
          </div>
          {customer.phone && (
            <p
              className={`mt-0.5 flex items-center gap-1.5 text-muted-foreground ${
                expanded ? 'text-xs' : 'text-[11px]'
              }`}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {customer.phone}
            </p>
          )}
        </div>
      </div>

      <div className={`${expanded ? 'mt-3 flex flex-1 flex-col justify-end gap-3' : 'mt-2'}`}>
        <div className={`grid grid-cols-3 ${expanded ? 'gap-2' : 'gap-1.5'}`}>
          <div className={statBoxClass}>
            <Clock className={`text-blue-400 ${expanded ? 'h-5 w-5' : 'mx-auto h-3 w-3'}`} />
            <p className={statLabelClass}>Play time</p>
            <p className={`${statValueClass} text-blue-300`}>
              {formatPlayTimeMinutes(customer.totalPlayTime)}
            </p>
          </div>
          <div className={statBoxClass}>
            <CreditCard className={`text-emerald-400 ${expanded ? 'h-5 w-5' : 'mx-auto h-3 w-3'}`} />
            <p className={statLabelClass}>Lifetime</p>
            <p className={`${statValueClass} text-emerald-300`}>
              <CurrencyDisplay amount={customer.totalSpent} />
            </p>
          </div>
          <div className={statBoxClass}>
            <Star className={`text-amber-400 ${expanded ? 'h-5 w-5' : 'mx-auto h-3 w-3'}`} />
            <p className={statLabelClass}>Points</p>
            <p className={`${statValueClass} text-amber-300`}>{customer.loyaltyPoints}</p>
          </div>
        </div>

        {(intelLoading || recent.length > 0) && (
          <div className={`${expanded ? '' : 'border-t border-white/5 pt-2'}`}>
            <div
              className={`mb-1.5 flex items-center gap-1.5 font-semibold uppercase tracking-widest text-muted-foreground ${
                expanded ? 'text-[10px]' : 'text-[9px]'
              }`}
            >
              <History className="h-3 w-3" />
              Recent games
            </div>
            {intelLoading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Loading history…</p>
            ) : (
              <ul className={`space-y-1.5 ${expanded ? '' : 'space-y-1'}`}>
                {recent.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-start gap-1.5 rounded-md bg-white/[0.03] ${
                      expanded ? 'px-2 py-1.5 text-xs' : 'text-[11px]'
                    }`}
                  >
                    <Gamepad2 className={`mt-0.5 shrink-0 ${theme.accent} ${expanded ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'}`} />
                    <span className="min-w-0 break-words text-foreground/90">
                      {s.stationName}
                      <span className="text-muted-foreground">
                        {' '}
                        · {formatShortDate(s.endedAt)} · {formatPlayTimeMinutes(s.durationMinutes)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StationCustomerPanel;
