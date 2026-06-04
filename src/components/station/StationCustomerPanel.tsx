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
}

const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const StationCustomerPanel: React.FC<StationCustomerPanelProps> = ({
  station,
  customer,
  recentSessions = [],
  intelLoading,
  theme,
}) => {
  if (!station.isOccupied || !customer) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2.5">
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
  const recent = recentSessions.slice(0, 2);

  return (
    <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ring-white/10 ${theme.iconBg}`}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold leading-snug break-words text-white">{customer.name}</p>
            <Badge
              variant="outline"
              className={`h-5 gap-0.5 px-1.5 text-[10px] ${
                isMember
                  ? 'border-green-500/40 bg-green-500/15 text-green-300'
                  : 'border-white/10 text-muted-foreground'
              }`}
            >
              {isMember ? <UserCheck className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
              {membershipText}
            </Badge>
          </div>
          {customer.phone && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              {customer.phone}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className="rounded border border-white/8 bg-white/5 px-1.5 py-1 text-center">
          <Clock className="mx-auto h-3 w-3 text-blue-400" />
          <p className="mt-0.5 text-[9px] uppercase text-muted-foreground">Play</p>
          <p className="text-xs font-bold tabular-nums text-blue-300">
            {formatPlayTimeMinutes(customer.totalPlayTime)}
          </p>
        </div>
        <div className="rounded border border-white/8 bg-white/5 px-1.5 py-1 text-center">
          <CreditCard className="mx-auto h-3 w-3 text-emerald-400" />
          <p className="mt-0.5 text-[9px] uppercase text-muted-foreground">Spent</p>
          <p className="text-xs font-bold text-emerald-300">
            <CurrencyDisplay amount={customer.totalSpent} />
          </p>
        </div>
        <div className="rounded border border-white/8 bg-white/5 px-1.5 py-1 text-center">
          <Star className="mx-auto h-3 w-3 text-amber-400" />
          <p className="mt-0.5 text-[9px] uppercase text-muted-foreground">Pts</p>
          <p className="text-xs font-bold tabular-nums text-amber-300">{customer.loyaltyPoints}</p>
        </div>
      </div>

      {(intelLoading || recent.length > 0) && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            <History className="h-2.5 w-2.5" />
            Recent
          </div>
          {intelLoading ? (
            <p className="text-[11px] text-muted-foreground animate-pulse">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((s) => (
                <li key={s.id} className="flex items-start gap-1 text-[11px]">
                  <Gamepad2 className={`mt-0.5 h-2.5 w-2.5 shrink-0 ${theme.accent}`} />
                  <span className="min-w-0 break-words text-foreground/85">
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
  );
};

export default StationCustomerPanel;
