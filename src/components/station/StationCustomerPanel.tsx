import React from 'react';
import { Customer, Station } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Badge } from '@/components/ui/badge';
import {
  User,
  UserCheck,
  Clock,
  Star,
  CreditCard,
  Gamepad2,
  History,
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
  variant?: 'full' | 'tile';
}

const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const StationCustomerPanel: React.FC<StationCustomerPanelProps> = ({
  station,
  customer,
  recentSessions = [],
  intelLoading,
  theme,
  variant = 'full',
}) => {
  const isTile = variant === 'tile';

  if (!station.isOccupied || !customer) {
    if (isTile) {
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 rounded-lg border border-white/8 bg-black/30 px-2 py-2">
          <p className={`truncate text-sm font-bold ${theme.accent}`}>{stationPricingBadge(station)}</p>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>{station.maxPlayers ?? 1}p max</span>
            <span>·</span>
            <span>{station.slotDuration ?? 60}m slots</span>
          </div>
          <p className="text-[10px] text-muted-foreground/70">Tap Start to begin</p>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-[120px] flex-col justify-between rounded-xl border border-white/8 bg-black/35 p-4 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">{stationPricingBadge(station)}</p>
        <p className="text-xs text-muted-foreground/80">Ready for walk-in</p>
      </div>
    );
  }

  const isMember = isMembershipActive(customer);
  const membershipText = customer.isMember ? getMembershipBadgeText(customer) : 'Guest';
  const lastGame = recentSessions[0];

  if (isTile) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden rounded-lg border border-white/8 bg-black/35 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${theme.iconBg}`}
          >
            {customer.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{customer.name}</p>
            <Badge
              variant="outline"
              className={`mt-0.5 h-4 gap-0.5 px-1 text-[9px] ${
                isMember
                  ? 'border-green-500/40 bg-green-500/15 text-green-300'
                  : 'border-white/10 text-muted-foreground'
              }`}
            >
              {isMember ? <UserCheck className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
              {membershipText}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded border border-white/6 bg-white/5 px-1 py-1">
            <Clock className="mx-auto h-2.5 w-2.5 text-blue-400" />
            <p className="text-[9px] font-bold tabular-nums text-blue-300">
              {formatPlayTimeMinutes(customer.totalPlayTime)}
            </p>
          </div>
          <div className="rounded border border-white/6 bg-white/5 px-1 py-1">
            <CreditCard className="mx-auto h-2.5 w-2.5 text-emerald-400" />
            <p className="text-[9px] font-bold text-emerald-300">
              <CurrencyDisplay amount={customer.totalSpent} />
            </p>
          </div>
          <div className="rounded border border-white/6 bg-white/5 px-1 py-1">
            <Star className="mx-auto h-2.5 w-2.5 text-amber-400" />
            <p className="text-[9px] font-bold tabular-nums text-amber-300">{customer.loyaltyPoints}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            <History className="h-2.5 w-2.5" />
            Last game
          </div>
          {intelLoading ? (
            <p className="text-[10px] text-muted-foreground animate-pulse">Loading…</p>
          ) : lastGame ? (
            <p className="truncate text-[10px] text-foreground/85">
              <Gamepad2 className="mr-0.5 inline h-2.5 w-2.5" />
              {lastGame.stationName} · {formatShortDate(lastGame.endedAt)} ·{' '}
              {formatPlayTimeMinutes(lastGame.durationMinutes)}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">First visit</p>
          )}
          {recentSessions.length > 1 && (
            <p className="truncate text-[9px] text-muted-foreground/80">
              +{recentSessions.length - 1} more ·{' '}
              {recentSessions
                .slice(1, 3)
                .map((s) => stationTypeLabel(s.stationType))
                .join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // full variant (legacy / unused on tile page)
  return (
    <div className="flex h-full min-h-[120px] flex-col rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
      <p className="truncate font-heading text-lg font-bold text-white">{customer.name}</p>
      <p className="text-sm text-muted-foreground">{formatPlayTimeMinutes(customer.totalPlayTime)} played</p>
    </div>
  );
};

export default StationCustomerPanel;
