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
      <div className="flex flex-col gap-4 rounded-xl border border-white/8 bg-black/35 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Station intel
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{stationPricingBadge(station)}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max players</p>
            <p className="mt-0.5 font-semibold tabular-nums">{station.maxPlayers ?? 1}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Slot</p>
            <p className="mt-0.5 font-semibold tabular-nums">{station.slotDuration ?? 60} min</p>
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
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ring-2 ring-white/10 ${theme.iconBg}`}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-heading text-lg font-bold leading-snug break-words text-white">
            {customer.name}
          </p>
          {customer.phone && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {customer.phone}
            </p>
          )}
          <Badge
            variant="outline"
            className={`h-6 gap-1 px-2 text-[11px] ${
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

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg border border-white/8 bg-white/5 px-2 py-2.5 text-center">
          <Clock className="mx-auto mb-1 h-4 w-4 text-blue-400" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Play time</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-blue-300">
            {formatPlayTimeMinutes(customer.totalPlayTime)}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/5 px-2 py-2.5 text-center">
          <CreditCard className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lifetime</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-300">
            <CurrencyDisplay amount={customer.totalSpent} />
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/5 px-2 py-2.5 text-center">
          <Star className="mx-auto mb-1 h-4 w-4 text-amber-400" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Points</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-amber-300">{customer.loyaltyPoints}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <History className="h-3 w-3" />
          Recent games
        </div>
        {intelLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading history…</p>
        ) : recentSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No prior sessions on record</p>
        ) : (
          <ul className="space-y-1.5">
            {recentSessions.map((s) => (
              <li
                key={s.id}
                className="rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2 text-xs"
              >
                <div className="flex items-start gap-1.5">
                  <Gamepad2 className={`mt-0.5 h-3 w-3 shrink-0 ${theme.accent}`} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-foreground/90">{s.stationName}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {stationTypeLabel(s.stationType)} · {formatShortDate(s.endedAt)} ·{' '}
                      {formatPlayTimeMinutes(s.durationMinutes)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StationCustomerPanel;
