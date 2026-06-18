import React from 'react';
import {
  Activity,
  Clock,
  CreditCard,
  Flame,
  Radio,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type CalendarBookingInput,
  type CalendarDayInsights,
  formatCalendarTime,
  getStationAccent,
} from './bookingCalendar.utils';

interface BookingCalendarInsightsPanelProps {
  insights: CalendarDayInsights;
  onSelectBooking: (booking: CalendarBookingInput) => void;
}

export const BookingCalendarInsightsPanel: React.FC<BookingCalendarInsightsPanelProps> = ({
  insights,
  onSelectBooking,
}) => {
  const {
    stationUtilization,
    peakHours,
    busiestHour,
    topStation,
    activeNow,
    upcoming,
    paidOnlineCount,
    payAtVenueCount,
    avgDurationMin,
    dayUtilizationPct,
  } = insights;

  const paymentTotal = paidOnlineCount + payAtVenueCount;
  const paidPct = paymentTotal ? Math.round((paidOnlineCount / paymentTotal) * 100) : 0;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-white/8 bg-gradient-to-b from-[#0a0814]/98 to-[#07060c] p-4 xl:w-[340px] xl:border-l xl:border-t-0 xl:overflow-y-auto xl:max-h-[min(72vh,820px)]">
      {/* Live pulse */}
      <div className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-950/40 to-[#0a0812] p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
            Live now
          </p>
          <Badge className="ml-auto border-rose-400/30 bg-rose-500/15 text-[10px] text-rose-200">
            {activeNow.length} active
          </Badge>
        </div>
        {activeNow.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No sessions in progress right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {activeNow.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelectBooking(b)}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:border-rose-400/30 hover:bg-rose-500/10"
                >
                  <p className="truncate text-sm font-semibold text-white">{b.customer.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-400">{b.station?.name}</p>
                  <p className="mt-1 text-[10px] text-rose-300/90">
                    Until {formatCalendarTime(b.end_time)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Day utilization */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Floor utilization</p>
          <span className="ml-auto text-lg font-bold tabular-nums text-cyan-300">{dayUtilizationPct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 transition-all duration-700"
            style={{ width: `${dayUtilizationPct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-black/25 px-2 py-2">
            <p className="text-[10px] text-zinc-500">Avg slot</p>
            <p className="text-sm font-bold text-white">{avgDurationMin}m</p>
          </div>
          <div className="rounded-lg bg-black/25 px-2 py-2">
            <p className="text-[10px] text-zinc-500">Peak hour</p>
            <p className="text-sm font-bold text-amber-200 truncate">
              {busiestHour ? busiestHour.label : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Station utilization */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">By station</p>
        </div>
        <ul className="space-y-3">
          {stationUtilization.map((st) => {
            const accent = getStationAccent(st.type);
            return (
              <li key={st.key}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', accent.dot)} />
                    <p className="truncate text-xs font-medium text-zinc-200">{st.name}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-400">
                    {st.utilizationPct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r', {
                      'from-blue-500 to-indigo-500': st.type === 'ps5',
                      'from-violet-500 to-purple-500': st.type === 'vr',
                      'from-emerald-500 to-teal-500': st.type === '8ball',
                      'from-cyan-500 to-slate-500':
                        st.type !== 'ps5' && st.type !== 'vr' && st.type !== '8ball',
                    })}
                    style={{ width: `${st.utilizationPct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">
                  {st.bookingCount} booking{st.bookingCount === 1 ? '' : 's'} · {st.bookedMinutes}m booked
                </p>
              </li>
            );
          })}
        </ul>
        {topStation && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-200/80">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            Busiest: <span className="font-semibold text-amber-100">{topStation.name}</span>
          </p>
        )}
      </div>

      {/* Peak hours heatmap */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Demand by hour</p>
        </div>
        <div className="flex items-end gap-1 h-20">
          {peakHours.map((h) => (
            <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full min-h-[4px] rounded-sm transition-all',
                  h.count > 0
                    ? 'bg-gradient-to-t from-indigo-600 to-violet-400'
                    : 'bg-white/5',
                )}
                style={{ height: `${Math.max(8, h.pct)}%` }}
                title={`${h.label}: ${h.count} starts`}
              />
              {h.count > 0 && (
                <span className="text-[9px] font-bold text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {h.count}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[9px] text-zinc-600">
          <span>{peakHours[0]?.label}</span>
          <span>{peakHours[peakHours.length - 1]?.label}</span>
        </div>
      </div>

      {/* Payment mix */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payment mix</p>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
            style={{ width: `${paidPct}%` }}
          />
          <div className="flex-1 bg-amber-500/40" />
        </div>
        <div className="mt-2 flex justify-between text-[11px]">
          <span className="text-emerald-300">{paidOnlineCount} paid online</span>
          <span className="text-amber-300/80">{payAtVenueCount} at venue</span>
        </div>
      </div>

      {/* Upcoming */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Up next</p>
          <Radio className="ml-auto h-3 w-3 text-violet-500/60" />
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No more bookings today.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelectBooking(b)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/6 bg-black/20 px-3 py-2 text-left hover:border-violet-400/25 hover:bg-violet-500/10"
                >
                  <div className="shrink-0 text-center">
                    <p className="text-[10px] font-bold uppercase text-violet-400">Start</p>
                    <p className="text-xs font-bold tabular-nums text-white">
                      {formatCalendarTime(b.start_time)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-white/8 pl-3">
                    <p className="truncate text-sm font-medium text-white">{b.customer.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">{b.station?.name}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};
