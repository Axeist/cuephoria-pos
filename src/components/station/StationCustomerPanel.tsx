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
  Users,
} from 'lucide-react';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';
import { formatPlayTimeMinutes } from '@/utils/formatPlayTime';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import { stationPricingBadge } from '@/utils/stationTheme';
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
      <div className="flex h-full min-h-[120px] flex-col justify-between rounded-xl border border-white/8 bg-black/35 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Station intel
        </div>
        <div className="space-y-3">
          <p className={`font-heading text-lg font-bold ${theme.accent}`}>{station.name}</p>
          <p className="text-sm text-muted-foreground">{stationPricingBadge(station)}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max players</p>
              <p className="font-semibold tabular-nums">{station.maxPlayers ?? 1}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Slot</p>
              <p className="font-semibold tabular-nums">{station.slotDuration ?? 60} min</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/80">Ready — start a session to load player intel</p>
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

  return (
    <div className="flex h-full min-h-[120px] flex-col rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ring-2 ring-white/10 ${theme.iconBg}`}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg font-bold text-white">{customer.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {customer.phone && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
            <Badge
              variant="outline"
              className={`h-5 gap-0.5 text-[10px] ${
                isMember
                  ? 'border-green-500/40 bg-green-500/15 text-green-300'
                  : 'border-white/10 text-muted-foreground'
              }`}
            >
              {isMember ? <UserCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {membershipText}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-2 text-center">
          <Clock className="mx-auto mb-0.5 h-3.5 w-3.5 text-blue-400" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Play time</p>
          <p className="text-sm font-bold tabular-nums text-blue-300">
            {formatPlayTimeMinutes(customer.totalPlayTime)}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-2 text-center">
          <CreditCard className="mx-auto mb-0.5 h-3.5 w-3.5 text-emerald-400" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lifetime</p>
          <p className="text-sm font-bold text-emerald-300">
            <CurrencyDisplay amount={customer.totalSpent} />
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-2 text-center">
          <Star className="mx-auto mb-0.5 h-3.5 w-3.5 text-amber-400" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Points</p>
          <p className="text-sm font-bold tabular-nums text-amber-300">{customer.loyaltyPoints}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <History className="h-3 w-3" />
          Recent games
        </div>
        {intelLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading history…</p>
        ) : recentSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No prior sessions on record</p>
        ) : (
          <ul className="space-y-1">
            {recentSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <Gamepad2 className={`h-3 w-3 shrink-0 ${theme.accent}`} />
                  <span className="truncate text-foreground/90">{s.stationName}</span>
                  <span className="shrink-0 text-muted-foreground">
                    · {stationTypeLabel(s.stationType)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatShortDate(s.endedAt)} · {formatPlayTimeMinutes(s.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StationCustomerPanel;
